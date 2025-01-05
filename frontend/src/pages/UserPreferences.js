import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamPlayerSelector from '../components/TeamPlayerSelector';

function UserPreferences() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState(null);
  const [currentPreferences, setCurrentPreferences] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing preferences
    const team = JSON.parse(localStorage.getItem('selectedTeam'));
    const player = JSON.parse(localStorage.getItem('selectedPlayer'));
    if (team && player) {
      setCurrentPreferences({ team, player });
      setSelection({ team, player });
    }
  }, []);

  const handleSelection = ({ team, player }) => {
    setSelection({ team, player });
    setSaved(false);
  };

  const handleSave = () => {
    if (!selection) return;

    // Store the selection in localStorage
    localStorage.setItem('selectedTeam', JSON.stringify(selection.team));
    localStorage.setItem('selectedPlayer', JSON.stringify(selection.player));
    setCurrentPreferences(selection);
    setSaved(true);

    // Show success message briefly
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  const handleViewFeed = () => {
    navigate('/feed');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Your Favorites</h1>
        <p className="text-gray-600">Choose your favorite team and player to personalize your feed</p>
      </div>

      {currentPreferences && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Current Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">Team</h3>
              <p>{currentPreferences.team.name}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Player</h3>
              <p>{currentPreferences.player.fullName}</p>
            </div>
          </div>
        </div>
      )}

      <TeamPlayerSelector 
        onSelect={handleSelection}
        initialTeam={currentPreferences?.team}
        initialPlayer={currentPreferences?.player}
      />

      <div className="mt-8 flex justify-end space-x-4">
        <button
          onClick={handleSave}
          disabled={!selection || (currentPreferences && 
            selection.team.id === currentPreferences.team.id && 
            selection.player.id === currentPreferences.player.id)}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white
            ${(!selection || (currentPreferences && 
              selection.team.id === currentPreferences.team.id && 
              selection.player.id === currentPreferences.player.id))
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
        >
          {saved ? 'Saved!' : 'Save Preferences'}
        </button>

        {currentPreferences && (
          <button
            onClick={handleViewFeed}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            View Feed
          </button>
        )}
      </div>

      {saved && (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Preferences saved successfully!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPreferences; 