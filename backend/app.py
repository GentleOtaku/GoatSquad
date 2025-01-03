from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from flask_cors import CORS
from mlb_api import get_teams, get_team_roster, get_player_info

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

api = Api(app, version='1.0', 
    title='MLB Fan Feed API',
    description='API for MLB player and team information',
    doc='/swagger'
)

# Create namespaces
mlb_ns = api.namespace('mlb', description='MLB operations')

# Define models for swagger documentation
player_model = api.model('Player', {
    'id': fields.Integer(description='Player ID'),
    'name': fields.String(description='Player name'),
    'team': fields.String(description='Current team'),
    'position': fields.String(description='Player position'),
    'number': fields.String(description='Jersey number'),
    'birthDate': fields.String(description='Birth date'),
    'height': fields.String(description='Height'),
    'weight': fields.String(description='Weight'),
    'batSide': fields.String(description='Batting side'),
    'throwSide': fields.String(description='Throwing side')
})

team_model = api.model('Team', {
    'id': fields.Integer(description='Team ID'),
    'name': fields.String(description='Team name'),
    'city': fields.String(description='Team city'),
    'division': fields.String(description='Division'),
    'league': fields.String(description='League'),
    'abbreviation': fields.String(description='Team abbreviation'),
    'logo': fields.String(description='Team logo URL')
})

@mlb_ns.route('/teams')
class Teams(Resource):
    @mlb_ns.response(200, 'Success', [team_model])
    def get(self):
        """Get list of all MLB teams"""
        return get_teams()

@mlb_ns.route('/players/<int:team_id>')
class Players(Resource):
    @mlb_ns.response(200, 'Success', [player_model])
    def get(self, team_id):
        """Get players for a specific team"""
        return get_team_roster(team_id)

@mlb_ns.route('/player/<int:player_id>')
class Player(Resource):
    @mlb_ns.response(200, 'Success', player_model)
    def get(self, player_id):
        """Get detailed information for a specific player"""
        return get_player_info(player_id)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')