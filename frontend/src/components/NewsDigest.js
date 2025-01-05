import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

function NewsDigest({ team, player }) {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const videoUrl = "https://mlb-cuts-diamond.mlb.com/FORGE/2024/2024-10/25/1f63eb4b-5d716856-889ba75a-csvm-diamondgcp-asset_1280x720_59_4000K.mp4";

  useEffect(() => {
    const fetchDigest = async () => {
      if (!team || !player) return;
      
      setLoading(true);
      setError(null);
      
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
  }, [team, player]);

  const parseSourceLinks = (sourcesHtml) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourcesHtml, 'text/html');
    const links = doc.querySelectorAll('a.chip');
    return Array.from(links).map(link => ({
      text: link.textContent,
      url: link.href
    }));
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow fade-in">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-red-600">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!digest) return null;

  const sourceLinks = digest.sources ? parseSourceLinks(digest.sources) : [];

  return (
    <div className="space-y-6 slide-up">
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Latest News</h2>
        <div className="prose max-w-none">
          <ReactMarkdown>{digest.digest}</ReactMarkdown>
        </div>
        {sourceLinks.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              {sourceLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  {link.text}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MLB Video Section */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Featured Highlight</h2>
        <div className="aspect-w-16 aspect-h-9">
          <video 
            className="w-full rounded-lg"
            controls
            playsInline
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}

export default NewsDigest; 