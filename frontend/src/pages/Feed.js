import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NewsDigest from '../components/NewsDigest';

function Feed() {
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    // Load saved preferences
    const savedTeam = JSON.parse(localStorage.getItem('selectedTeam'));
    const savedPlayer = JSON.parse(localStorage.getItem('selectedPlayer'));
    
    if (savedTeam && savedPlayer) {
      setPreferences({ team: savedTeam, player: savedPlayer });
    }
  }, []);

  if (!preferences) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow">
          <div className="mb-6">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Set Your Preferences
          </h2>
          <p className="text-gray-600 mb-6">
            Choose your favorite team and player to get personalized MLB updates and highlights.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Choose Preferences
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <NewsDigest team={preferences.team} player={preferences.player} />
    </div>
  );
}

export default Feed; 