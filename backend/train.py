import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors
import joblib
import os

def load_data():
    column_names = ['user_id', 'highlight_id', 'rating']
    ratings = pd.read_csv('mlb.csv', names=column_names, skiprows=1)
    return ratings

def build_and_save_model(user_play_matrix, model_path='knn_model.pkl'):
    user_play_matrix = user_play_matrix.astype(float)
    user_play_matrix_sparse = csr_matrix(user_play_matrix.values)  
    model_knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=10, n_jobs=-1)
    model_knn.fit(user_play_matrix_sparse)
    joblib.dump((model_knn, user_play_matrix), model_path)
    print(f"Model trained and saved to {model_path}")
    return model_knn, user_play_matrix

def load_model(model_path='knn_model.pkl'):
    if os.path.exists(model_path):
        print(f"Loading model from {model_path}...")
        model_knn, user_play_matrix = joblib.load(model_path)
        return model_knn, user_play_matrix
    else:
        print(f"Model not found at {model_path}. Please train the model first.")
        return None, None

def recommend_plays(user_id, model_knn, user_play_matrix, num_recommendations=5):
    user_index = user_id - 1  
    distances, indices = model_knn.kneighbors(user_play_matrix.iloc[user_index, :].values.reshape(1, -1), n_neighbors=10)
    similar_users = indices.flatten()
    play_scores = {}

    for i in similar_users:
        for play_id in user_play_matrix.columns:
            if user_play_matrix.iloc[user_index][play_id] == 0:  
                play_scores[play_id] = play_scores.get(play_id, 0) + user_play_matrix.iloc[i][play_id]

    recommended_plays = sorted(play_scores.items(), key=lambda x: x[1], reverse=True)[:num_recommendations]
    print(f"Top {num_recommendations} play recommendations for User {user_id}:")
    for play_id, score in recommended_plays:
        print(f"Play ID: {play_id}, Predicted Score: {score}")

def main():
    ratings = load_data()
    user_play_matrix = ratings.pivot_table(index='user_id', columns='highlight_id', values='rating', fill_value=0)
    
    model_path = 'knn_model.pkl'
    model_knn, user_play_matrix_loaded = load_model(model_path)
    if model_knn is None:
        model_knn, user_play_matrix_loaded = build_and_save_model(user_play_matrix, model_path)

    user_id = 10  
    num_recommendations = 5
    recommend_plays(user_id, model_knn, user_play_matrix_loaded, num_recommendations)

if __name__ == "__main__":
    main()