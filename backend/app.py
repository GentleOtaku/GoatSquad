from flask import Flask, request, jsonify
from flask_restx import Api, Resource
from flask_cors import CORS
from news_digest import get_news_digest
import logging

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
    @news_ns.param('team', 'Team name')
    @news_ns.param('player', 'Player name')
    def get(self):
        """Get news digest for team and player"""
        try:
            team = request.args.get('team')
            player = request.args.get('player')
            
            logger.info(f"Received request for team: {team}, player: {player}")
            
            if not team or not player:
                logger.error("Missing team or player parameter")
                return {'error': 'Team and player parameters are required'}, 400
                
            result = get_news_digest(team, player)
            logger.info(f"News digest result: {result}")
            
            if result['success']:
                return jsonify(result)
            else:
                logger.error(f"Error in news digest: {result.get('error')}")
                return {'error': result.get('error', 'Unknown error occurred')}, 500
                
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            return {'error': 'Internal server error'}, 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')