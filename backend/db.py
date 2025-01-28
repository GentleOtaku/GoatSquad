import pandas as pd
from sqlalchemy import create_engine 
from sqlalchemy.sql import text
import os
import random
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from root directory
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

def get_database_url():
    """Initialize database connection"""
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    db_name = os.getenv("DB_NAME")
    db_host = os.getenv("DB_HOST", "34.71.48.54")
    db_port = os.getenv("DB_PORT", "5432")
    
    if not all([db_user, db_pass, db_name]):
        raise ValueError("Database credentials not properly configured. Please check your .env file.")
    
    return f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

def load_data(table):
    print("7. load_data called, directory:", os.getcwd())
    engine = create_engine(get_database_url())
    query = f"SELECT * FROM {table}"
    print("table: " + table)
    try:
        with engine.connect() as connection:
            ratings = pd.read_sql_query(query, connection.connection)
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None
    print(ratings)
    return ratings

def add(user_id, reel_id, rating, table):
    engine = create_engine(get_database_url())
    data = pd.DataFrame({
        'user_id': [user_id],
        'reel_id': [reel_id],
        'rating': [rating]
    })
    try: 
        with engine.connect() as connection: 
            data.to_sql(table, connection, if_exists='append', index=False)
            print("Success with injecting data " + str(user_id) + " " + str(reel_id) + " " + str(rating) + " into " + str(table))
    except Exception as e:
        print(f"failure adding: {e}")

def remove(user_id, reel_id, table):
    engine = create_engine(get_database_url())
    query = text(f"""
        DELETE FROM {table}
        WHERE user_id = :user_id AND reel_id = :reel_id;
    """)
    try:
        with engine.connect() as connection:
            connection.execute(query, {"user_id": user_id, "reel_id": reel_id})
            print("Success")
    except Exception as e:
        print(f"Failure removing: {e}")

def get_video_url(reel_id):
    engine = create_engine(get_database_url())
    query = text("""
        SELECT url, title, blurb FROM mlb_highlights 
        WHERE id = :reel_id
    """)
    try:
        with engine.connect() as connection:
            result = connection.execute(query, {"reel_id": reel_id}).fetchone()
            if result:
                return {
                    'video_url': result[0],
                    'title': result[1],
                    'blurb': result[2]
                }
            
            # If specific video not found, get any available video
            fallback_query = text("""
                SELECT url, title, blurb FROM mlb_highlights 
                LIMIT 1
            """)
            fallback_result = connection.execute(fallback_query).fetchone()
            if fallback_result:
                print("Using fallback video")
                return {
                    'video_url': fallback_result[0],
                    'title': fallback_result[1],
                    'blurb': fallback_result[2]
                }
            
            print("No videos found in database")
            return None
    except Exception as e:
        print(f"Error fetching video URL: {e}")
        return None
    
def get_follow_vid(table, followed_players, followed_teams):
    engine = create_engine(get_database_url())
    try:
        query = text(f"""
            SELECT url FROM {table} 
            WHERE player = ANY(:players) OR home_team = ANY(:teams) OR away_team = ANY(:teams)
        """)
        with engine.connect() as connection:
            results = connection.execute(query, {"players": followed_players, "teams": followed_teams}).fetchall()
            if results:
                return random.choice(results)[0]
            print("No matching videos found")
            return None
    except Exception as e:
        print(f"Error fetching random video: {e}")
        return None

if __name__ == "__main__":
    followed_players = ['Shohei Ohtani', 'Mike Trout']
    followed_teams = ['Tampa Bay Rays', 'Houston Astros']
    print(get_follow_vid('mlb_highlights', followed_players, followed_teams))



