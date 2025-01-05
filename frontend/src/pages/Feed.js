import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NewsDigest from '../components/NewsDigest';

function Feed() {
  const navigate = useNavigate();
  const [selectedTeamPlayer, setSelectedTeamPlayer] = useState(null);

  useEffect(() => {
    // Get stored preferences
    const team = JSON.parse(localStorage.getItem('selectedTeam'));
    const player = JSON.parse(localStorage.getItem('selectedPlayer'));

    if (team && player) {
      setSelectedTeamPlayer({ team, player });
    }
  }, []);

  if (!selectedTeamPlayer) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="p-8 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Set Your Preferences</h2>
          <p className="mt-2 text-gray-600">
            Your personalized MLB feed will appear here once you select your favorite team and player.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Choose Preferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Your MLB Feed</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Following Team</h3>
            <p>{selectedTeamPlayer.team.name}</p>
          </div>
          <div>
            <h3 className="font-semibold">Following Player</h3>
            <p>{selectedTeamPlayer.player.fullName}</p>
          </div>
        </div>
      </div>

      <NewsDigest 
        team={selectedTeamPlayer.team}
        player={selectedTeamPlayer.player}
      />
    </div>
  );
}

export default Feed; 