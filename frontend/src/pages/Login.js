import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import axios from 'axios';
import PageTransition from '../components/PageTransition';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      console.log('Attempting login to:', `${process.env.REACT_APP_BACKEND_URL}/auth/login`);
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/auth/login`, {
        email,
        password
      });

      if (response.data.success && response.data.token) {
        await login(response.data.token);
        const from = location.state?.from?.pathname || '/';
        navigate(from);
      } else {
        setError(response.data.message || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Full error:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to log in');
      }
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    // Implement forgot password functionality or show a message
    alert('Forgot password functionality coming soon!');
  };

  return (
    <PageTransition>
      <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="/images/logo.svg"
              alt="Logo"
              className={`w-48 h-24 ${isDarkMode ? 'filter invert' : ''}`}
            />
          </div>
          <h2 className={`mt-6 text-center text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Sign in to your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className={`py-8 px-4 shadow sm:rounded-lg sm:px-10 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`block w-full appearance-none rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm
                      ${isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500' 
                        : 'border-gray-300 placeholder-gray-400 focus:border-indigo-500 bg-white text-gray-900'}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={`block w-full appearance-none rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm
                      ${isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500' 
                        : 'border-gray-300 placeholder-gray-400 focus:border-indigo-500 bg-white text-gray-900'}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="remember-me" className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Remember me
                  </label>
                </div>

                <button 
                  onClick={handleForgotPassword}
                  className="text-blue-600 hover:text-blue-800 underline"
                  type="button"
                >
                  Forgot password?
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Sign in
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`} />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-2 ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled
                  className={`inline-flex w-full justify-center rounded-md border py-2 px-4 text-sm font-medium shadow-sm opacity-50 cursor-not-allowed
                    ${isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-gray-200' 
                      : 'border-gray-300 bg-white text-gray-500'}`}
                >
                  <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="ml-2">Google</span>
                </button>

                <button
                  type="button"
                  disabled
                  className={`inline-flex w-full justify-center rounded-md border py-2 px-4 text-sm font-medium shadow-sm opacity-50 cursor-not-allowed
                    ${isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-gray-200' 
                      : 'border-gray-300 bg-white text-gray-500'}`}
                >
                  <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="ml-2">GitHub</span>
                </button>
              </div>
            </div>
          </div>

          {/* Free trial link */}
          <p className={`mt-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Not a member?{' '}
            <Link to="/register" className="font-medium text-indigo-500 hover:text-indigo-400">
              Create an account
            </Link>
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
            <div className={`rounded-md p-4 ${isDarkMode ? 'bg-red-900' : 'bg-red-50'}`}>
              <div className={`text-sm ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>{error}</div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

export default Login; 