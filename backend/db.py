import pandas as pd
from sqlalchemy import create_engine 
from sqlalchemy.sql import text
import os

DATABASE_URL = "postgresql+psycopg2://postgres:vibhas69@34.71.48.54:5432/user_ratings_db"

print("6. DB.py imported, directory:", os.getcwd())

def load_data(table):
    print("7. load_data called, directory:", os.getcwd())
    engine = create_engine(DATABASE_URL)
    query = f"SELECT * FROM {table}"  
    try:
        with engine.connect() as connection:
            ratings = pd.read_sql_query(query, connection)
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None
    print(ratings)
    return ratings

def add(user_id, reel_id, rating, table):
    engine = create_engine(DATABASE_URL)
    data = pd.DataFrame({
        'user_id': [user_id],
        'reel_id': [reel_id],
        'rating': [rating]
    })
    try: 
        with engine.connect() as connection: 
            data.to_sql(table, connection, if_exists='append', index=False)
            print("Success with injecting data")
    except Exception as e:
        print(f"faliure adding: {e}")

def remove(user_id, reel_id, table):
    engine = create_engine(DATABASE_URL)
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
    engine = create_engine(DATABASE_URL)
    # First try to get the specific video
    query = text("""
        SELECT url FROM mlb_highlights 
        WHERE id = :reel_id
    """)
    try:
        with engine.connect() as connection:
            result = connection.execute(query, {"reel_id": reel_id}).fetchone()
            if result:
                return result[0]
            
            # If specific video not found, get any available video
            fallback_query = text("""
                SELECT url FROM mlb_highlights 
                LIMIT 1
            """)
            fallback_result = connection.execute(fallback_query).fetchone()
            if fallback_result:
                print("Using fallback video")
                return fallback_result[0]
            
            print("No videos found in database")
            return None
    except Exception as e:
        print(f"Error fetching video URL: {e}")
        return None

if __name__ == "__main__":
    # test connecitons 
    load_data()

