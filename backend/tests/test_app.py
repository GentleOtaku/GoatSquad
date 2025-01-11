import unittest
from unittest.mock import patch
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
import json

class TestApp(unittest.TestCase):
    def setUp(self):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
        self.app = app.test_client()
        with app.app_context():
            db.create_all()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_translate_text(self):
        test_data = {
            'text': 'Hello',
            'target_language': 'es'
        }
        
        response = self.app.post('/api/translate', 
                               json=test_data,
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])

    @patch('app.requests.get')
    def test_get_mlb_schedule(self, mock_get):
        mock_get.return_value.json.return_value = {
            'dates': [
                {
                    'games': [
                        {
                            'gamePk': 1,
                            'teams': {
                                'away': {'team': {'name': 'Yankees'}},
                                'home': {'team': {'name': 'Red Sox'}}
                            }
                        }
                    ]
                }
            ]
        }

        response = self.app.get('/api/mlb/schedule?teamId=147')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('dates', data)

    @patch('app.requests.get')
    def test_get_highlights(self, mock_get):
        # Mock schedule response
        mock_get.return_value.json.side_effect = [
            {
                'dates': [
                    {
                        'date': '2024-03-28',
                        'games': [{'gamePk': 1}]
                    }
                ]
            },
            {
                'highlights': {
                    'highlights': {
                        'items': [
                            {
                                'title': 'Test Highlight',
                                'description': 'Test Description',
                                'playbacks': [{'url': 'test.mp4', 'height': 720}]
                            }
                        ]
                    }
                }
            }
        ]

        response = self.app.get('/api/mlb/highlights?team_id=147')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('highlights', data) 