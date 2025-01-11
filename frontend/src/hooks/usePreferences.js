import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState({
    teams: [],
    players: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Load preferences from API
  useEffect(() => {
    const loadPreferences = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/preferences`);
        if (response.data.success) {
          setPreferences(response.data.preferences);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        setPreferences({ teams: [], players: [] });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [isAuthenticated]);

  const savePreferences = async (newPreferences) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/preferences`,
        newPreferences
      );
      if (response.data.success) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  };

  const followTeam = async (team) => {
    if (!team || !team.id) return;
    
    const teamToStore = {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      teamName: team.teamName,
      locationName: team.locationName,
      shortName: team.shortName
    };

    const updatedTeams = [...preferences.teams, teamToStore];
    await savePreferences({
      ...preferences,
      teams: updatedTeams
    });
  };

  const followPlayer = async (player) => {
    if (!player || !player.id) return;
    
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

    const updatedPlayers = [...preferences.players, playerToStore];
    await savePreferences({
      ...preferences,
      players: updatedPlayers
    });
  };

  const unfollowTeam = async (teamId) => {
    const updatedTeams = preferences.teams.filter(t => t.id !== teamId);
    await savePreferences({
      ...preferences,
      teams: updatedTeams
    });
  };

  const unfollowPlayer = async (playerId) => {
    const updatedPlayers = preferences.players.filter(p => p.id !== playerId);
    await savePreferences({
      ...preferences,
      players: updatedPlayers
    });
  };

  const clearPreferences = async () => {
    await savePreferences({ teams: [], players: [] });
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