from flask import Flask, request, jsonify, Response
from flask_restx import Api, Resource
from flask_cors import CORS
from news_digest import get_news_digest
import logging
import requests
from datetime import datetime
import os
from google.cloud import translate_v2 as translate
from auth import AuthService, token_required, db, init_admin
import grpc
from routes.mlb import mlb
from flask_migrate import Migrate
from google.cloud.sql.connector import Connector
import sqlalchemy
from werkzeug.middleware.proxy_fix import ProxyFix
from cfknn import load_model, recommend_reels, build_and_save_model, run_main
from db import load_data, add, remove

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print("1. App.py starting directory:", os.getcwd())

ORIGINAL_DIR = os.path.dirname(os.path.abspath(__file__))

def init_connection_pool():
    """Initialize database connection"""
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    db_name = os.getenv("DB_NAME")
    
    # Connect through Cloud SQL Proxy
    DATABASE_URL = f"postgresql://{db_user}:{db_pass}@34.71.48.54:5432/{db_name}"
    return DATABASE_URL

app = Flask(__name__)

# Add the before_request handler AFTER app creation
@app.before_request
def before_request():
    os.chdir(ORIGINAL_DIR)

print("2. Before Flask app creation:", os.getcwd())

# Configure database connection
app.config['SQLALCHEMY_DATABASE_URI'] = init_connection_pool()

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
print("11. Before Flask app creation:", os.getcwd())
current_dir = os.getcwd()
print("11. Before Flask app creation:", os.getcwd())
print(current_dir)
migrate = Migrate(app, db)

# Create tables and initialize admin user
with app.app_context():
    try:
        # Create tables only if they don't exist
        db.create_all()
        # Initialize admin user
        init_admin()
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
        db.session.rollback()

# Update CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Range", "X-Content-Range"],
        "supports_credentials": True
    }
})

api = Api(app, version='1.0', 
    title='MLB Fan Feed API',
    description='API for MLB fan feed features')



news_ns = api.namespace('news', description='News operations')

@news_ns.route('/digest')
class NewsDigest(Resource):
    @news_ns.doc('get_news_digest')
    @news_ns.param('teams[]', 'Team names array')
    @news_ns.param('players[]', 'Player names array')
    def get(self):
        """Get news digest for multiple teams and players"""
        try:
            # Get arrays from request args
            teams = request.args.getlist('teams[]')
            players = request.args.getlist('players[]')
            
            logger.info(f"Received request with teams: {teams}, players: {players}")
            
            if not teams and not players:
                return {'error': 'At least one team or player must be specified'}, 400
            
            # Filter out empty strings
            teams = [t for t in teams if t]
            players = [p for p in players if p]
                
            result = get_news_digest(teams=teams, players=players)
            
            if result['success']:
                return jsonify(result)
            else:
                return {'error': result.get('error', 'Unknown error occurred')}, 500
                
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            return {'error': 'Internal server error'}, 500

@app.route('/api/mlb/highlights')
def get_highlights():
    """Proxy endpoint for MLB highlights"""
    try:
        team_id = request.args.get('team_id')
        player_id = request.args.get('player_id')
        
        logger.info(f"Fetching highlights for team {team_id} and player {player_id}")

        # First get schedule to find recent games
        schedule_url = 'https://statsapi.mlb.com/api/v1/schedule'
        schedule_params = {
            'teamId': team_id,
            'season': 2024,
            'sportId': 1,
            'gameType': 'R'
        }

        schedule_response = requests.get(schedule_url, params=schedule_params)
        schedule_response.raise_for_status()
        schedule_data = schedule_response.json()

        all_highlights = []
        
        # Process each date's games
        for date in schedule_data.get('dates', [])[:10]:  # Look at last 10 days to find more highlights
            for game in date.get('games', []):
                game_pk = game.get('gamePk')
                
                # Get game content
                content_url = f'https://statsapi.mlb.com/api/v1/game/{game_pk}/content'
                content_response = requests.get(content_url)
                content_response.raise_for_status()
                content_data = content_response.json()

                # Look for highlights in game content
                for highlight in content_data.get('highlights', {}).get('highlights', {}).get('items', []):
                    # Check if highlight involves the player
                    if any(keyword.get('type') == 'player_id' and 
                          keyword.get('value') == str(player_id) 
                          for keyword in highlight.get('keywordsAll', [])):
                        
                        # Get the best quality playback URL
                        playbacks = highlight.get('playbacks', [])
                        if playbacks:
                            best_playback = max(playbacks, key=lambda x: int(x.get('height', 0) or 0))
                            all_highlights.append({
                                'title': highlight.get('title', ''),
                                'description': highlight.get('description', ''),
                                'url': best_playback.get('url'),
                                'date': date.get('date'),
                                'blurb': highlight.get('blurb', ''),
                                'timestamp': highlight.get('date', date.get('date'))  # Use highlight date if available
                            })

        # Sort highlights by date (newest first) and take the 5 most recent
        sorted_highlights = sorted(
            all_highlights,
            key=lambda x: datetime.strptime(x['date'], '%Y-%m-%d') if x['date'] else datetime.min,
            reverse=True
        )[:5]

        logger.info(f"Found {len(sorted_highlights)} recent highlights")
        return jsonify({'highlights': sorted_highlights})

    except requests.exceptions.RequestException as e:
        logger.error(f"Error making request to MLB API: {str(e)}")
        return {'error': 'Failed to fetch highlights from MLB'}, 500
    except Exception as e:
        logger.error(f"Error fetching highlights: {str(e)}", exc_info=True)
        return {'error': 'Failed to fetch highlights'}, 500

@app.route('/recommend/add', methods=['POST'])
def add_rating():
    try:
        # Scrape data from query arguments instead of JSON payload
        user_id = request.args.get('user_id')
        reel_id = request.args.get('reel_id')
        rating = request.args.get('rating')
        table = request.args.get('table', default='user_ratings_db')

        if not all([user_id, reel_id, rating]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        rating = float(rating)
        add(user_id, reel_id, rating, table)
        return jsonify({'success': True, 'message': 'Rating added successfully'}), 200
    except Exception as e:
        logger.error(f"Error adding rating: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/recommend/remove', methods=['DELETE'])
def remove_rating():
    """Remove a user reel rating"""
    try:
        user_id = request.args.get('user_id')
        reel_id = request.args.get('reel_id')
        table = request.args.get('table', default='user_ratings_db')

        if not all([user_id, reel_id]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        remove(user_id, reel_id, table)
        return jsonify({'success': True, 'message': 'Rating removed successfully'}), 200
    except Exception as e:
        logger.error(f"Error removing rating: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/recommend/predict', methods=['GET'])
def predict_recommendations():
    """Get reel recommendations for a user"""
    try:
        id = int(request.args.get('user_id', default=0))  
        num_recs = int(request.args.get('num_recommendations', default=5))  
        table = request.args.get('table', default='user_ratings_db')  

        # Run the model
        recommendations = run_main(
            table=table,
            user_id=id,
            num_recommendations=num_recs,
            model_path='knn_model_sql.pkl'
        )

        return jsonify({'success': True, 'recommendations': recommendations}), 200
    except Exception as e:
        logger.error(f"Error predicting recommendations: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

# Initialize the translation client
translate_client = translate.Client()

@app.route('/api/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        text = data.get('text')
        target_language = data.get('target_language', 'en')

        if not text:
            return jsonify({
                'success': False,
                'message': 'No text provided for translation'
            }), 400

        # Perform translation
        result = translate_client.translate(
            text,
            target_language=target_language
        )

        return jsonify({
            'success': True,
            'translatedText': result['translatedText'],
            'sourceLanguage': result['detectedSourceLanguage']
        })

    except Exception as e:
        logger.error(f"Translation error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Translation failed',
            'error': str(e)
        }), 500

@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Unhandled error: {str(error)}", exc_info=True)
    message = str(error)
    status_code = 500
    if hasattr(error, 'code'):
        status_code = error.code
    return jsonify({'success': False, 'message': message}), status_code

auth_ns = api.namespace('auth', description='Authentication operations')

@auth_ns.route('/register')
class Register(Resource):
    def post(self):
        """Register a new user"""
        try:
            data = request.get_json()
            logger.info(f"Register attempt for email: {data.get('email')}")
            return AuthService.register_user(data)
        except Exception as e:
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            return {'success': False, 'message': str(e)}, 500

@auth_ns.route('/login')
class Login(Resource):
    def post(self):
        """Login user"""
        try:
            data = request.get_json()
            logger.info(f"Login attempt for email: {data.get('email')}")
            return AuthService.login_user(data.get('email'), data.get('password'))
        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            return {'success': False, 'message': str(e)}, 500

@auth_ns.route('/profile')
class UserProfile(Resource):
    @token_required
    def get(self, current_user):
        """Get user profile"""
        try:
            if not current_user:
                return {'success': False, 'message': 'User not found'}, 404

            logger.info(f"Profile fetch for user ID: {current_user.client_id}")
            return {'success': True, 'user': current_user.to_dict()}, 200

        except Exception as e:
            logger.error(f"Profile fetch error: {str(e)}", exc_info=True)
            return {'success': False, 'message': str(e)}, 500

    @token_required
    def put(self, current_user):
        """Update user profile"""
        try:
            if not current_user:
                return {'success': False, 'message': 'User not found'}, 404

            data = request.get_json()
            logger.info(f"Profile update for user ID: {current_user.client_id}")
            return AuthService.update_user_profile(current_user.client_id, data)
        except Exception as e:
            logger.error(f"Profile update error: {str(e)}", exc_info=True)
            return {'success': False, 'message': str(e)}, 500

@app.route('/test')
def test():
    """Test endpoint to verify server is running"""
    return jsonify({
        'success': True,
        'message': 'Backend server is running',
        'timestamp': datetime.utcnow().isoformat()
    })

# Register blueprints
app.register_blueprint(mlb)

@app.route('/api/mlb/schedule', methods=['GET'])
def get_mlb_schedule():
    team_id = request.args.get('teamId')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    try:
        response = requests.get(
            'https://statsapi.mlb.com/api/v1/schedule',
            params={
                'teamId': team_id,
                'startDate': start_date,
                'endDate': end_date,
                'sportId': 1,
                'hydrate': 'team,venue'
            }
        )
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preferences', methods=['GET', 'PUT'])
@token_required
def handle_preferences(current_user):
    if request.method == 'GET':
        return jsonify({
            'success': True,
            'preferences': {
                'teams': current_user.followed_teams or [],
                'players': current_user.followed_players or []
            }
        })
    
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            current_user.followed_teams = data.get('teams', [])
            current_user.followed_players = data.get('players', [])
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Preferences updated successfully',
                'preferences': {
                    'teams': current_user.followed_teams,
                    'players': current_user.followed_players
                }
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500

@app.route('/api/mlb/teams', methods=['GET'])
def get_mlb_teams():
    try:
        logger.info("Attempting to fetch MLB teams...")
        response = requests.get(
            'https://statsapi.mlb.com/api/v1/teams',
            params={'sportId': 1},
            timeout=15,
            headers={
                'Accept': 'application/json',
                'User-Agent': 'MLBFanFeed/1.0'
            }
        )
        logger.info(f"MLB API Response Status: {response.status_code}")
        
        # Add caching headers
        response_data = response.json()
        resp = jsonify({
            'teams': response_data.get('teams', []),
            'copyright': response_data.get('copyright', '')
        })
        resp.cache_control.max_age = 3600  # Cache for 1 hour
        return resp
        
    except requests.exceptions.Timeout:
        logger.error("Timeout while fetching MLB teams")
        # Return cached data if available
        return jsonify({
            'success': False,
            'message': 'Request to MLB API timed out. Please try again.',
            'error': 'TIMEOUT'
        }), 504
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching MLB teams: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to fetch teams from MLB API: {str(e)}'
        }), 500
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'An unexpected error occurred: {str(e)}'
        }), 500

@app.errorhandler(requests.exceptions.RequestException)
def handle_request_error(error):
    logger.error(f"Request error: {str(error)}")
    return jsonify({
        'success': False,
        'message': 'External API request failed',
        'error': str(error)
    }), 500

@app.errorhandler(Exception)
def handle_general_error(error):
    logger.error(f"Unexpected error: {str(error)}")
    return jsonify({
        'success': False,
        'message': 'An unexpected error occurred',
        'error': str(error)
    }), 500

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({
        'success': True,
        'message': 'Backend is working',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/perform-action', methods=['POST'])
def perform_action():
    try:
        # Call the recommendation system with default values
        user_id = 10  # Default user_id
        num_recommendations = 5  # Default number of recommendations
        table = 'user_ratings_db'  # Default table
        
        # Run the model
        recommendations = run_main(table, user_id=user_id, num_recommendations=num_recommendations, model_path='knn_model_sql.pkl')
        
        return jsonify({
            'success': True,
            'message': 'Recommendations generated successfully!',
            'data': {
                'timestamp': datetime.utcnow().isoformat(),
                'recommendations': recommendations,
                'user_id': user_id,
                'num_recommendations': num_recommendations
            }
        })
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(
        host='0.0.0.0', 
        port=int(os.getenv('BACKEND_PORT', 5000)),
        debug=True,
        use_reloader=False
    )