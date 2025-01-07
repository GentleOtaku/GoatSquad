import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TranslatedText from './TranslatedText';

function TeamPlayerSelector({ onSelect, followedTeams = [], followedPlayers = [] }) {
  const [teams, setTeams] = useState([]);
  const [rostersByTeam, setRostersByTeam] = useState({}); // Store rosters by team ID
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('teams');

  // Fetch teams on mount
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

  // Fetch roster for a specific team
  const fetchRoster = async (teamId) => {
    if (!teamId || rostersByTeam[teamId]) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=2024`
      );
      setRostersByTeam(prev => ({
        ...prev,
        [teamId]: response.data.roster || []
      }));
    } catch (error) {
      console.error('Error fetching roster:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch roster when team filter changes
  useEffect(() => {
    if (selectedTeamFilter) {
      fetchRoster(selectedTeamFilter);
    }
  }, [selectedTeamFilter]);

  // Get current filtered and searched players
  const getCurrentPlayers = () => {
    if (!selectedTeamFilter) return [];
    const roster = rostersByTeam[selectedTeamFilter] || [];
    return roster.filter(player => 
      player.person.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get player data for a followed player
  const getPlayerData = (playerId) => {
    for (const teamRoster of Object.values(rostersByTeam)) {
      const player = teamRoster?.find(p => p.person.id === playerId);
      if (player) return player;
    }
    return null;
  };

  // Pre-fetch rosters for followed players' teams
  useEffect(() => {
    const fetchFollowedPlayersRosters = async () => {
      // Get unique team IDs from followed players that we don't have rosters for yet
      const teamIds = new Set(followedTeams.map(team => team.id));
      const promises = Array.from(teamIds)
        .filter(teamId => !rostersByTeam[teamId])
        .map(teamId => fetchRoster(teamId));
      
      await Promise.all(promises);
    };

    fetchFollowedPlayersRosters();
  }, [followedTeams]);

  const handleSelection = ({ team, player }) => {
    console.log('Selected team:', team);  // Debug log
    console.log('Selected player:', player);  // Debug log
    onSelect({ team, player });
  };

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <TranslatedText text="Search teams or players" />
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            name="search"
            id="search"
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-4 pr-10 sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder={searchType === 'teams' ? 'Search teams...' : 'Search players...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Toggle buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => setSearchType('teams')}
          className={`px-4 py-2 rounded-md ${
            searchType === 'teams'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          <TranslatedText text="Teams" />
        </button>
        <button
          onClick={() => setSearchType('players')}
          className={`px-4 py-2 rounded-md ${
            searchType === 'players'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          <TranslatedText text="Players" />
        </button>
      </div>

      {/* Results list */}
      <div className="mt-4">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <TranslatedText text="Loading..." />
          </div>
        ) : searchType === 'teams' ? (
          <div className="space-y-8">
            {/* Teams Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Teams</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {followedTeams.length} followed
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {teams.map((team, index) => (
                  <button
                    key={team.id}
                    onClick={() => onSelect({ team })}
                    className={`p-4 rounded-lg border smooth-transition hover:shadow-md 
                      ${
                        followedTeams.some(t => t.id === team.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
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
                        className="w-full h-full object-contain dark:drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]"
                      />
                    </div>
                    <p className="text-sm text-center font-medium text-gray-900 dark:text-gray-100">
                      {team.name}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : searchType === 'players' ? (
          <div className="space-y-8">
            {/* Players Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Players</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {followedPlayers.length} followed
                </span>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Team Filter Dropdown */}
                <div className="flex-1">
                  <select
                    value={selectedTeamFilter || ''}
                    onChange={(e) => setSelectedTeamFilter(e.target.value || null)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                      py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a team to filter players</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Players Grid */}
              {loading ? (
                <div className="text-center p-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading players...</p>
                </div>
              ) : selectedTeamFilter && getCurrentPlayers().length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {getCurrentPlayers().map((player, index) => (
                    <button
                      key={player.person.id}
                      onClick={() => onSelect({ player: player.person })}
                      className={`p-4 rounded-lg border smooth-transition hover:shadow-md
                        ${
                          followedPlayers.some(p => p.id === player.person.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                        }
                        opacity-0 animate-[fadeIn_0.3s_ease-in_forwards]`}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <div>
                        <p className="text-center font-medium text-gray-900 dark:text-gray-100">
                          {player.person.fullName}
                        </p>
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-1">
                          {player.position.abbreviation}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedTeamFilter 
                      ? "No players found for the selected team"
                      : "Select a team to view and follow players"}
                  </p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              {selectedTeamFilter 
                ? "No players found for the selected team"
                : "Select a team to view and follow players"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamPlayerSelector; 