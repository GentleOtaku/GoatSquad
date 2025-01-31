from flask import Flask, request, jsonify, Response, redirect, send_from_directory
from flask_restx import Api, Resource
from flask_cors import CORS
from news_digest import get_news_digest
import logging
import requests
from datetime import datetime, timedelta
import os
from google.cloud import translate_v2 as translate
from auth import AuthService, token_required, db, init_admin, SavedVideo, CustomMusic
import grpc
from routes.mlb import mlb
from flask_migrate import Migrate
from google.cloud.sql.connector import Connector
import sqlalchemy
from werkzeug.middleware.proxy_fix import ProxyFix
from cfknn import recommend_reels, build_and_save_model, run_main
from db import load_data, add, remove, get_video_url, get_follow_vid, search_feature
from sqlalchemy import create_engine
from sqlalchemy.sql import text
from gemini import run_gemini_prompt
from highlight import generate_videos
import re
import random
from google.cloud import storage
from werkzeug.utils import secure_filename

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ORIGINAL_DIR = os.path.dirname(os.path.abspath(__file__))

# Create Flask app first
app = Flask(__name__)

# Then set up configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/audio')
ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'm4a', 'aac'}

# Create all required directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'previews'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'custom'), exist_ok=True)

# Default preview tracks configuration
DEFAULT_PREVIEWS = {
    'rock_anthem_preview.mp3': 'Rock Anthem',
    'hiphop_vibes_preview.mp3': 'Hip-Hop Vibes',
    'cinematic_preview.mp3': 'Cinematic Theme',
    'funky_preview.mp3': 'Funky Groove'
}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_audio_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS

def init_connection_pool():
    """Initialize database connection"""
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    db_name = os.getenv("DB_NAME")
    
    DATABASE_URL = f"postgresql://{db_user}:{db_pass}@34.71.48.54:5432/{db_name}"
    return DATABASE_URL

@app.before_request
def before_request():
    os.chdir(ORIGINAL_DIR)

print("2. Before Flask app creation:", os.getcwd())

# Configure database connection
app.config['SQLALCHEMY_DATABASE_URI'] = init_connection_pool()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
print("11. Before Flask app creation:", os.getcwd())
current_dir = os.getcwd()
print("11. Before Flask app creation:", os.getcwd())
print(current_dir)
migrate = Migrate(app, db)

with app.app_context():
    try:
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
        for date in schedule_data.get('dates', [])[:10]:  
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

@app.route('/recommend/add', methods=['POST', 'GET'])
def add_rating():
    """Add or update a user's rating for a reel"""
    try:
        user_id = request.args.get('user_id')
        reel_id = request.args.get('reel_id')
        rating = request.args.get('rating')
        table = request.args.get('table', default='user_ratings_db')

        if not all([user_id, reel_id, rating]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        try:
            rating = float(rating)
            if not (0 <= rating <= 5):
                return jsonify({'success': False, 'message': 'Rating must be between 0 and 5'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid rating value'}), 400

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

@app.route('/recommend/search', methods=['GET'])
def get_search_recommendations():
    try:
        search = request.args.get('search', '').strip().lower()

        if search: 
            data = search_feature("embeddings", search, 5)
            ids = [item['id'] for item in data]
            return jsonify({
                'success': True,
                'recommendations': ids,
                'has_more': False  
            })
    except Exception as e:
        logger.error(f"Error getting model recommendations: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

RANDOM_TEAMS = ['New York Yankees', 'Los Angeles Dodgers', 'Chicago Cubs', 'Boston Red Sox', 'Houston Astros']
RANDOM_PLAYERS = ['Aaron Judge', 'Mookie Betts', 'Shohei Ohtani', 'Mike Trout', 'Freddie Freeman']

@app.route('/recommend/vector', methods=['GET'])
@token_required
def get_vector_recommendations(current_user):
    try:
        followed_teams = [team.get('name', '') for team in (current_user.followed_teams or [])]
        followed_players = [player.get('fullName', '') for player in (current_user.followed_players or [])]
        if not followed_teams:
            followed_teams = random.sample(RANDOM_TEAMS, min(3, len(RANDOM_TEAMS)))  
        if not followed_players:
            followed_players = random.sample(RANDOM_PLAYERS, min(3, len(RANDOM_PLAYERS)))  

        query = f"Teams: {', '.join(followed_teams)}. Players: {', '.join(followed_players)}."

        if query: 
            data = search_feature("embeddings", query, 5)
            ids = [item['id'] for item in data]
            return jsonify({
                'success': True,
                'recommendations': ids,
                'has_more': False  
            })
    except Exception as e:
        logger.error(f"Error getting model recommendations: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/recommend/predict', methods=['GET'])
def get_model_recommendations():
    try:
        user_id = int(request.args.get('user_id'))
        page = int(request.args.get('page', default=1))
        per_page = int(request.args.get('per_page', default=5))
        table = request.args.get('table', default='user_ratings_db')
        search = request.args.get('search', '').strip().lower()

        offset = (page - 1) * per_page
        recs, has_more = run_main(table, user_id=user_id, num_recommendations=per_page, offset=offset)

        if search:
            reel_ids = [r["reel_id"] for r in recs]
            if not reel_ids:
                return jsonify({'success': True, 'recommendations': [], 'has_more': False})

            reel_ids_str = ", ".join(str(rid) for rid in reel_ids)

            engine = create_engine(init_connection_pool())
            with engine.connect() as conn:
                highlights_query = text(f"""
                    SELECT id, title
                    FROM mlb_highlights
                    WHERE id IN ({reel_ids_str})
                      AND (LOWER(title) LIKE :search OR LOWER(blurb) LIKE :search)
                """)
                highlight_results = conn.execute(highlights_query, {"search": f"%{search}%"}).fetchall()
                valid_ids = set(row[0] for row in highlight_results)
            filtered_recs = [r for r in recs if r["reel_id"] in valid_ids]
          
            return jsonify({
                'success': True,
                'recommendations': filtered_recs,
                'has_more': False  # or your own logic
            })

        if recs:
            return jsonify({
                'success': True,
                'recommendations': recs,
                'has_more': has_more
            })
        
        return jsonify({'success': True, 'recommendations': [], 'has_more': False})

    except Exception as e:
        logger.error(f"Error getting model recommendations: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/recommend/follow', methods=['GET'])
@token_required
def get_follow_recommendations(current_user):
    """
    Get recommendations based on followed teams and players,
    optionally filtering with ?search=someTerm
    """
    try:
        table = request.args.get('table', default='mlb_highlights')
        page = int(request.args.get('page', default=1))
        per_page = int(request.args.get('per_page', default=5))
        search = request.args.get('search', '').strip().lower()

        # Must have a user
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Extract team names and player names from the JSON objects
        followed_teams = [team.get('name', '') for team in (current_user.followed_teams or [])]
        followed_players = [player.get('fullName', '') for player in (current_user.followed_players or [])]

        if not followed_teams and not followed_players:
            return jsonify({'success': False, 'message': 'No teams or players followed'}), 400

        offset = (page - 1) * per_page

        # Build a dynamic WHERE clause to optionally filter by search
        # Adjust columns to suit your actual DB schema (title, blurb, player, etc.)
        # Example: Searching in 'player', 'title', or 'blurb' columns
        base_query = f"""
            SELECT id as reel_id 
            FROM {table}
            WHERE (
                player = ANY(:players) 
                OR home_team = ANY(:teams) 
                OR away_team = ANY(:teams)
            )
        """
        # If we have a search term, add a filter
        if search:
            # Searching in "player", "title", or "blurb" columns
            base_query += " AND (LOWER(player) LIKE :search OR LOWER(title) LIKE :search OR LOWER(blurb) LIKE :search)"

        # Final ordering & pagination
        base_query += """
            ORDER BY RANDOM()
            OFFSET :offset
            LIMIT :limit
        """

        # Build the param dict
        param_dict = {
            "players": followed_players,
            "teams": followed_teams,
            "offset": offset,
            "limit": per_page + 1,  # get one extra to see if there's more
        }
        if search:
            param_dict["search"] = f"%{search}%"

        # Execute
        engine = create_engine(init_connection_pool())
        with engine.connect() as connection:
            results = connection.execute(text(base_query), param_dict).fetchall()

            if results:
                # Check if we got more than per_page
                has_more = len(results) > per_page
                # Slice off the extra
                recommendations = [{"reel_id": row[0]} for row in results[:per_page]]
                return jsonify({
                    'success': True,
                    'recommendations': recommendations,
                    'has_more': has_more
                })
            return jsonify({'success': True, 'recommendations': [], 'has_more': False})

    except Exception as e:
        logger.error(f"Error fetching follow recommendations: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/generate-blurb', methods=['POST'])
def generate_blurb():
    data = request.json
    title = data.get('title')

    if not title:
        logger.error("Title is required in the request.")
        return jsonify({"success": False, "message": "Title is required"}), 400

    title = re.sub(r"\s*\([^)]*\)$", "", title)

    try:
        prompt = f"Generate a short and engaging description for the baseball video titled: {title}. Keep your response to under 20 words. Your response should start with the content and just one sentence. Do not include filler like OK, here is a short and engaging description."
        description = run_gemini_prompt(prompt)
        
        if description is not None and ':' in description:
            description = description.split(':', 1)[1].strip()
        
        if description:
            return jsonify({
                "success": True,
                "description": description
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to generate description"
            }), 500

    except Exception as e:
        logger.error(f"Error in generating description: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500

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
        recommendations = run_main(table, user_id=user_id, num_recommendations=num_recommendations, model_path='knn_model.pkl')
        
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

@app.route('/api/mlb/video', methods=['GET'])
def get_video_url_endpoint():
    """Get video URL and metadata from database using play ID"""
    try:
        play_id = request.args.get('play_id')
        if not play_id:
            return jsonify({'success': False, 'message': 'Play ID is required'}), 400

        video_data = get_video_url(play_id)
        if not video_data:
            return jsonify({'success': False, 'message': 'Video not found'}), 404

        return jsonify({
            'success': True,
            'video_url': video_data['video_url'],
            'title': video_data['title'],
            'blurb': video_data['blurb']
        })

    except Exception as e:
        logger.error(f"Error fetching video URL: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/showcase/compile', methods=['POST'])
@token_required
def compile_showcase(current_user):
    try:
        # Get request data
        data = request.get_json() or {}
        video_urls = data.get('videoUrls', [])
        audio_track = data.get('audioTrack')
        
        logger.info(f"Compiling showcase with audio track: {audio_track}")
        
        if not video_urls:
            return jsonify({
                'success': False,
                'message': 'No videos provided for compilation'
            }), 400

        # Initialize GCS client
        storage_client = storage.Client()
        bucket = storage_client.bucket('goatbucket1')

        # Get the GCS audio file path
        audio_url = None
        if audio_track:
            if audio_track.startswith('custom_'):
                try:
                    track_id = int(audio_track.split('_')[1])
                    track = CustomMusic.query.get(track_id)
                    if track and track.user_id == current_user.client_id:
                        # Try different possible filename formats
                        possible_filenames = [
                            track.filename,
                            f"{current_user.client_id}_{track.filename}",
                            f"1_{current_user.client_id}_{track.filename}",
                            f"1_{track.filename}"
                        ]
                        
                        # Try different possible paths for each filename
                        found_blob = None
                        for filename in possible_filenames:
                            logger.info(f"Checking filename: {filename}")
                            possible_paths = [
                                f"highlightMusic/custom/{filename}",
                                f"custom/{filename}",
                                filename
                            ]
                            
                            for path in possible_paths:
                                logger.info(f"Checking GCS path: {path}")
                                blob = bucket.blob(path)
                                if blob.exists():
                                    logger.info(f"Found audio file in GCS at: {path}")
                                    found_blob = blob
                                    break
                            
                            if found_blob:
                                break
                        
                        if found_blob:
                            audio_url = f"gs://goatbucket1/{found_blob.name}"
                            logger.info(f"Using audio track from GCS: {audio_url}")
                        else:
                            logger.error(f"Custom audio file not found in GCS for any variation of {track.filename}")
                            return jsonify({'success': False, 'message': 'Custom audio file not found'}), 404
                except Exception as e:
                    logger.error(f"Error processing custom track: {str(e)}")
                    return jsonify({'success': False, 'message': str(e)}), 500
            else:
                # Map track IDs to GCS paths
                audio_map = {
                    'hiphop_vibes': 'highlightMusic/hiphop_vibes.mp3',
                    'rock_anthem': 'highlightMusic/rock_anthem.mp3',
                    'cinematic_theme': 'highlightMusic/cinematic_theme.mp3',
                    'funky_groove': 'highlightMusic/funky_groove.mp3'
                }
                if audio_track in audio_map:
                    gcs_path = audio_map[audio_track]
                    blob = bucket.blob(gcs_path)
                    if blob.exists():
                        audio_url = f"gs://goatbucket1/{gcs_path}"
                        logger.info(f"Using GCS audio track: {audio_url}")
                    else:
                        logger.error(f"Default audio track not found in GCS: {gcs_path}")
                        return jsonify({'success': False, 'message': 'Selected audio track not found'}), 404

        # Call generate_videos with the URLs, user ID, and audio
        output_uri = generate_videos(video_urls, current_user.client_id, audio_url)
        
        return jsonify({
            'success': True,
            'output_uri': output_uri
        })
        
    except Exception as e:
        logger.error(f"Error compiling showcase: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/videos/saved', methods=['GET', 'POST', 'DELETE'])
@token_required
def handle_saved_videos(current_user):
    if request.method == 'GET':
        try:
            saved_videos = SavedVideo.query.filter_by(user_id=current_user.client_id).all()
            
            # Initialize GCS client
            storage_client = storage.Client()
            bucket = storage_client.bucket('goatbucket1')
            
            videos_with_signed_urls = []
            for video in saved_videos:
                try:
                    # Extract blob path from video URL
                    video_url = video.video_url
                    blob_path = None
                    
                    if video_url.startswith('gs://'):
                        # Handle gs:// URLs
                        parts = video_url.replace('gs://', '').split('/', 1)
                        if len(parts) == 2:
                            blob_path = parts[1]
                    elif 'storage.googleapis.com' in video_url:
                        # Handle storage.googleapis.com URLs
                        parts = video_url.split('goatbucket1/')
                        if len(parts) == 2:
                            blob_path = parts[1]
                    elif video_url.startswith('completeHighlights/'):
                        # Handle direct blob paths
                        blob_path = video_url
                    else:
                        # For MLB video URLs, use them directly
                        videos_with_signed_urls.append({
                            'id': video.id,
                            'videoUrl': video_url,
                            'title': video.title,
                            'createdAt': video.created_at.isoformat() if video.created_at else None
                        })
                        continue
                    
                    if blob_path:
                        # Generate signed URL for GCS objects
                        blob = bucket.blob(blob_path)
                        if blob.exists():
                            signed_url = blob.generate_signed_url(
                                version="v4",
                                expiration=timedelta(hours=1),
                                method="GET"
                            )
                            videos_with_signed_urls.append({
                                'id': video.id,
                                'videoUrl': signed_url,
                                'title': video.title,
                                'createdAt': video.created_at.isoformat() if video.created_at else None
                            })
                        else:
                            logger.warning(f"Video file not found in GCS: {blob_path}")
                            # Still include the video with original URL if blob doesn't exist
                            videos_with_signed_urls.append({
                                'id': video.id,
                                'videoUrl': video_url,
                                'title': video.title,
                                'createdAt': video.created_at.isoformat() if video.created_at else None
                            })
                    
                except Exception as e:
                    logger.error(f"Error processing video {video.id}: {str(e)}")
                    # Include the video with original URL if processing fails
                    videos_with_signed_urls.append({
                        'id': video.id,
                        'videoUrl': video.video_url,
                        'title': video.title,
                        'createdAt': video.created_at.isoformat() if video.created_at else None
                    })
            
            return jsonify({
                'success': True,
                'videos': videos_with_signed_urls
            })
        except Exception as e:
            logger.error(f"Error fetching saved videos: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'message': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.get_json()
            video_url = data.get('videoUrl')
            title = data.get('title')

            if not video_url:
                return jsonify({'success': False, 'message': 'Video URL is required'}), 400

            # Check if video is already saved
            existing_video = SavedVideo.query.filter_by(
                user_id=current_user.client_id,
                video_url=video_url
            ).first()

            if existing_video:
                return jsonify({'success': False, 'message': 'Video already saved'}), 409

            new_video = SavedVideo(
                user_id=current_user.client_id,
                video_url=video_url,
                title=title
            )
            db.session.add(new_video)
            db.session.commit()

            return jsonify({
                'success': True,
                'video': {
                    'id': new_video.id,
                    'videoUrl': new_video.video_url,
                    'title': new_video.title,
                    'createdAt': new_video.created_at.isoformat() if new_video.created_at else None
                }
            })
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving video: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'message': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            video_id = request.args.get('id')
            if not video_id:
                return jsonify({'success': False, 'message': 'Video ID is required'}), 400

            video = SavedVideo.query.filter_by(
                id=video_id,
                user_id=current_user.client_id
            ).first()

            if not video:
                return jsonify({'success': False, 'message': 'Video not found'}), 404

            db.session.delete(video)
            db.session.commit()

            return jsonify({'success': True, 'message': 'Video removed from saved list'})
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting saved video: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/audio/previews/<filename>')
def serve_audio_preview(filename):
    """Serve audio preview files from GCS"""
    try:
        # Initialize GCS client
        storage_client = storage.Client()
        bucket = storage_client.bucket('goatbucket1')
        blob = bucket.blob(f"highlightMusic/previews/{filename}")
        
        if not blob.exists():
            logger.warning(f"Preview file not found in GCS: {filename}")
            return jsonify({
                'success': False,
                'message': 'Audio preview file not found.'
            }), 404
        
        # Generate a signed URL that's valid for 1 hour
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=1),
            method="GET"
        )
        
        # Redirect to the signed URL
        return redirect(signed_url)
        
    except Exception as e:
        logger.error(f"Error serving audio preview: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to load audio preview'}), 500

@app.route('/api/custom-music', methods=['POST'])
@token_required
def upload_custom_music(current_user):
    """Upload custom background music"""
    try:
        if 'music' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
            
        file = request.files['music']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
            
        if not allowed_audio_file(file.filename):
            return jsonify({'success': False, 'message': 'Invalid file type. Allowed types: mp3, wav, m4a, aac'}), 400

        # Secure the filename and add user ID to make it unique
        filename = f"{current_user.client_id}_{secure_filename(file.filename)}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'custom', filename)
        
        # Create custom directory if it doesn't exist
        os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'custom'), exist_ok=True)
        
        # Save the file
        file.save(filepath)
        
        # Save to database
        new_track = CustomMusic(
            user_id=current_user.client_id,
            filename=filename,
            original_filename=file.filename
        )
        db.session.add(new_track)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'track': {
                'id': new_track.id,
                'filename': filename,
                'originalName': file.filename
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error uploading custom music: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/custom-music', methods=['GET'])
@token_required
def get_custom_music(current_user):
    """Get user's custom music tracks"""
    try:
        tracks = CustomMusic.query.filter_by(user_id=current_user.client_id).all()
        return jsonify({
            'success': True,
            'tracks': [{
                'id': track.id,
                'filename': track.filename,
                'originalName': track.original_filename,
                'url': f"/audio/custom/{track.filename}"
            } for track in tracks]
        })
    except Exception as e:
        logger.error(f"Error fetching custom music: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/audio/custom/<filename>')
def serve_custom_audio(filename):
    """Serve custom audio files"""
    try:
        logger.info(f"Attempting to serve custom audio: {filename}")
        
        # Initialize GCS client
        storage_client = storage.Client()
        bucket = storage_client.bucket('goatbucket1')
        
        # Extract user ID from filename (assuming format: {user_id}_{filename})
        user_id = filename.split('_')[0]
        
        # Try different possible paths in GCS
        possible_paths = [
            f"highlightMusic/custom/{filename}",
            f"highlightMusic/custom/{user_id}_{filename}",  # Try with extra user ID prefix
            f"custom/{filename}",
            f"custom/{user_id}_{filename}",
            filename,
            f"{user_id}_{filename}"
        ]
        
        blob = None
        for path in possible_paths:
            logger.info(f"Checking GCS path: {path}")
            temp_blob = bucket.blob(path)
            if temp_blob.exists():
                logger.info(f"Found file in GCS at: {path}")
                blob = temp_blob
                break
        
        if not blob:
            # If not in GCS, check local file with both naming patterns
            local_paths = [
                os.path.join(app.config['UPLOAD_FOLDER'], 'custom', filename),
                os.path.join(app.config['UPLOAD_FOLDER'], 'custom', f"{user_id}_{filename}")
            ]
            
            for local_path in local_paths:
                logger.info(f"Checking local path: {local_path}")
                if os.path.exists(local_path):
                    logger.info(f"Found file locally, uploading to GCS")
                    # Upload to GCS if found locally
                    blob = bucket.blob(f"highlightMusic/custom/{filename}")
                    blob.upload_from_filename(local_path)
                    break
            
            if not blob:
                logger.error(f"File not found in GCS or locally: {filename}")
                return jsonify({'success': False, 'message': 'File not found'}), 404
        
        # Generate a signed URL valid for 1 hour
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=1),
            method="GET"
        )
        logger.info(f"Generated signed URL for {filename}")
        
        # Redirect to the signed URL
        return redirect(signed_url)
        
    except Exception as e:
        logger.error(f"Error serving custom audio: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to load audio file'}), 500

@app.route('/api/showcase/download/<user_id>', methods=['GET'])
@token_required
def download_showcase(current_user, user_id):
    """Download showcase video endpoint"""
    try:
        logger.info(f"Download requested for user_id: {user_id}, current_user: {current_user.client_id}")
        if str(current_user.client_id) != str(user_id):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
            
        # Initialize GCS client
        storage_client = storage.Client()
        bucket = storage_client.bucket("goatbucket1")
        
        # List blobs with prefix to find the latest video for this user
        prefix = f"completeHighlights/{user_id}"
        blobs = list(bucket.list_blobs(prefix=prefix))
        
        if not blobs:
            logger.error(f"No videos found for user {user_id}")
            return jsonify({'success': False, 'message': 'Video not found'}), 404
            
        # Get the most recent video (last in list)
        blob = blobs[-1]
        logger.info(f"Found video: {blob.name}")
            
        # Get the video content
        logger.info("Downloading video content...")
        video_content = blob.download_as_bytes()
        logger.info(f"Downloaded {len(video_content)} bytes")
        
        # Create response with proper headers
        response = Response(video_content)
        response.headers['Content-Type'] = 'video/mp4'
        response.headers['Content-Disposition'] = f'attachment; filename=highlight-reel-{user_id}.mp4'
        return response
        
    except Exception as e:
        logger.error(f"Error downloading showcase: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(
        host='0.0.0.0', 
        port=int(os.getenv('BACKEND_PORT', 5000)),
        debug=True,
        use_reloader=False
    )