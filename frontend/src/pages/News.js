import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewsDigest from '../components/NewsDigest';
import { usePreferences } from '../hooks/usePreferences';
import PageTransition from '../components/PageTransition';

function News() {
  const { preferences, isLoading } = usePreferences();

  useEffect(() => {
    console.log('Current preferences:', preferences);
  }, [preferences]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!preferences || (!preferences.teams.length && !preferences.players.length)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center fade-in">
        <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="mb-6">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
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
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Set Your Preferences
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Choose your favorite team and player to get personalized MLB updates and highlights.
          </p>
          <Link
            to="/preferences"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            Choose Preferences
          </Link>
        </div>
      </div>
    );
  }

  console.log('Passing to NewsDigest:', {
    teams: preferences.teams,
    players: preferences.players
  });

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NewsDigest 
          teams={preferences.teams || []} 
          players={preferences.players || []} 
        />
      </div>
    </PageTransition>
  );
}

export default News; 