import pandas as pd
from sqlalchemy import create_engine 
from sqlalchemy.sql import text
from gemini import generate_embeddings
import os
import random
from auth import AuthService, token_required, db, init_admin
import numpy as np
import random

RANDOM_TEAMS = ['New York Yankees', 'Los Angeles Dodgers', 'Chicago Cubs', 'Boston Red Sox', 'Houston Astros']
RANDOM_PLAYERS = ['Aaron Judge', 'Mookie Betts', 'Shohei Ohtani', 'Mike Trout', 'Freddie Freeman']
DATABASE_URL = "postgresql+psycopg2://postgres:vibhas69@34.71.48.54:5432/user_ratings_db"

def load_data(table):
    print("7. load_data called, directory:", os.getcwd())
    engine = create_engine(DATABASE_URL)
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
    engine = create_engine(DATABASE_URL)
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
    engine = create_engine(DATABASE_URL)
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

def rag_recommend_pgvector(table, query_text, start=0):
    engine = create_engine(DATABASE_URL)
    query_embedding = generate_embeddings(query_text)

    if not query_embedding:
        print("Failed to generate query embedding.")
        return []

    query_embedding = np.array(query_embedding).tolist()  

    query = text(f"""
        SELECT id, embedding <-> CAST(:embedding AS vector) AS distance
        FROM {table}
        ORDER BY distance ASC
        LIMIT 5 OFFSET :start
    """)

    try:
        with engine.connect() as connection:
            results = connection.execute(
                query, 
                {
                    "embedding": f"[{', '.join(map(str, query_embedding))}]",
                    "start": start  
                }
            ).fetchall()

            recommendations = [{"id": row[0], "distance": row[1]} for row in results]
            return recommendations

    except Exception as e:
        print(f"Error performing RAG with pgvector: {e}")
        return []
    
def search_feature(table, search, start):
    return rag_recommend_pgvector(table, search, start)

if __name__ == "__main__":
    followed_players = ['Shohei Ohtani', 'Mike Trout']
    followed_teams = ['Tampa Bay Rays', 'Houston Astros']
    #print(get_follow_vid('mlb_highlights', followed_players, followed_teams))
    search_feature("embeddings", "Player: Shohei", 1)

    


