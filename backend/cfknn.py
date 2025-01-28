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
    """Get recommendations for a user"""
    try:
        print(f"Recommending reels for user {user_id}, offset: {offset}, limit: {num_recommendations}")
        
        # Check if user exists in matrix
        if user_id not in user_reel_matrix.index:
            print(f"User {user_id} not found in matrix, returning popular items")
            # For new users, return popular items based on average ratings
            popular_reels = user_reel_matrix.mean().sort_values(ascending=False)
            
            # Apply pagination
            start_idx = offset
            end_idx = min(offset + num_recommendations, len(popular_reels))
            paginated_reels = popular_reels[start_idx:end_idx]
            
            has_more = end_idx < len(popular_reels)
            recommendations = [
                {"reel_id": str(reel_id), "predicted_score": float(score)} 
                for reel_id, score in paginated_reels.items()
            ]
            return recommendations, has_more

        user_index = user_reel_matrix.index.get_loc(user_id)
        
        # Get similar users
        distances, indices = model_knn.kneighbors(
            user_reel_matrix.iloc[user_index, :].values.reshape(1, -1),
            n_neighbors=20  # Increased for more recommendations
        )
        
        # Calculate scores for all reels
        reel_scores = {}
        for i in indices[0]:
            if i == user_index:
                continue
            for reel_id in user_reel_matrix.columns:
                if user_reel_matrix.iloc[user_index][reel_id] == 0:  # Only recommend unwatched videos
                    score = user_reel_matrix.iloc[i][reel_id]
                    if score > 0:  # Only consider positive ratings
                        reel_scores[reel_id] = reel_scores.get(reel_id, 0) + score

        # If no recommendations from similar users, fall back to popular items
        if not reel_scores:
            print(f"No personalized recommendations for user {user_id}, falling back to popular items")
            popular_reels = user_reel_matrix.mean().sort_values(ascending=False)
            
            # Filter out already watched videos
            user_watched = user_reel_matrix.loc[user_id]
            popular_reels = popular_reels[user_watched == 0]
            
            # Apply pagination
            start_idx = offset
            end_idx = min(offset + num_recommendations, len(popular_reels))
            paginated_reels = popular_reels[start_idx:end_idx]
            
            has_more = end_idx < len(popular_reels)
            recommendations = [
                {"reel_id": str(reel_id), "predicted_score": float(score)} 
                for reel_id, score in paginated_reels.items()
            ]
            return recommendations, has_more

        # Sort recommendations by score
        recommended_reels = sorted(reel_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Apply pagination
        start_idx = offset
        end_idx = min(offset + num_recommendations, len(recommended_reels))
        paginated_reels = recommended_reels[start_idx:end_idx]
        
        has_more = end_idx < len(recommended_reels)
        print(f"Found {len(recommended_reels)} total recommendations, returning {len(paginated_reels)} items, has_more: {has_more}")
        
        return [
            {"reel_id": str(reel_id), "predicted_score": float(score)} 
            for reel_id, score in paginated_reels
        ], has_more
        
    except Exception as e:
        print(f"Error in recommend_reels: {str(e)}")
        # Return popular items as fallback
        try:
            popular_reels = user_reel_matrix.mean().sort_values(ascending=False)
            start_idx = offset
            end_idx = min(offset + num_recommendations, len(popular_reels))
            paginated_reels = popular_reels[start_idx:end_idx]
            
            has_more = end_idx < len(popular_reels)
            recommendations = [
                {"reel_id": str(reel_id), "predicted_score": float(score)} 
                for reel_id, score in paginated_reels.items()
            ]
            return recommendations, has_more
        except Exception as inner_e:
            print(f"Error in fallback recommendation: {str(inner_e)}")
            return [], False

def run_main(table, user_id=10, num_recommendations=3, offset=0, model_path='knn_model.pkl'):
    ratings = load_data(table)
    if ratings is None:
        return []
    user_reel_matrix = ratings.pivot_table(index='user_id', columns='reel_id', values='rating', fill_value=0)

    model_knn, user_reel_matrix_loaded = get_cached_model(model_path)
    if model_knn is None:
        print("Model not found, building new model...")
        model_knn, user_reel_matrix_loaded = build_and_save_model(user_reel_matrix, model_path)

    recommendations, has_more = recommend_reels(
        user_id, 
        model_knn, 
        user_reel_matrix_loaded, 
        num_recommendations,
        offset
    )
    return recommendations, has_more

#run_main(table)