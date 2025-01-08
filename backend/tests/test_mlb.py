import unittest
from unittest.mock import patch
from app import app
import json

class TestMLB(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch('routes.mlb.requests.get')
    def test_get_teams(self, mock_get):
        # Mock the MLB API response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            'teams': [
                {'id': 1, 'name': 'New York Yankees'},
                {'id': 2, 'name': 'Boston Red Sox'}
            ]
        }

        response = self.app.get('/api/mlb/teams')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['teams']), 2)
        self.assertEqual(data['teams'][0]['name'], 'New York Yankees')

    @patch('routes.mlb.requests.get')
    def test_get_roster(self, mock_get):
        # Mock the MLB API response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            'roster': [
                {
                    'person': {'id': 1, 'fullName': 'John Doe'},
                    'position': {'abbreviation': 'P'}
                }
            ]
        }

        response = self.app.get('/api/mlb/roster/1')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['roster']), 1)
        self.assertEqual(data['roster'][0]['person']['fullName'], 'John Doe')

    @patch('routes.mlb.requests.get')
    def test_get_teams_error(self, mock_get):
        # Mock an API error
        mock_get.side_effect = Exception('API Error')

        response = self.app.get('/api/mlb/teams')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 500)
        self.assertIn('error', data)

if __name__ == '__main__':
    unittest.main() 