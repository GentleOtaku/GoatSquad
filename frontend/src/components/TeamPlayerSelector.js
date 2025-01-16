import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import TranslatedText from './TranslatedText';
import { fetchTeams } from '../services/dataService';
import { retry } from '../utils/retry';

function TeamPlayerSelector({ onSelect, followedTeams = [], followedPlayers = [] }) {
  const [teams, setTeams] = useState([]);
  const [rostersByTeam, setRostersByTeam] = useState({});
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('teams');
  const [error, setError] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Move fetchRoster into useCallback
  const fetchRoster = useCallback(async (teamId) => {
    if (!teamId || rostersByTeam[teamId]) return;
    
    setRosterLoading(true);
    try {
      console.log('Fetching roster from:', `${process.env.REACT_APP_BACKEND_URL}/api/mlb/roster/${teamId}`);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/mlb/roster/${teamId}`);
      console.log('Roster response:', response.data);
      
      if (response.data && response.data.roster) {
        setRostersByTeam(prev => ({
          ...prev,
          [teamId]: response.data.roster
        }));
      } else {
        throw new Error('Invalid roster response format');
      }
    } catch (error) {
      console.error('Error fetching roster:', error);
      setRostersByTeam(prev => ({
        ...prev,
        [teamId]: []
      }));
    } finally {
      setRosterLoading(false);
    }
  }, [rostersByTeam]); // Add rostersByTeam as dependency

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        console.log('Fetching teams...');
        setLoading(true);
        setError(null);
        
        // Add retry logic
        const teams = await retry(
          async () => {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/mlb/teams`, {
              timeout: 15000,
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.data?.teams) throw new Error('Invalid response format');
            return response.data.teams;
          },
          {
            retries: 3,
            delay: 1000,
            onRetry: (error, attempt) => {
              console.log(`Retry attempt ${attempt} due to:`, error);
            }
          }
        );

        const sortedTeams = teams.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(sortedTeams);
        
      } catch (error) {
        console.error('Error fetching teams:', error);
        setError(error.message || 'Failed to fetch teams');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Fetch roster when team filter changes
  useEffect(() => {
    if (selectedTeamFilter) {
      fetchRoster(selectedTeamFilter);
    }
  }, [selectedTeamFilter, fetchRoster]); // fetchRoster is now stable

  // Get current filtered and searched players
  const getCurrentPlayers = () => {
    if (!selectedTeamFilter) return [];
    const roster = rostersByTeam[selectedTeamFilter] || [];
    return roster.filter(player => 
      player.person.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Pre-fetch rosters for followed players' teams
  useEffect(() => {
    const fetchFollowedPlayersRosters = async () => {
      const teamIds = new Set(followedTeams.map(team => team.id));
      const promises = Array.from(teamIds)
        .filter(teamId => !rostersByTeam[teamId])
        .map(teamId => fetchRoster(teamId));
      
      await Promise.all(promises);
    };

    fetchFollowedPlayersRosters();
  }, [followedTeams, fetchRoster, rostersByTeam]); // fetchRoster is now stable

  const handleSelection = ({ team, player }) => {
    console.log('Selected team:', team);  // Debug log
    console.log('Selected player:', player);  // Debug log
    
    if (team) {
      // Check if team is already followed
      const isAlreadyFollowed = followedTeams.some(t => t.id === team.id);
      if (!isAlreadyFollowed) {
        onSelect({ team });
      }
    } else if (player) {
      // Check if player is already followed
      const isAlreadyFollowed = followedPlayers.some(p => p.id === player.id);
      if (!isAlreadyFollowed) {
        onSelect({ player });
      }
    }
  };

  if (loading && !teams.length) {
    return (
      <div className="flex justify-center items-center py-20">
        <div 
          role="status"
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
        >
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && !teams.length) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <TranslatedText 
            text="Failed to fetch teams" 
            data-testid="translated-failed-to-fetch-teams" 
          />
        </div>
        <button
          onClick={() => {
            setError(null);
            fetchTeams();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <TranslatedText 
            text="Retry" 
            data-testid="translated-retry" 
          />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search input - Updated styling */}
      <div className="w-full">
        <label htmlFor="search" className="block text-lg font-medium text-gray-200 mb-2">
          <TranslatedText text="Search teams or players" />
        </label>
        <div className="relative">
          <input
            type="text"
            name="search"
            id="search"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg
              text-gray-200 placeholder-gray-400
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              transition-colors duration-200"
            placeholder={searchType === 'teams' ? 'Search teams...' : 'Search players...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Toggle buttons - Updated styling to match */}
      <div className="flex space-x-4 mt-4">
        <button
          onClick={() => setSearchType('teams')}
          className={`px-6 py-3 rounded-lg transition-colors duration-200 ${
            searchType === 'teams'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
        >
          <TranslatedText text="Teams" />
        </button>
        <button
          onClick={() => setSearchType('players')}
          className={`px-6 py-3 rounded-lg transition-colors duration-200 ${
            searchType === 'players'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
        >
          <TranslatedText text="Players" data-testid="translated-players" />
        </button>
      </div>

      {/* Results list */}
      <div className="mt-4">
        {searchType === 'teams' ? (
          <div className="space-y-8">
            {/* Teams Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-200">
                  <TranslatedText text="Teams" />
                </h2>
                <span className="text-gray-400">
                  {followedTeams.length} followed
                </span>
              </div>
              
              {teams.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {teams
                    .filter(team => 
                      team.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((team) => {
                      const isFollowed = followedTeams.some(t => t.id === team.id);
                      return (
                        <button
                          key={team.id}
                          onClick={() => handleSelection({ team })}
                          disabled={isFollowed}
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            isFollowed
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-not-allowed opacity-70'
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <img
                              src={`https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                              alt={team.name}
                              className="w-16 h-16 object-contain mb-2"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/default-team-logo.png';
                              }}
                            />
                            <p className="text-sm font-medium text-center text-gray-200">
                              {team.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-400">
                    <TranslatedText text="No teams found" />
                  </p>
                </div>
              )}
            </section>
          </div>
        ) : (
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
              {rosterLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div 
                    role="status"
                    className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
                  >
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : selectedTeamFilter && getCurrentPlayers().length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {getCurrentPlayers().map((player, index) => (
                    <button
                      key={player.person.id}
                      onClick={() => handleSelection({ player: player.person })}
                      disabled={followedPlayers.some(p => p.id === player.person.id)}
                      className={`p-4 rounded-lg border transition-all duration-200
                        ${followedPlayers.some(p => p.id === player.person.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                        }`}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                          <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                            {player.person.primaryNumber || '#'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-center text-gray-900 dark:text-white">
                          {player.person.fullName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {player.position.abbreviation}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : selectedTeamFilter ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    <TranslatedText text="No players found for the selected team" />
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    <TranslatedText text="Select a team to view players" />
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamPlayerSelector; 