import React, { useState, useEffect, useCallback } from 'react';

function App() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/mlb/teams`);
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  const fetchPlayers = useCallback(async (teamId) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/mlb/players/${teamId}`);
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  const fetchPlayerDetails = useCallback(async (playerId) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/mlb/player/${playerId}`);
      const data = await response.json();
      setSelectedPlayer(data);
    } catch (error) {
      console.error('Error fetching player details:', error);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers(selectedTeam.id);
    }
  }, [selectedTeam, fetchPlayers]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">MLB Fan Feed</h1>
          <p className="text-gray-600">Select your favorite team and player</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Team and Player Selection */}
          <div className="space-y-6">
            {/* Team Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Team</h2>
              <div className="relative">
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    const team = teams[e.target.value];
                    setSelectedTeam(team);
                    setSelectedPlayer(null);
                  }}
                  value={selectedTeam ? teams.indexOf(selectedTeam) : ''}
                  disabled={loading}
                >
                  <option value="">Choose a team...</option>
                  {teams.map((team, index) => (
                    <option key={team.id} value={index}>
                      {team.city} {team.name} ({team.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Player Selection */}
            {selectedTeam && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Player</h2>
                <div className="relative">
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => fetchPlayerDetails(players[e.target.value].id)}
                    value={selectedPlayer ? players.findIndex(p => p.id === selectedPlayer.id) : ''}
                    disabled={loading}
                  >
                    <option value="">Choose a player...</option>
                    {players.map((player, index) => (
                      <option key={player.id} value={index}>
                        #{player.number} {player.name} - {player.position}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Player Information */}
          {selectedPlayer && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Player Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <InfoItem label="Name" value={selectedPlayer.name} />
                <InfoItem label="Position" value={selectedPlayer.position} />
                <InfoItem label="Team" value={selectedPlayer.team} />
                <InfoItem label="Number" value={`#${selectedPlayer.number}`} />
                <InfoItem label="Birth Date" value={selectedPlayer.birthDate} />
                <InfoItem label="Height" value={selectedPlayer.height} />
                <InfoItem label="Weight" value={`${selectedPlayer.weight} lbs`} />
                <InfoItem label="Bats" value={selectedPlayer.batSide} />
                <InfoItem label="Throws" value={selectedPlayer.throwSide} />
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="border-b border-gray-100 pb-2">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-medium text-gray-900">{value || 'N/A'}</p>
    </div>
  );
}

export default App;
