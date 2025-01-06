import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

function NewsDigest({ team, player }) {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlights, setHighlights] = useState([]);

  const fetchKey = team?.id + '-' + player?.id;

  // Updated highlights fetch
  useEffect(() => {
    const fetchHighlights = async () => {
      if (!team?.id || !player?.id) return;
      
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/mlb/highlights`, {
          params: {
            team_id: team.id,
            player_id: player.id
          }
        });

        if (response.data.highlights && response.data.highlights.length > 0) {
          setHighlights(response.data.highlights);
        } else {
          // If no player-specific highlights, use default video
          setHighlights([{
            title: `Featured MLB Highlight`,
            description: 'Watch the latest MLB action',
            url: 'https://www.mlb.com/video/embed/featured',
            date: new Date().toISOString(),
            blurb: 'Featured MLB highlight'
          }]);
        }
      } catch (err) {
        console.error('Error fetching highlights:', err);
        // Set default video on error
        setHighlights([{
          title: `Featured MLB Highlight`,
          description: 'Watch the latest MLB action',
          url: 'https://www.mlb.com/video/embed/featured',
          date: new Date().toISOString(),
          blurb: 'Featured MLB highlight'
        }]);
      }
    };

    fetchHighlights();
  }, [team?.id, player?.id]);

  // Existing digest fetch
  useEffect(() => {
    const fetchDigest = async () => {
      if (!team || !player) return;
      
      setLoading(true);
      setError(null);
      setDigest(null);
      
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/news/digest`, {
          params: {
            team: team.name,
            player: player.fullName
          }
        });

        setDigest(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch news digest');
      } finally {
        setLoading(false);
      }
    };

    fetchDigest();
  }, [fetchKey]);

  const parseSourceLinks = (sourcesHtml) => {
    try {
      // Create a temporary div to parse the HTML
      const div = document.createElement('div');
      // Sanitize the HTML first
      div.innerHTML = DOMPurify.sanitize(sourcesHtml);
      
      // Find all chip links
      const chips = div.querySelectorAll('a.chip');
      return Array.from(chips).map(chip => ({
        text: chip.textContent,
        url: chip.href
      }));
    } catch (error) {
      console.error('Error parsing sources:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow fade-in">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="space-y-6 slide-up">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Latest News</h2>
        
        {/* Dynamic Content with Dark Mode Support */}
        <div className="prose dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 max-w-none">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 text-gray-700 dark:text-gray-300" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300" {...props} />,
              li: ({node, ...props}) => <li className="mb-2 text-gray-700 dark:text-gray-300" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />
            }}
          >
            {digest.digest}
          </ReactMarkdown>
        </div>

        {/* Sources Section */}
        {digest.sources && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Sources
            </h3>
            <div className="flex flex-wrap gap-2">
              {parseSourceLinks(digest.sources).map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm 
                    bg-gray-100 dark:bg-gray-700 
                    text-gray-700 dark:text-gray-300 
                    hover:bg-gray-200 dark:hover:bg-gray-600 
                    transition-colors duration-200"
                >
                  {source.text}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        {digest.timestamp && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Generated at: {new Date(digest.timestamp).toLocaleString()}
          </div>
        )}
      </div>

      {/* Updated Video Section */}
      {highlights.length > 0 && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Recent Highlights
          </h2>
          <div className="space-y-6">
            {highlights.map((highlight, index) => (
              <div key={index} className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {highlight.title}
                </h3>
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                    preload="metadata"
                  >
                    <source src={highlight.url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                {highlight.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {highlight.description}
                  </p>
                )}
                {highlight.date && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(highlight.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsDigest; 