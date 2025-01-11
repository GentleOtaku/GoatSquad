from flask import Blueprint, jsonify
import requests
import logging

logger = logging.getLogger(__name__)
mlb = Blueprint('mlb', __name__)

@mlb.route('/api/mlb/teams')
def get_teams():
    try:
        logger.info("Fetching MLB teams...")
        response = requests.get('https://statsapi.mlb.com/api/v1/teams?sportId=1')
        response.raise_for_status()
        data = response.json()
        logger.info(f"Successfully fetched {len(data.get('teams', []))} teams")
        return jsonify(data)
    except requests.RequestException as e:
        logger.error(f"Error fetching teams: {str(e)}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Error fetching teams: {str(e)}")
        return jsonify({'error': str(e)}), 500

@mlb.route('/api/mlb/roster/<int:team_id>')
def get_roster(team_id):
    try:
        logger.info(f"Fetching roster for team {team_id}...")
        response = requests.get(
            f'https://statsapi.mlb.com/api/v1/teams/{team_id}/roster?season=2024'
        )
        response.raise_for_status()
        data = response.json()
        logger.info(f"Successfully fetched roster with {len(data.get('roster', []))} players")
        return jsonify(data)
    except requests.RequestException as e:
        logger.error(f"Error fetching roster: {str(e)}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Error fetching roster: {str(e)}")
        return jsonify({'error': str(e)}), 500 