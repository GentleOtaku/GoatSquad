import axios from 'axios';
import { API_ENDPOINTS } from '../constants';

export const fetchTeams = async () => {
  try {
    const response = await axios.get(API_ENDPOINTS.MLB_TEAMS);
    return response.data.teams;
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }
};

export const fetchRoster = async (teamId) => {
  try {
    const response = await axios.get(API_ENDPOINTS.MLB_ROSTER(teamId));
    return response.data.roster;
  } catch (error) {
    console.error('Error fetching roster:', error);
    throw error;
  }
}; 