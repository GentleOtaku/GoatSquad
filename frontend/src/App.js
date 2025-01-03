import React, { useState } from 'react';
import TeamPlayerSelector from './components/TeamPlayerSelector';
import NewsDigest from './components/NewsDigest';

function App() {
  const [selectedTeamPlayer, setSelectedTeamPlayer] = useState(null);

  const handleSelection = ({ team, player }) => {
    setSelectedTeamPlayer({ team, player });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MLB Fan Feed</h1>
          <p className="text-gray-600">Select your favorite team and player to get started</p>
        </div>

        <TeamPlayerSelector onSelect={handleSelection} />

        {selectedTeamPlayer && (
          <div className="space-y-8 mt-8">
            <div className="p-6 bg-white rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4">Selected Favorites</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Team</h3>
                  <p>{selectedTeamPlayer.team.name}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Player</h3>
                  <p>{selectedTeamPlayer.player.fullName}</p>
                </div>
              </div>
            </div>

            <NewsDigest 
              team={selectedTeamPlayer.team}
              player={selectedTeamPlayer.player}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
