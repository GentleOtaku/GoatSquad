import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="w-64 bg-white shadow-sm">
      <nav className="mt-5 px-2">
        <Link to="/" className="group flex items-center px-2 py-2 text-base leading-6 font-medium text-gray-900 hover:text-gray-900 hover:bg-gray-100">
          Home
        </Link>
        <Link to="/news" className="mt-1 group flex items-center px-2 py-2 text-base leading-6 font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">
          News
        </Link>
        <Link to="/calendar" className="mt-1 group flex items-center px-2 py-2 text-base leading-6 font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">
          Calendar
        </Link>
        <Link to="/preferences" className="mt-1 group flex items-center px-2 py-2 text-base leading-6 font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100">
          Preferences
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar; 