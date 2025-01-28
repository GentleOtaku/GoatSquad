from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
from passlib.context import CryptContext
import logging
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, JSON
from database import Base, get_db
import random

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
ALGORITHM = "HS256"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class User(Base):
    __tablename__ = 'client_info'
    
    client_id = Column(Integer, primary_key=True)
    password = Column(String(256), nullable=False)
    followed_teams = Column(JSON, default=list)
    followed_players = Column(JSON, default=list)
    email = Column(String(120), unique=True, nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    username = Column(String(80), unique=True, nullable=False)
    timezone = Column(String(50), default='UTC')
    avatarurl = Column(String(200))

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
                'teams': self.followed_teams or [],
                'players': self.followed_players or []
            }
        }

    @staticmethod
    def generate_unique_id(db: Session):
        """Generate a unique client ID between 1 and 10_000"""
        while True:
            new_id = random.randint(1, 10_000)
            if not db.query(User).filter(User.client_id == new_id).first():
                return new_id

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except jwt.JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.client_id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

class AuthService:
    @staticmethod
    def register_user(data: dict, db: Session):
        """Register a new user"""
        try:
            logger.info("Starting user registration")
            
            # Check if email already exists
            if db.query(User).filter(User.email == data['email']).first():
                raise HTTPException(status_code=409, detail="Email already registered")

            # Check if username already exists
            if db.query(User).filter(User.username == data['username']).first():
                raise HTTPException(status_code=409, detail="Username already taken")

            new_user = User(
                client_id=User.generate_unique_id(db),
                email=data['email'],
                password=get_password_hash(data['password']),
                first_name=data['firstName'],
                last_name=data['lastName'],
                username=data['username'],
                timezone=data.get('timezone', 'UTC'),
                avatarurl=data.get('avatarUrl', '/images/default-avatar.jpg'),
                followed_teams=data.get('teams', []),
                followed_players=data.get('players', [])
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            token = jwt.encode({
                'user_id': new_user.client_id
            }, SECRET_KEY, algorithm=ALGORITHM)

            return {
                'success': True,
                'message': 'Registration successful',
                'user': new_user.to_dict(),
                'token': token
            }

        except HTTPException as e:
            raise e
        except Exception as e:
            db.rollback()
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="An error occurred during registration."
            )

    @staticmethod
    def login_user(email: str, password: str, db: Session):
        """Authenticate a user and return a JWT token"""
        try:
            logger.info(f"Login attempt for email: {email}")
            
            if not email or not password:
                raise HTTPException(
                    status_code=400,
                    detail="Email and password are required"
                )

            user = db.query(User).filter(User.email == email).first()
            
            if not user:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password"
                )

            if not verify_password(password, user.password):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password"
                )

            token = jwt.encode({
                'user_id': user.client_id
            }, SECRET_KEY, algorithm=ALGORITHM)

            logger.info(f"Login successful for user: {email}")

            return {
                'success': True,
                'message': 'Login successful',
                'token': token,
                'user': user.to_dict()
            }

        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="An error occurred during login. Please try again."
            )

    @staticmethod
    def update_user_profile(user_id: int, data: dict, db: Session):
        """Update user profile"""
        try:
            user = db.query(User).filter(User.client_id == user_id).first()
            
            if user is None:
                raise HTTPException(status_code=404, detail="User not found")

            # Don't allow email or password updates through this endpoint
            forbidden_updates = ['email', 'password', 'password_hash', 'id']
            update_data = {k: v for k, v in data.items() 
                          if k not in forbidden_updates}
            
            for key, value in update_data.items():
                setattr(user, key, value)
            
            db.commit()
            
            return {'success': True, 'user': user.to_dict()}

        except HTTPException as e:
            raise e
        except Exception as e:
            db.rollback()
            logger.error(f"Error in update_user_profile: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )

def init_admin(db: Session):
    """Initialize with a default admin user if no users exist"""
    try:
        if not db.query(User).first():
            admin_user = User(
                client_id=User.generate_unique_id(db),
                email='admin@example.com',
                password=get_password_hash('admin123'),
                first_name='Admin',
                last_name='User',
                username='admin'
            )
            db.add(admin_user)
            db.commit()
            logger.info("Initialized default admin user")
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating admin user: {str(e)}") 