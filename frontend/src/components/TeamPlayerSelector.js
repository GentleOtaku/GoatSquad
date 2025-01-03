import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TeamPlayerSelector = ({ onSelect }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [roster, setRoster] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get('https://statsapi.mlb.com/api/v1/teams?sportId=1');
        setTeams(response.data.teams);
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };

    fetchTeams();
  }, []);

  useEffect(() => {
    const fetchRoster = async () => {
      if (!selectedTeam) return;
      
      setLoading(true);
      try {
        const response = await axios.get(
          `https://statsapi.mlb.com/api/v1/teams/${selectedTeam.id}/roster?season=2024`
        );
        setRoster(response.data.roster);
      } catch (error) {
        console.error('Error fetching roster:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoster();
  }, [selectedTeam]);

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setSelectedPlayer(null);
  };

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player);
    onSelect({ team: selectedTeam, player });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Select Your Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => handleTeamSelect(team)}
              className={`p-4 rounded-lg border ${
                selectedTeam?.id === team.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <img
                src={`https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                alt={team.name}
                className="w-16 h-16 mx-auto mb-2"
              />
              <p className="text-sm text-center font-medium">{team.name}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedTeam && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Your Player</h2>
          {loading ? (
            <div className="text-center">Loading roster...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {roster.map((player) => (
                <button
                  key={player.person.id}
                  onClick={() => handlePlayerSelect(player.person)}
                  className={`p-4 rounded-lg border ${
                    selectedPlayer?.id === player.person.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <p className="text-center font-medium">{player.person.fullName}</p>
                  <p className="text-sm text-center text-gray-500">
                    {player.position.abbreviation}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamPlayerSelector; 