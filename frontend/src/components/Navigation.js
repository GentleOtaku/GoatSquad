import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LanguageSelector from './LanguageSelector';

function Navigation() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white';
    };

    return (
        <nav className="bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <img className="h-8 w-8" src="/logo.png" alt="GoatSquad" />
                        </div>
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link 
                                    to="/" 
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')}`}
                                >
                                    Home
                                </Link>
                                <Link 
                                    to="/news" 
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/news')}`}
                                >
                                    News
                                </Link>
                                <Link 
                                    to="/calendar" 
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/calendar')}`}
                                >
                                    Calendar
                                </Link>
                                <Link 
                                    to="/preferences" 
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/preferences')}`}
                                >
                                    Preferences
                                </Link>
                                <Link 
                                    to="/button" 
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/button')}`}
                                >
                                    Interactive
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-4 flex items-center md:ml-6">
                            <LanguageSelector />
                            <Link 
                                to="/profile"
                                className={`ml-3 px-3 py-2 rounded-md text-sm font-medium ${isActive('/profile')}`}
                            >
                                Profile
                            </Link>
                            <button
                                onClick={logout}
                                className="ml-3 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navigation; 