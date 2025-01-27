from flask import jsonify, request
import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
import os
from werkzeug.security import generate_password_hash, check_password_hash
import logging
from flask_sqlalchemy import SQLAlchemy
import random

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = SQLAlchemy()

# At the top after imports
print("10. Auth.py imported, directory:", os.getcwd())

class User(db.Model):
    __tablename__ = 'client_info'  # Your existing table name
    
    client_id = db.Column(db.Integer, primary_key=True)  # Simple primary key
    password = db.Column(db.String(256), nullable=False)
    followed_teams = db.Column(db.JSON, default=list)  # Changed from favorite_team
    followed_players = db.Column(db.JSON, default=list)  # Changed from favorite_player
    email = db.Column(db.String(120), unique=True, nullable=False)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    timezone = db.Column(db.String(50), default='UTC')
    avatarurl = db.Column(db.String(200))

    def to_dict(self):
        return {
            'id': self.client_id,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'username': self.username,
            'timezone': self.timezone,
            'avatarUrl': self.avatarurl,
            'preferences': {
                'teams': self.followed_teams or [],  # Changed from favorite_team
                'players': self.followed_players or []  # Changed from favorite_player
            }
        }

    @staticmethod
    def generate_unique_id():
        """Generate a unique client ID between 1 and 10_000"""
        while True:
            new_id = random.randint(1, 10_000)
            # Check if this ID already exists
            if not User.query.filter_by(client_id=new_id).first():
                return new_id

# Get secret key from environment variable or use a default for development
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')


def token_required(f):
    """Decorator to protect routes that require authentication"""

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', None)

        if not auth_header:
            logger.error("No Authorization header provided")
            return jsonify({'success': False, 'message': 'Token is missing'}), 401

        # Check that it starts with 'Bearer '
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            logger.error(f"Invalid Authorization header format: {auth_header}")
            return jsonify({'success': False, 'message': 'Invalid token format'}), 401

        token = parts[1]

        # Optional extra check: ensure token has at least 2 dots
        if token.count('.') != 2:
            logger.error("JWT token does not contain the required 3 segments")
            return jsonify({'success': False, 'message': 'Invalid token structure'}), 401

        # Now try decoding
        try:
            data = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=["HS256"],
                options={"verify_exp": False}
            )
            current_user = User.query.filter_by(client_id=data['user_id']).first()

            if current_user is None:
                logger.error(f"User not found for token user_id: {data.get('user_id')}")
                return jsonify({'success': False, 'message': 'User not found'}), 401

            return f(current_user=current_user, *args, **kwargs)

        except jwt.DecodeError:
            logger.error("Failed to decode JWT token", exc_info=True)
            return jsonify({'success': False, 'message': 'Token decode failed'}), 401
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'message': 'Token validation failed'}), 401

    return decorated


class AuthService:
    @staticmethod
    def register_user(data):
        """Register a new user"""
        try:
            logger.info("Starting user registration")
            
            # Check if email already exists
            if User.query.filter_by(email=data['email']).first():
                return {'success': False, 'message': 'Email already registered'}, 409

            # Check if username already exists
            if User.query.filter_by(username=data['username']).first():
                return {'success': False, 'message': 'Username already taken'}, 409

            new_user = User(
                client_id=User.generate_unique_id(),  # Generate unique ID
                email=data['email'],
                password=generate_password_hash(data['password']),
                first_name=data['firstName'],
                last_name=data['lastName'],
                username=data['username'],
                timezone=data.get('timezone', 'UTC'),
                avatarurl=data.get('avatarUrl', '/images/default-avatar.jpg'),
                followed_teams=data.get('teams', []),  # Changed from favorite_team
                followed_players=data.get('players', [])  # Changed from favorite_player
            )

            db.session.add(new_user)
            db.session.commit()

            token = jwt.encode({
                'user_id': new_user.client_id
            }, SECRET_KEY, algorithm="HS256")

            return {
                'success': True,
                'message': 'Registration successful',
                'user': new_user.to_dict(),
                'token': token
            }, 201

        except Exception as e:
            db.session.rollback()
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            return {
                'success': False,
                'message': 'An error occurred during registration.'
            }, 500

    @staticmethod
    def login_user(email, password):
        """Authenticate a user and return a JWT token"""
        try:
            logger.info(f"Login attempt for email: {email}")
            
            if not email or not password:
                logger.error("Missing email or password")
                return {'success': False, 'message': 'Email and password are required'}, 400

            user = User.query.filter_by(email=email).first()
            
            if not user:
                logger.warning(f"No user found with email: {email}")
                return {'success': False, 'message': 'Invalid email or password'}, 401

            if not check_password_hash(user.password, password):
                logger.warning(f"Invalid password for user: {email}")
                return {'success': False, 'message': 'Invalid email or password'}, 401

            # Token without expiration
            token = jwt.encode({
                'user_id': user.client_id
            }, SECRET_KEY, algorithm="HS256")

            logger.info(f"Login successful for user: {email}")

            return {
                'success': True,
                'message': 'Login successful',
                'token': token,
                'user': user.to_dict()
            }, 200

        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            return {
                'success': False, 
                'message': 'An error occurred during login. Please try again.'
            }, 500

    @staticmethod
    def update_user_profile(user_id, data):
        """Update user profile"""
        try:
            user = db.session.get(User, user_id)
            
            if user is None:
                return {'success': False, 'message': 'User not found'}, 404

            # Don't allow email or password updates through this endpoint
            forbidden_updates = ['email', 'password', 'password_hash', 'id']
            update_data = {k: v for k, v in data.items() 
                          if k not in forbidden_updates}
            
            for key, value in update_data.items():
                setattr(user, key, value)
            
            db.session.commit()
            
            return {'success': True, 'user': user.to_dict()}, 200

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error in update_user_profile: {str(e)}", exc_info=True)
            return {'success': False, 'message': str(e)}, 500

# Initialize with a default admin user if no users exist
def init_admin():
    try:
        if not User.query.first():
            admin_user = User(
                email='admin@example.com',
                password_hash=generate_password_hash('admin123'),
                firstName='Admin',
                lastName='User',
                username='admin'
            )
            db.session.add(admin_user)
            db.session.commit()
            logger.info("Initialized default admin user")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating admin user: {str(e)}") 