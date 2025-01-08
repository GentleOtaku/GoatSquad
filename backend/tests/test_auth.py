import unittest
from unittest.mock import patch
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
from auth import User, AuthService
import json

class TestAuth(unittest.TestCase):
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

    def test_register_user(self):
        with app.app_context():
            # Test valid registration
            data = {
                'email': 'test@example.com',
                'password': 'password123',
                'firstName': 'Test',
                'lastName': 'User',
                'username': 'testuser'
            }
            response, status = AuthService.register_user(data)
            self.assertEqual(status, 201)
            self.assertTrue(response['success'])
            self.assertIn('token', response)

            # Test duplicate email
            response, status = AuthService.register_user(data)
            self.assertEqual(status, 409)
            self.assertFalse(response['success'])

    def test_login_user(self):
        with app.app_context():
            # Register a user first
            data = {
                'email': 'test@example.com',
                'password': 'password123',
                'firstName': 'Test',
                'lastName': 'User',
                'username': 'testuser'
            }
            AuthService.register_user(data)

            # Test valid login
            response, status = AuthService.login_user('test@example.com', 'password123')
            self.assertEqual(status, 200)
            self.assertTrue(response['success'])
            self.assertIn('token', response)

            # Test invalid password
            response, status = AuthService.login_user('test@example.com', 'wrongpassword')
            self.assertEqual(status, 401)
            self.assertFalse(response['success'])

    def test_update_user_profile(self):
        with app.app_context():
            # Register a user first
            data = {
                'email': 'test@example.com',
                'password': 'password123',
                'firstName': 'Test',
                'lastName': 'User',
                'username': 'testuser'
            }
            register_response, _ = AuthService.register_user(data)
            user_id = register_response['user']['id']

            # Test valid profile update
            update_data = {
                'firstName': 'Updated',
                'lastName': 'Name'
            }
            response, status = AuthService.update_user_profile(user_id, update_data)
            self.assertEqual(status, 200)
            self.assertTrue(response['success'])
            self.assertEqual(response['user']['firstName'], 'Updated')
            self.assertEqual(response['user']['lastName'], 'Name')

if __name__ == '__main__':
    unittest.main() 