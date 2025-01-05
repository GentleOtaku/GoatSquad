import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import News from './pages/News';
import Calendar from './components/Calendar';
import UserPreferences from './pages/UserPreferences';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/news" element={
            <ProtectedRoute>
              <MainLayout>
                <News />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <MainLayout>
                <Calendar />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/user-preferences" element={
            <ProtectedRoute>
              <MainLayout>
                <UserPreferences />
              </MainLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
