import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const NewsDigest = ({ team, player }) => {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cleanSourcesData = (sourcesHtml) => {
    // Extract URLs and titles from the sources HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourcesHtml, 'text/html');
    const chips = doc.querySelectorAll('.chip');
    
    return Array.from(chips).map(chip => ({
      url: chip.href,
      title: chip.textContent
    }));
  };

  useEffect(() => {
    const fetchDigest = async () => {
      setLoading(true);
      setError(null);
      
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      
      try {
        console.log('Fetching digest for:', { team, player });
        
        const response = await axios.get(`${backendUrl}/news/digest`, {
          params: {
            team: team.name,
            player: player.fullName
          }
        });
        
        if (response.data.success) {
          const processedData = {
            ...response.data,
            sources: response.data.sources && response.data.sources.includes('<style>') 
              ? cleanSourcesData(response.data.sources)
              : response.data.sources
          };
          setDigest(processedData);
        } else {
          throw new Error(response.data.error || 'Failed to fetch digest');
        }
      } catch (err) {
        console.error('Error details:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch news digest');
      } finally {
        setLoading(false);
      }
    };

    if (team && player) {
      fetchDigest();
    }
  }, [team, player]);

  if (loading) {
    return (
      <div className="animate-pulse p-6 bg-white rounded-lg shadow">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg shadow">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Latest News</h2>
      <div className="prose prose-blue max-w-none">
        <ReactMarkdown>{digest.digest}</ReactMarkdown>
      </div>
      {digest.sources && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500">Sources</h3>
          <div className="mt-2">
            {Array.isArray(digest.sources) ? (
              <div className="flex flex-wrap gap-2">
                {digest.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                {digest.sources}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsDigest; 