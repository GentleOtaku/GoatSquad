from flask import Flask, request, jsonify, Response
from flask_restx import Api, Resource
from flask_cors import CORS
from news_digest import get_news_digest
import logging
import requests
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

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

@app.errorhandler(Exception)
def handle_error(error):
    message = str(error)
    status_code = 500
    if hasattr(error, 'code'):
        status_code = error.code
    return jsonify({'success': False, 'error': message}), status_code

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)