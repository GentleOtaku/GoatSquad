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

    if (!team || !player) {
      // If no preferences are set, redirect to preferences page
      navigate('/');
      return;
    }

    setSelectedTeamPlayer({ team, player });
  }, [navigate]);

  if (!selectedTeamPlayer) return null;

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