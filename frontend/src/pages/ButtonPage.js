import React, { useState } from 'react';
import axios from 'axios';
import PageTransition from '../components/PageTransition';

function ButtonPage() {
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/button-click`);
            setResponse(result.data);
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Interactive Button Page
                    </h1>
                    
                    <button
                        onClick={handleClick}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Click Me!'}
                    </button>

                    {error && (
                        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    {response && (
                        <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 rounded">
                            <h2 className="font-bold text-green-800 dark:text-green-200">
                                Response:
                            </h2>
                            <pre className="mt-2 whitespace-pre-wrap text-sm text-green-700 dark:text-green-300">
                                {JSON.stringify(response, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}

export default ButtonPage; 