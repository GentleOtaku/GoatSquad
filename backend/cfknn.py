import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors
import joblib
import os
from sqlalchemy import create_engine

def load_data():
    DATABASE_URL = "postgresql+psycopg2://postgres:vibhas69@34.71.48.54:5432/user_ratings_db"
    engine = create_engine(DATABASE_URL)
    
    query = "SELECT * FROM user_reel_ratings"  
    
    try:
        with engine.connect() as connection:
            ratings = pd.read_sql_query(query, connection)
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

    return ratings


def build_and_save_model(user_reel_matrix, model_path='knn_model.pkl'):
    user_reel_matrix = user_reel_matrix.astype(float)
    user_reel_matrix_sparse = csr_matrix(user_reel_matrix.values)  
    model_knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=10, n_jobs=-1)
    model_knn.fit(user_reel_matrix_sparse)
    joblib.dump((model_knn, user_reel_matrix), model_path)
    print(f"Model trained and saved to {model_path}")
    return model_knn, user_reel_matrix

def load_model(model_path='knn_model.pkl'):
    if os.path.exists(model_path):
        print(f"Loading model from {model_path}...")
        model_knn, user_reel_matrix = joblib.load(model_path)
        return model_knn, user_reel_matrix
    else:
        print(f"Model not found at {model_path}. Please train the model first.")
        return None, None

def recommend_reels(user_id, model_knn, user_reel_matrix, num_recommendations=5):
    user_index = user_id - 1  
    distances, indices = model_knn.kneighbors(user_reel_matrix.iloc[user_index, :].values.reshape(1, -1), n_neighbors=10)
    similar_users = indices.flatten()
    reel_scores = {}

    for i in similar_users:
        for reel_id in user_reel_matrix.columns:
            if user_reel_matrix.iloc[user_index][reel_id] == 0:  
                reel_scores[reel_id] = reel_scores.get(reel_id, 0) + user_reel_matrix.iloc[i][reel_id]

    recommended_reels = sorted(reel_scores.items(), key=lambda x: x[1], reverse=True)[:num_recommendations]
    print(f"Top {num_recommendations} reel recommendations for User {user_id}:")
    for reel_id, score in recommended_reels:
        print(f"Reel ID: {reel_id}, Predicted Score: {score}")

def main():
    ratings = load_data()
    if ratings is None:
        return
    user_reel_matrix = ratings.pivot_table(index='user_id', columns='reel_id', values='rating', fill_value=0)
    
    model_path = 'knn_model_sql.pkl'
    model_knn, user_reel_matrix_loaded = load_model(model_path)
    if model_knn is None:
        model_knn, user_reel_matrix_loaded = build_and_save_model(user_reel_matrix, model_path)

    user_id = 10  
    num_recommendations = 3
    recommend_reels(user_id, model_knn, user_reel_matrix_loaded, num_recommendations)

if __name__ == "__main__":
    main()
