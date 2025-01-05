import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamPlayerSelector from '../components/TeamPlayerSelector';

function UserPreferences() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('UserPreferences component mounted');
  }, []);

  const handleSelection = ({ team, player }) => {
    // Store the selection in localStorage
    localStorage.setItem('selectedTeam', JSON.stringify(team));
    localStorage.setItem('selectedPlayer', JSON.stringify(player));
    
    // Navigate to the feed page
    navigate('/feed');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Your Favorites</h1>
        <p className="text-gray-600">Choose your favorite team and player to personalize your feed</p>
      </div>
      <TeamPlayerSelector onSelect={handleSelection} />
    </div>
  );
}

export default UserPreferences; 