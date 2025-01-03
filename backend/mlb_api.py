import requests
import json

BASE_URL = 'https://statsapi.mlb.com/api/v1'

def get_teams():
    """Fetch all MLB teams"""
    try:
        response = requests.get(f'{BASE_URL}/teams?sportId=1')
        data = response.json()
        
        # Transform the data into our desired format
        teams = [{
            'id': team['id'],
            'name': team['teamName'],
            'city': team['locationName'],
            'division': team['division']['name'],
            'league': team['league']['name'],
            'abbreviation': team['abbreviation'],
            'logo': team.get('logoUrl', ''),  # Some teams might not have logos
        } for team in data['teams']]
        
        return teams
    except Exception as e:
        print(f"Error fetching teams: {str(e)}")
        return []

def get_team_roster(team_id):
    """Fetch roster for a specific team"""
    try:
        response = requests.get(f'{BASE_URL}/teams/{team_id}/roster?season=2024')
        data = response.json()
        
        # Get detailed info for each player
        players = []
        for player in data['roster']:
            player_id = player['person']['id']
            player_info = get_player_info(player_id)
            if player_info:
                players.append(player_info)
        
        return players
    except Exception as e:
        print(f"Error fetching team roster: {str(e)}")
        return []

def get_player_info(player_id):
    """Fetch detailed information for a specific player"""
    try:
        response = requests.get(f'{BASE_URL}/people/{player_id}')
        data = response.json()
        player = data['people'][0]
        
        return {
            'id': player['id'],
            'name': f"{player['firstName']} {player['lastName']}",
            'team': player.get('currentTeam', {}).get('name', ''),
            'position': player.get('primaryPosition', {}).get('abbreviation', ''),
            'number': player.get('primaryNumber', ''),
            'birthDate': player.get('birthDate', ''),
            'height': player.get('height', ''),
            'weight': player.get('weight', ''),
            'batSide': player.get('batSide', {}).get('code', ''),
            'throwSide': player.get('pitchHand', {}).get('code', '')
        }
    except Exception as e:
        print(f"Error fetching player info: {str(e)}")
        return None 