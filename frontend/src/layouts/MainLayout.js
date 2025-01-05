import React from 'react';
import Navbar from '../components/Navbar';

function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </>
  );
}

export default MainLayout; 