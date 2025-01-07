import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

function NewsDigest({ teams, players }) {
  const [digests, setDigests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlights, setHighlights] = useState([]);

  // Add debug logging
  useEffect(() => {
    console.log('NewsDigest received props:', { teams, players });
  }, [teams, players]);

  // Fetch digests for all teams and players
  useEffect(() => {
    const fetchDigests = async () => {
      if (!teams?.length && !players?.length) {
        console.log('No teams or players to fetch digests for');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const teamNames = teams.map(team => team.name).filter(Boolean);
        const playerNames = players.map(player => player.fullName).filter(Boolean);

        console.log('Fetching digests with params:', {
          teams: teamNames,
          players: playerNames
        });

        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/news/digest`, {
          params: {
            'teams[]': teamNames,
            'players[]': playerNames
          },
          paramsSerializer: params => {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, values]) => {
              if (Array.isArray(values)) {
                values.forEach(value => searchParams.append(key, value));
              } else {
                searchParams.append(key, values);
              }
            });
            return searchParams.toString();
          }
        });

        console.log('Digest response:', response.data);
        
        if (response.data.success && response.data.digests) {
          setDigests(response.data.digests);
        } else {
          console.error('Invalid digest response:', response.data);
          setError('Invalid response format from server');
        }
      } catch (err) {
        console.error('Error fetching digests:', err);
        setError(err.message || 'Failed to fetch news digests');
      } finally {
        setLoading(false);
      }
    };

    fetchDigests();
  }, [teams, players]);

  // Updated highlights fetch
  useEffect(() => {
    const fetchHighlights = async () => {
      if (!teams?.length && !players?.length) return;
      
      try {
        // Fetch highlights for teams
        const teamHighlights = await Promise.all(
          teams.slice(0, 3).map(async team => {
            try {
              const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/mlb/highlights`, {
                params: { team_id: team.id }
              });
              return {
                type: 'team',
                subject: team.name,
                highlight: response.data.highlights?.[0] || {
                  title: `Featured ${team.name} Highlight`,
                  description: `Watch the latest ${team.name} action`,
                  url: 'https://mlb-cuts-diamond.mlb.com/FORGE/2024/2024-03/28/b0e6e6d3-0b9b0b9b-0b9b0b9b-csvm-diamondx64-asset_1280x720_59_4000K.mp4',
                  date: new Date().toISOString(),
                  blurb: `Featured ${team.name} highlight`
                }
              };
            } catch (error) {
              console.error(`Error fetching highlights for team ${team.name}:`, error);
              return null;
            }
          })
        );

        // Fetch highlights for players
        const playerHighlights = await Promise.all(
          players.slice(0, 3).map(async player => {
            try {
              const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/mlb/highlights`, {
                params: { player_id: player.id }
              });
              return {
                type: 'player',
                subject: player.fullName,
                highlight: response.data.highlights?.[0] || {
                  title: `Featured ${player.fullName} Highlight`,
                  description: `Watch the latest ${player.fullName} action`,
                  url: 'https://mlb-cuts-diamond.mlb.com/FORGE/2024/2024-03/28/b0e6e6d3-0b9b0b9b-0b9b0b9b-csvm-diamondx64-asset_1280x720_59_4000K.mp4',
                  date: new Date().toISOString(),
                  blurb: `Featured ${player.fullName} highlight`
                }
              };
            } catch (error) {
              console.error(`Error fetching highlights for player ${player.fullName}:`, error);
              return null;
            }
          })
        );

        // Filter out null values and combine highlights
        const validHighlights = [...teamHighlights, ...playerHighlights].filter(Boolean);
        setHighlights(validHighlights);

      } catch (err) {
        console.error('Error fetching highlights:', err);
        // Set default highlights
        const defaultHighlights = [
          ...teams.slice(0, 3).map(team => ({
            type: 'team',
            subject: team.name,
            highlight: {
              title: `Featured ${team.name} Highlight`,
              description: `Watch the latest ${team.name} action`,
              url: 'https://mlb-cuts-diamond.mlb.com/FORGE/2024/2024-03/28/b0e6e6d3-0b9b0b9b-0b9b0b9b-csvm-diamondx64-asset_1280x720_59_4000K.mp4',
              date: new Date().toISOString(),
              blurb: `Featured ${team.name} highlight`
            }
          })),
          ...players.slice(0, 3).map(player => ({
            type: 'player',
            subject: player.fullName,
            highlight: {
              title: `Featured ${player.fullName} Highlight`,
              description: `Watch the latest ${player.fullName} action`,
              url: 'https://mlb-cuts-diamond.mlb.com/FORGE/2024/2024-03/28/b0e6e6d3-0b9b0b9b-0b9b0b9b-csvm-diamondx64-asset_1280x720_59_4000K.mp4',
              date: new Date().toISOString(),
              blurb: `Featured ${player.fullName} highlight`
            }
          }))
        ];
        setHighlights(defaultHighlights);
      }
    };

    fetchHighlights();
  }, [teams, players]);

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
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow fade-in">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
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

  return (
    <div className="space-y-6 slide-up">
      {/* News Digests */}
      {digests.map((digest, index) => (
        <div key={index} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            {digest.type === 'team' ? 'Team Update' : 'Player Spotlight'}: {digest.subject}
          </h2>
          
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
              {digest.content}
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
      ))}

      {/* Highlights Section */}
      {highlights.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recent Highlights
          </h2>
          {highlights.map((item, index) => (
            <div key={index} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                {item.type === 'team' ? 'Team Highlight: ' : 'Player Highlight: '}
                {item.subject}
              </h3>
              {item.highlight?.url ? (
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden mb-4">
                  <video
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                    preload="metadata"
                  >
                    <source src={item.highlight.url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No highlight available
                  </p>
                </div>
              )}
              {item.highlight?.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {item.highlight.description}
                </p>
              )}
              {item.highlight?.date && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {new Date(item.highlight.date).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NewsDigest; 