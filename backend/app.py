from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from flask_cors import CORS
from news_digest import get_news_digest

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
        team = request.args.get('team')
        player = request.args.get('player')
        
        if not team or not player:
            return {'error': 'Team and player parameters are required'}, 400
            
        result = get_news_digest(team, player)
        
        if result['success']:
            return result
        else:
            return {'error': result['error']}, 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')