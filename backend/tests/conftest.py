import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app import app, db

@pytest.fixture(autouse=True)
def setup_environment():
    os.environ['SQLALCHEMY_SILENCE_UBER_WARNING'] = '1'
    yield
    del os.environ['SQLALCHEMY_SILENCE_UBER_WARNING']

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all() 