import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors

def load_data():
    column_names = ['user_id', 'item_id', 'rating', 'timestamp']
    ratings = pd.read_csv('ml-100k/u.data', sep='\t', names=column_names)
    movie_titles = pd.read_csv('ml-100k/u.item', sep='|', encoding='latin-1', usecols=[0, 1], names=['item_id', 'title'])
    return ratings, movie_titles

def build_model(user_movie_matrix):
    user_movie_matrix_sparse = csr_matrix(user_movie_matrix)
    model_knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=10, n_jobs=-1)
    model_knn.fit(user_movie_matrix_sparse)
    return model_knn

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
    
    model_knn = build_model(user_movie_matrix)
    
   
    user_id = 10 
    num_recommendations = 5
    recommend_movies(user_id, model_knn, user_movie_matrix, movie_titles, num_recommendations)

if __name__ == "__main__":
    main()
