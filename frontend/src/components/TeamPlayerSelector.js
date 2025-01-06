import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TeamPlayerSelector({ onSelect, initialTeam, initialPlayer }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam || null);
  const [roster, setRoster] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer || null);
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

  useEffect(() => {
    if (initialTeam && initialPlayer) {
      setSelectedTeam(initialTeam);
      setSelectedPlayer(initialPlayer);
      onSelect({ team: initialTeam, player: initialPlayer });
    }
  }, [initialTeam, initialPlayer]);

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setSelectedPlayer(null);
    onSelect({ team, player: null });
  };

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player);
    onSelect({ team: selectedTeam, player });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Your Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {teams.map((team, index) => (
            <button
              key={team.id}
              onClick={() => handleTeamSelect(team)}
              className={`p-4 rounded-lg border smooth-transition hover:shadow-md 
                ${
                  selectedTeam?.id === team.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 scale-105'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                }
                opacity-0 animate-[fadeIn_0.3s_ease-in_forwards]`}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <div className="relative w-16 h-16 mx-auto mb-2">
                <img
                  src={`https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                  alt={team.name}
                  className="w-full h-full object-contain 
                    dark:drop-shadow-[0_0_2px_rgba(255,255,255,1)]
                    dark:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]
                    dark:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]
                    dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  style={{
                    filter: 'brightness(1) contrast(1)'
                  }}
                />
              </div>
              <p className="text-sm text-center font-medium text-gray-900 dark:text-gray-100">{team.name}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedTeam && (
        <div className="slide-up">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Your Player</h2>
          {loading ? (
            <div className="text-center p-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading roster...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {roster.map((player, index) => (
                <button
                  key={player.person.id}
                  onClick={() => handlePlayerSelect(player.person)}
                  className={`p-4 rounded-lg border smooth-transition hover:shadow-md
                    ${selectedPlayer?.id === player.person.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 scale-105'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                    }
                    opacity-0 animate-[fadeIn_0.3s_ease-in_forwards]`}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div>
                    <p className="text-center font-medium text-gray-900 dark:text-gray-100">{player.person.fullName}</p>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-1">
                      {player.position.abbreviation}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamPlayerSelector; 