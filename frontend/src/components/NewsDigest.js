import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NewsDigest = ({ team, player }) => {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDigest = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/news/digest`, {
          params: {
            team: team.name,
            player: player.fullName
          }
        });
        setDigest(response.data);
      } catch (err) {
        setError('Failed to fetch news digest');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (team && player) {
      fetchDigest();
    }
  }, [team, player]);

  if (loading) {
    return (
      <div className="animate-pulse p-6 bg-white rounded-lg shadow">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg shadow">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Latest News</h2>
      <div className="prose max-w-none">
        {digest.digest.split('\n').map((paragraph, index) => (
          paragraph.trim() && (
            <p key={index} className="mb-4">
              {paragraph}
            </p>
          )
        ))}
      </div>
      {digest.sources && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500">Sources</h3>
          <div className="text-sm text-gray-400 mt-1">
            {digest.sources}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsDigest; 