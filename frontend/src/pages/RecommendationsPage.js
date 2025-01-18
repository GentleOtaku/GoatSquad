import React from 'react';

function RecommendationsPage() {
    const handleGetRecommendations = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/recommend/predict?user_id=10&num_recommendations=5&table=user_ratings_db', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            console.log('API Response:', data);
        } catch (error) {
            console.error('Failed:', error);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Recommendations</h1>
            <button
                onClick={handleGetRecommendations}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
                Get Recommendations
            </button>
        </div>
    );
}

export default RecommendationsPage; 