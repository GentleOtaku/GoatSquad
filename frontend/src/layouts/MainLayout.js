import React from 'react';
import Navbar from '../components/Navbar';

function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout; 