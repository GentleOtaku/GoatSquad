import axios from 'axios';

// Initialize users in localStorage if not exists
if (!localStorage.getItem('users')) {
  const defaultUsers = [
    {
      id: '1',
      email: 'admin@example.com',
      password: 'admin123', // In production, this would be hashed
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      timezone: 'Pacific Standard Time',
      avatarUrl: '/images/default-avatar.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem('users', JSON.stringify(defaultUsers));
}

export const dataService = {
  // User operations
  getUsers: () => {
    const data = localStorage.getItem('users');
    return JSON.parse(data);
  },

  getUserByEmail: (email) => {
    const users = dataService.getUsers();
    return users.find(user => user.email === email);
  },

  getUserById: (id) => {
    const users = dataService.getUsers();
    return users.find(user => user.id === id);
  },

  createUser: (userData) => {
    const users = dataService.getUsers();
    const newUser = {
      ...userData,
      id: Date.now().toString(),
      avatarUrl: '/images/default-avatar.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
  },

  updateUser: (id, userData) => {
    const users = dataService.getUsers();
    const index = users.findIndex(user => user.id === id);
    if (index === -1) throw new Error('User not found');

    const updatedUser = {
      ...users[index],
      ...userData,
      updatedAt: new Date().toISOString()
    };
    users[index] = updatedUser;
    localStorage.setItem('users', JSON.stringify(users));
    return updatedUser;
  },

  deleteUser: (id) => {
    const users = dataService.getUsers();
    const filteredUsers = users.filter(user => user.id !== id);
    localStorage.setItem('users', JSON.stringify(filteredUsers));
  },

  verifyCredentials: (email, password) => {
    try {
      const users = dataService.getUsers();
      const user = users.find(user => user.email === email);
      
      if (!user) {
        return null;
      }

      // In a real application, you would hash the password and compare hashes
      // This is just for demonstration purposes
      if (user.password === password) {
        // Don't send the password back to the client
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }

      return null;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      throw new Error('Failed to verify credentials');
    }
  },

  fetchTeams: async () => {
    try {
      console.log('Fetching teams through backend proxy...');
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/mlb/teams`, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data || !response.data.teams) {
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response format from server');
      }
      
      console.log(`Successfully fetched ${response.data.teams.length} teams`);
      return response.data.teams;
    } catch (error) {
      console.error('Error fetching teams:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      if (error.response?.status === 504) {
        throw new Error('Server request timed out. Please try again.');
      }
      throw error;
    }
  }
};

// Add this line to export fetchTeams directly
export const fetchTeams = dataService.fetchTeams; 