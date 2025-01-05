import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamPlayerSelector from '../components/TeamPlayerSelector';

function Preferences() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState({
    team: JSON.parse(localStorage.getItem('selectedTeam')),
    player: JSON.parse(localStorage.getItem('selectedPlayer'))
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSelection = ({ team, player }) => {
    setSelection({ team, player });
  };

  const handleSave = () => {
    if (!selection.team || !selection.player) {
      alert('Please select both a team and a player before saving.');
      return;
    }

    setIsSaving(true);
    
    localStorage.setItem('selectedTeam', JSON.stringify(selection.team));
    localStorage.setItem('selectedPlayer', JSON.stringify(selection.player));
    
    setTimeout(() => {
      setIsSaving(false);
      navigate('/news');
    }, 500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Customize Your Feed
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content - Team/Player selector */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <TeamPlayerSelector
              onSelect={handleSelection}
              initialTeam={selection.team}
              initialPlayer={selection.player}
            />
          </div>
        </div>

        {/* Right sidebar - Selection summary and save button */}
        <div className="lg:w-80">
          <div className="sticky top-8">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
              {/* Selection Summary */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Your Selection</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Team
                    </p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                      {selection.team?.name || 'Not selected'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Player
                    </p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                      {selection.player?.fullName || 'Not selected'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving || !selection.team || !selection.player}
                className={`
                  w-full inline-flex items-center justify-center px-6 py-3 border border-transparent 
                  rounded-md shadow-sm text-base font-medium text-white
                  transition-colors duration-200
                  ${
                    isSaving || !selection.team || !selection.player
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800'
                  }
                `}
              >
                {isSaving ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="text-white dark:text-gray-100">Saving...</span>
                  </>
                ) : (
                  'Save Preferences'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Preferences; 