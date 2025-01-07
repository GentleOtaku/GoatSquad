import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState({
    teams: [],
    players: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    const loadPreferences = () => {
      setIsLoading(true);
      try {
        const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED_TEAMS)) || [];
        const players = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED_PLAYERS)) || [];
        setPreferences({ teams, players });
      } catch (error) {
        console.error('Error loading preferences:', error);
        setPreferences({ teams: [], players: [] });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const followTeam = (team) => {
    if (!team || !team.id) return; // Prevent empty team objects
    
    const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED_TEAMS)) || [];
    if (!teams.some(t => t.id === team.id)) {
      const teamToStore = {
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        teamName: team.teamName,
        locationName: team.locationName,
        shortName: team.shortName
      };
      const updatedTeams = [...teams, teamToStore];
      localStorage.setItem(STORAGE_KEYS.FOLLOWED_TEAMS, JSON.stringify(updatedTeams));
      setPreferences(prev => ({
        ...prev,
        teams: updatedTeams
      }));
    }
  };

  const followPlayer = (player) => {
    if (!player || !player.id) return; // Prevent empty player objects
    
    const players = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED_PLAYERS)) || [];
    if (!players.some(p => p.id === player.id)) {
      const playerToStore = {
        id: player.id,
        fullName: player.fullName,
        firstName: player.firstName,
        lastName: player.lastName,
        primaryNumber: player.primaryNumber,
        primaryPosition: player.position ? {
          code: player.position.code,
          name: player.position.name,
          type: player.position.type,
          abbreviation: player.position.abbreviation
        } : null
      };

      const updatedPlayers = [...players, playerToStore];
      localStorage.setItem(STORAGE_KEYS.FOLLOWED_PLAYERS, JSON.stringify(updatedPlayers));
      setPreferences(prev => ({
        ...prev,
        players: updatedPlayers
      }));
    }
  };

  const unfollowTeam = (teamId) => {
    const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED_TEAMS)) || [];
    const updatedTeams = teams.filter(t => t.id !== teamId);
    localStorage.setItem(STORAGE_KEYS.FOLLOWED_TEAMS, JSON.stringify(updatedTeams));
    setPreferences(prev => ({
      ...prev,
      teams: updatedTeams
    }));

    // If no teams and no players are left, set preferences to null
    const players = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED_PLAYERS)) || [];
    if (updatedTeams.length === 0 && players.length === 0) {
      setPreferences(null);
    }
  };

  const unfollowPlayer = (playerId) => {
    const players = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED_PLAYERS)) || [];
    const updatedPlayers = players.filter(p => p.id !== playerId);
    localStorage.setItem(STORAGE_KEYS.FOLLOWED_PLAYERS, JSON.stringify(updatedPlayers));
    setPreferences(prev => ({
      ...prev,
      players: updatedPlayers
    }));

    // If no players and no teams are left, set preferences to null
    const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED_TEAMS)) || [];
    if (updatedPlayers.length === 0 && teams.length === 0) {
      setPreferences(null);
    }
  };

  const clearPreferences = () => {
    localStorage.removeItem(STORAGE_KEYS.FOLLOWED_TEAMS);
    localStorage.removeItem(STORAGE_KEYS.FOLLOWED_PLAYERS);
    setPreferences(null);
  };

  return {
    preferences,
    isLoading,
    followTeam,
    unfollowTeam,
    followPlayer,
    unfollowPlayer,
    clearPreferences
  };
}; 