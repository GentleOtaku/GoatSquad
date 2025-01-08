from flask import Flask, request, jsonify, Response
from flask_restx import Api, Resource
from flask_cors import CORS
from news_digest import get_news_digest
import logging
import requests
from datetime import datetime
import os
from google.cloud import translate
from auth import AuthService, token_required
import grpc
from routes.mlb import mlb

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Update CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
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

# Instead, create a function to get the client when needed
def get_translate_client():
    try:
        return translate.TranslationServiceClient()
    except Exception as e:
        logger.error(f"Failed to initialize translation client: {str(e)}")
        return None

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """Translate text to target language using Google Cloud Translation API"""
    try:
        logger.info("Received translation request")
        data = request.get_json()
        logger.info(f"Request data: {data}")
        
        text = data.get('text')
        target_language = data.get('target_language')

        if not text or not target_language:
            logger.error("Missing text or target language")
            return jsonify({'error': 'Missing text or target language'}), 400

        # Get translation client only when needed
        translate_client = get_translate_client()
        if not translate_client:
            logger.warning("Translation service unavailable, returning original text")
            return jsonify({
                'success': True,
                'translatedText': text,
                'detectedSourceLanguage': 'en'
            })

        project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
        if not project_id:
            logger.warning("GOOGLE_CLOUD_PROJECT not set, returning original text")
            return jsonify({
                'success': True,
                'translatedText': text,
                'detectedSourceLanguage': 'en'
            })

        location = "global"
        parent = f"projects/{project_id}/locations/{location}"

        try:
            response = translate_client.translate_text(
                request={
                    "parent": parent,
                    "contents": [text],
                    "mime_type": "text/plain",
                    "target_language_code": target_language,
                }
            )
            translation = response.translations[0]
            result = {
                'success': True,
                'translatedText': translation.translated_text,
                'detectedSourceLanguage': translation.detected_language_code
            }
            return jsonify(result)

        except grpc.RpcError as e:
            logger.error(f"gRPC error in translation: {str(e)}")
            return jsonify({
                'success': True,
                'translatedText': text,
                'detectedSourceLanguage': 'en'
            })
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            return jsonify({
                'success': True,
                'translatedText': text,
                'detectedSourceLanguage': 'en'
            })

    except Exception as e:
        logger.error(f"Translation endpoint error: {str(e)}")
        return jsonify({
            'success': True,
            'translatedText': text,
            'detectedSourceLanguage': 'en'
        })

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
                
            logger.info(f"Profile fetch for user ID: {current_user.get('id')}")
            # Create response without password hash
            user_response = {k: v for k, v in current_user.items() if k != 'password_hash'}
            return {'success': True, 'user': user_response}, 200
            
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
            logger.info(f"Profile update for user ID: {current_user.get('id')}")
            return AuthService.update_user_profile(current_user['id'], data)
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('BACKEND_PORT', 5000)), debug=True)