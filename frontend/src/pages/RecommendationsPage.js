import React, { useState } from 'react';

function RecommendationsPage() {
    const [videoUrl, setVideoUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getVideoUrl = async (playId) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(
                `http://localhost:5000/api/mlb/video?play_id=${playId}`,
                {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            return data.video_url;
        } finally {
            clearTimeout(timeoutId);
        }
    };

    const handleGetRecommendations = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(
                'http://localhost:5000/recommend/predict?user_id=10&num_recommendations=5&table=user_ratings_db',
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.success && data.recommendations && data.recommendations.length > 0) {
                const topReel = data.recommendations[0];
                const directVideoUrl = await getVideoUrl(topReel.reel_id);
                setVideoUrl(directVideoUrl);
            } else {
                setError('No recommendations found');
            }
        } catch (error) {
            console.error('Failed:', error);
            setError(error.name === 'AbortError' 
                ? 'Request timed out. Please try again.' 
                : `Failed to get recommendations: ${error.message}`
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Recommendations</h1>
            <button
                onClick={handleGetRecommendations}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
                disabled={loading}
            >
                {loading ? 'Loading...' : 'Get Recommendations'}
            </button>

            {error && (
                <div className="text-red-500 mb-4">
                    {error}
                </div>
            )}

            {videoUrl && (
                <div className="mt-4">
                    <h2 className="text-xl font-semibold mb-2">Top Recommended Video:</h2>
                    <video 
                        controls 
                        className="w-full"
                        autoPlay
                    >
                        <source src={videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}
        </div>
    );
}

export default RecommendationsPage; 