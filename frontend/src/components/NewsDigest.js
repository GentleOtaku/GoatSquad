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
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow fade-in">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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

  const sourceLinks = digest.sources ? parseSourceLinks(digest.sources) : [];

  return (
    <div className="space-y-6 slide-up">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Latest News</h2>
        
        {/* Team Update Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Team Update</h3>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>The St. Louis Cardinals finished the 2023 season <span className="font-medium">3rd</span> in the NL Central with a record of <span className="font-medium">83-79</span>.</p>
            <p>They have had a rough schedule, playing <span className="font-medium">30</span> games against teams with records better than .500, going <span className="font-medium">13-17</span> in those games.</p>
            <p>Key Statistics: The team batting average was <span className="font-medium">.248</span>, ranking 11th in the league. They scored <span className="font-medium">165</span> runs this season, while their staff had an ERA of <span className="font-medium">4.04</span>, putting them at 15th overall.</p>
          </div>
        </div>

        {/* Player Spotlight Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Player Spotlight</h3>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>Ryan Helsley had an outstanding 2023 season, recently named the NL Reliever of the Year and an All-MLB First Team selection.</p>
            <p>He is set to earn $11.5M in <span className="font-medium">2024</span>, up from $2.15M in <span className="font-medium">2022</span>.</p>
            <p>Helsley's season statistics include a <span className="font-medium">7-4</span> record, <span className="font-medium">2.04</span> ERA, and <span className="font-medium">79</span> strikeouts in <span className="font-medium">65</span> appearances. He had an impressive <span className="font-medium">49</span> saves.</p>
          </div>
        </div>

        {/* Looking Ahead Section */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Looking Ahead</h3>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>The Cardinals' upcoming schedule includes spring training games starting in late February, followed by the regular season.</p>
            <p>Key matchups in June include series against the San Francisco Giants, Philadelphia Phillies, and Atlanta Braves.</p>
          </div>
        </div>

        {/* Tags Section */}
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            {[
              'St. Louis Cardinals key matchups',
              'Ryan Helsley recent performance',
              'St. Louis Cardinals key statistics',
              'St. Louis Cardinals standings',
              'St. Louis Cardinals recent performance',
              'Ryan Helsley season statistics',
              'Ryan Helsley notable achievements',
              'St. Louis Cardinals upcoming games'
            ].map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* MLB Video Section */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Featured Highlight</h2>
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