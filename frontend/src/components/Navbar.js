import React from 'react';
import { Link } from 'react-router-dom';
import TranslatedText from './TranslatedText';
import LanguageSelector from './LanguageSelector';

function Navbar() {
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/news', label: 'News' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/preferences', label: 'Preferences' }
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <img 
                  src="/images/logo.svg" 
                  alt="Logo" 
                  className="h-8 w-auto filter dark:invert cursor-pointer"
                />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  <TranslatedText text={item.label} />
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <TranslatedText text={item.label} />
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 