import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    const team = JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_TEAM));
    const player = JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_PLAYER));
    
    if (team && player) {
      setPreferences({ team, player });
    }
  }, []);

  const savePreferences = (team, player) => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_TEAM, JSON.stringify(team));
    localStorage.setItem(STORAGE_KEYS.SELECTED_PLAYER, JSON.stringify(player));
    setPreferences({ team, player });
  };

  const clearPreferences = () => {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_TEAM);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_PLAYER);
    setPreferences(null);
  };

  return {
    preferences,
    savePreferences,
    clearPreferences
  };
}; 