import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

console.log('API URL:', API_URL); // Debug log

export const userService = {
  register: async (userData) => {
    try {
      console.log('Making registration request to:', `${API_URL}/auth/register`);
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      console.log('Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  login: async (email, password) => {
    try {
      console.log('Making login request to:', `${API_URL}/auth/login`);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      console.log('Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/profile`);
      return response.data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      if (error.response) {
        throw error.response.data;
      }
      throw error;
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await axios.put(`${API_URL}/auth/profile`, userData);
      return response.data;
    } catch (error) {
      console.error('Profile update error:', error);
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      if (error.response) {
        throw error.response.data;
      }
      throw error;
    }
  }
}; 