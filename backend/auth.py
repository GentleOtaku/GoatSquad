from flask import jsonify, request
import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
import os
from werkzeug.security import generate_password_hash, check_password_hash
import logging
from flask_sqlalchemy import SQLAlchemy

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    firstName = db.Column(db.String(80), nullable=False)
    lastName = db.Column(db.String(80), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    timezone = db.Column(db.String(50), default='UTC')
    avatarUrl = db.Column(db.String(200), default='/images/default-avatar.jpg')
    createdAt = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updatedAt = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), 
                         onupdate=lambda: datetime.now(timezone.utc))
    followed_teams = db.Column(db.JSON, default=list)
    followed_players = db.Column(db.JSON, default=list)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'firstName': self.firstName,
            'lastName': self.lastName,
            'username': self.username,
            'timezone': self.timezone,
            'avatarUrl': self.avatarUrl,
            'createdAt': self.createdAt.isoformat(),
            'updatedAt': self.updatedAt.isoformat(),
            'preferences': {
                'teams': self.followed_teams or [],
                'players': self.followed_players or []
            }
        }

# Get secret key from environment variable or use a default for development
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')

def token_required(f):
    """Decorator to protect routes that require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                logger.error("Invalid Authorization header format")
                return jsonify({'success': False, 'message': 'Invalid token format'}), 401

        if not token:
            logger.error("No token provided")
            return jsonify({'success': False, 'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            
            if current_user is None:
                logger.error(f"User not found for token user_id: {data.get('user_id')}")
                return jsonify({'success': False, 'message': 'User not found'}), 401

            return f(current_user=current_user, *args, **kwargs)
            
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
            
            if not data:
                logger.error("No data provided for registration")
                return {'success': False, 'message': 'No registration data provided'}, 400

            required_fields = ['email', 'password', 'firstName', 'lastName', 'username']
            missing_fields = [field for field in required_fields if not data.get(field)]
            
            if missing_fields:
                logger.error(f"Missing required fields: {missing_fields}")
                return {
                    'success': False, 
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, 400

            # Check if email already exists
            if User.query.filter_by(email=data['email']).first():
                logger.warning(f"Email already registered: {data['email']}")
                return {'success': False, 'message': 'Email already registered'}, 409

            # Check if username already exists
            if User.query.filter_by(username=data['username']).first():
                logger.warning(f"Username already taken: {data['username']}")
                return {'success': False, 'message': 'Username already taken'}, 409

            new_user = User(
                email=data['email'],
                password_hash=generate_password_hash(data['password']),
                firstName=data['firstName'],
                lastName=data['lastName'],
                username=data['username'],
                timezone=data.get('timezone', 'UTC'),
                avatarUrl=data.get('avatarUrl', '/images/default-avatar.jpg')
            )

            db.session.add(new_user)
            db.session.commit()

            logger.info(f"User registered successfully: {new_user.email}")

            token = jwt.encode({
                'user_id': new_user.id,
                'exp': datetime.now(timezone.utc) + timedelta(days=1)
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
                'message': 'An error occurred during registration. Please try again.'
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

            if not check_password_hash(user.password_hash, password):
                logger.warning(f"Invalid password for user: {email}")
                return {'success': False, 'message': 'Invalid email or password'}, 401

            token = jwt.encode({
                'user_id': user.id,
                'exp': datetime.now(timezone.utc) + timedelta(days=1)
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