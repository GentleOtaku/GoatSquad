import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors
import joblib
import os
from sqlalchemy import create_engine
from db import load_data

# Global variables to cache the model and matrix
_cached_model = None
_cached_matrix = None

def build_and_save_model(user_reel_matrix, model_path='knn_model.pkl'):
    user_reel_matrix = user_reel_matrix.astype(float)
    user_reel_matrix_sparse = csr_matrix(user_reel_matrix.values)  
    model_knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=10, n_jobs=-1)
    model_knn.fit(user_reel_matrix_sparse)
    joblib.dump((model_knn, user_reel_matrix), model_path)
    print(f"Model trained and saved to {model_path}")
    return model_knn, user_reel_matrix

def get_cached_model(model_path='knn_model.pkl'):
    """Get model from cache or build it if not exists"""
    global _cached_model, _cached_matrix
    
    if _cached_model is not None and _cached_matrix is not None:
        print("Using cached model")
        return _cached_model, _cached_matrix
        
    # Try to load from file
    abs_model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), model_path)
    if os.path.exists(abs_model_path):
        print(f"Loading model from {abs_model_path}...")
        _cached_model, _cached_matrix = joblib.load(abs_model_path)
        return _cached_model, _cached_matrix
    else:
        print("Model not found, building new model...")
        # Load data and build model
        ratings = load_data('user_ratings_db')
        if ratings is None:
            return None, None
            
        user_reel_matrix = ratings.pivot_table(
            index='user_id', 
            columns='reel_id', 
            values='rating', 
            fill_value=0
        )
        _cached_model, _cached_matrix = build_and_save_model(user_reel_matrix, model_path)
        return _cached_model, _cached_matrix

def recommend_reels(user_id, model_knn, user_reel_matrix, num_recommendations=5, offset=0):
    user_index = user_id - 1
    distances, indices = model_knn.kneighbors(
        user_reel_matrix.iloc[user_index, :].values.reshape(1, -1), 
        n_neighbors=20  # Get more neighbors to support pagination
    )
    similar_users = indices.flatten()
    reel_scores = {}

    for i in similar_users:
        for reel_id in user_reel_matrix.columns:
            if user_reel_matrix.iloc[user_index][reel_id] == 0:
                reel_scores[reel_id] = reel_scores.get(reel_id, 0) + user_reel_matrix.iloc[i][reel_id]

    recommended_reels = sorted(reel_scores.items(), key=lambda x: x[1], reverse=True)
    # Apply pagination
    paginated_reels = recommended_reels[offset:offset + num_recommendations]
    
    return [{"reel_id": reel_id, "predicted_score": score} for reel_id, score in paginated_reels]

def run_main(table, user_id=10, num_recommendations=3, offset=0, model_path='knn_model.pkl'):
    ratings = load_data(table)
    if ratings is None:
        return []
    user_reel_matrix = ratings.pivot_table(index='user_id', columns='reel_id', values='rating', fill_value=0)

    model_knn, user_reel_matrix_loaded = get_cached_model(model_path)
    if model_knn is None:
        model_knn, user_reel_matrix_loaded = build_and_save_model(user_reel_matrix, model_path)

    recommendations = recommend_reels(
        user_id, 
        model_knn, 
        user_reel_matrix_loaded, 
        num_recommendations,
        offset
    )
    return recommendations

#run_main(table)