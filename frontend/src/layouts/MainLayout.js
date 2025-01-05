import React from 'react';
import Navbar from '../components/Navbar';

function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] text-gray-900 dark:text-gray-100">
        {children}
      </main>
    </div>
  );
}

export default MainLayout; 