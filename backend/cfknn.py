import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors
import joblib
import os
from sqlalchemy import create_engine
from db import load_data

def build_and_save_model(user_reel_matrix, model_path='knn_model.pkl'):
    user_reel_matrix = user_reel_matrix.astype(float)
    user_reel_matrix_sparse = csr_matrix(user_reel_matrix.values)  
    model_knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=10, n_jobs=-1)
    model_knn.fit(user_reel_matrix_sparse)
    joblib.dump((model_knn, user_reel_matrix), model_path)
    print(f"Model trained and saved to {model_path}")
    return model_knn, user_reel_matrix

def load_model(model_path='knn_model.pkl'):
    # Convert relative path to absolute path
    abs_model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), model_path)
    if os.path.exists(abs_model_path):
        print(f"Loading model from {abs_model_path}...")
        model_knn, user_reel_matrix = joblib.load(abs_model_path)
        return model_knn, user_reel_matrix
    else:
        print(f"Model not found at {abs_model_path}. Please train the model first.")
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
    
    return [{"reel_id": reel_id, "predicted_score": score} for reel_id, score in recommended_reels]

def run_main(table, user_id=10, num_recommendations=3, model_path='knn_model.pkl'):
    ratings = load_data(table)
    if ratings is None:
        return
    user_reel_matrix = ratings.pivot_table(index='user_id', columns='reel_id', values='rating', fill_value=0)

    model_knn, user_reel_matrix_loaded = load_model(model_path)
    if model_knn is None:
        model_knn, user_reel_matrix_loaded = build_and_save_model(user_reel_matrix, model_path)

    recommendations = recommend_reels(user_id, model_knn, user_reel_matrix_loaded, num_recommendations)
    return recommendations

#run_main(table)