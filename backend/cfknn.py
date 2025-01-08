import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors
import joblib
import os

def load_data():
    column_names = ['user_id', 'item_id', 'rating', 'timestamp']
    ratings = pd.read_csv('ml-100k/u.data', sep='\t', names=column_names)
    movie_titles = pd.read_csv('ml-100k/u.item', sep='|', encoding='latin-1', usecols=[0, 1], names=['item_id', 'title'])
    return ratings, movie_titles

def build_and_save_model(user_movie_matrix, model_path='knn_model.pkl'):
    user_movie_matrix_sparse = csr_matrix(user_movie_matrix)
    model_knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=10, n_jobs=-1)
    model_knn.fit(user_movie_matrix_sparse)
    joblib.dump((model_knn, user_movie_matrix), model_path)
    print(f"Model trained and saved to {model_path}")

    return model_knn, user_movie_matrix

def load_model(model_path='knn_model.pkl'):
    if os.path.exists(model_path):
        print(f"Loading model from {model_path}...")
        model_knn, user_movie_matrix = joblib.load(model_path)
        return model_knn, user_movie_matrix
    else:
        print(f"Model not found at {model_path}. Please train the model first.")
        return None, None

def recommend_movies(user_id, model_knn, user_movie_matrix, movie_titles, num_recommendations=5):
    distances, indices = model_knn.kneighbors(user_movie_matrix.iloc[user_id-1, :].values.reshape(1, -1), n_neighbors=10)
    similar_users = indices.flatten()
    movie_scores = {}
    for i in similar_users:
        for movie in user_movie_matrix.columns:
            if user_movie_matrix.iloc[user_id-1, movie-1] == 0:
                movie_scores[movie] = movie_scores.get(movie, 0) + user_movie_matrix.iloc[i, movie-1]

    recommended_movies = sorted(movie_scores.items(), key=lambda x: x[1], reverse=True)[:num_recommendations]
    print(f"Top {num_recommendations} movie recommendations for User {user_id}:")
    for movie_id, score in recommended_movies:
        movie_name = movie_titles[movie_titles['item_id'] == movie_id]['title'].values[0]
        print(f"Movie: {movie_name} (Movie ID: {movie_id}, Predicted Score: {score})")

def main():
    ratings, movie_titles = load_data()
    user_movie_matrix = ratings.pivot(index='user_id', columns='item_id', values='rating').fillna(0)
    model_path = 'knn_model.pkl'
    model_knn, user_movie_matrix_loaded = load_model(model_path)
    if model_knn is None:
        model_knn, user_movie_matrix_loaded = build_and_save_model(user_movie_matrix, model_path)

    user_id = 10  
    num_recommendations = 5
    recommend_movies(user_id, model_knn, user_movie_matrix_loaded, movie_titles, num_recommendations)

if __name__ == "__main__":
    main()

