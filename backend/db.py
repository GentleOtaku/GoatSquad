import pandas as pd
from sqlalchemy import create_engine 
from sqlalchemy.sql import text

DATABASE_URL = "postgresql+psycopg2://postgres:vibhas69@34.71.48.54:5432/user_ratings_db"

def load_data():
    engine = create_engine(DATABASE_URL)
    query = "SELECT * FROM user_reel_ratings"  
    try:
        with engine.connect() as connection:
            ratings = pd.read_sql_query(query, connection)
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None
    print(ratings)
    return ratings

def add(user_id, reel_id, rating):
    engine = create_engine(DATABASE_URL)
    data = pd.DataFrame({
        'user_id': [user_id],
        'reel_id': [reel_id],
        'rating': [rating]
    })
    try: 
        with engine.connect() as connection: 
            data.to_sql('user_reel_ratings', connection, if_exists='append', index=False)
            print("Success with injecting data")
    except Exception as e:
        print(f"faliure adding: {e}")

def remove(user_id, reel_id):
    engine = create_engine(DATABASE_URL)
    query = text("""
        DELETE FROM user_reel_ratings
        WHERE user_id = :user_id AND reel_id = :reel_id;
    """)
    try:
        with engine.connect() as connection:
            connection.execute(query, {"user_id": user_id, "reel_id": reel_id})
            print("Success")
    except Exception as e:
        print(f"Failure removing: {e}")

if __name__ == "__main__":
    # test connecitons 
    load_data()

