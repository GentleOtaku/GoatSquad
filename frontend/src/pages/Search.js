import React, { useState, useEffect } from "react";
import PageTransition from "../components/PageTransition";
import { toast } from "react-hot-toast";

const fetchDescriptionFromGemini = async (title) => {
  try {
    const res = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/api/generate-blurb`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }
    );
    const data = await res.json();
    return data.success ? data.description : title;
  } catch (error) {
    console.error("Error fetching description:", error);
    return "Description unavailable.";
  }
};

function SearchRecommendations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const fetchSearchRecommendations = async (term) => {
    try {
      setIsSearching(true);
      const token = localStorage.getItem("auth_token") || "";
      const response = await fetch(
        `${
          process.env.REACT_APP_BACKEND_URL
        }/recommend/search?search=${encodeURIComponent(term)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success && Array.isArray(data.recommendations)) {
        const results = await Promise.all(
          data.recommendations.map(async (reel_id) => {
            const videoRes = await fetch(
              `${process.env.REACT_APP_BACKEND_URL}/api/mlb/video?play_id=${reel_id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            const videoData = await videoRes.json();
            const generated = await fetchDescriptionFromGemini(
              videoData.title || "MLB Highlight"
            );
            return {
              id: reel_id,
              type: "video",
              title: videoData.success
                ? `${videoData.title} (search)`
                : "Search Highlight",
              description: videoData.success
                ? generated
                : "Highlight from search",
              videoUrl: videoData.success ? videoData.video_url : null,
              upvotes: 0,
              downvotes: 0,
              comments: [],
            };
          })
        );
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Error fetching search recommendations:", err);
      toast.error("Error fetching search results");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    fetchSearchRecommendations(searchTerm);
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <h1 className="text-2xl font-bold mb-6">Search Recommendations</h1>
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center space-x-2 mb-6"
        >
          <input
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Search for MLB highlights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                       disabled:opacity-50 transition-colors"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>

        {searchResults.length === 0 && !isSearching && (
          <p className="text-gray-500">
            No results to display. Please enter a search term.
          </p>
        )}

        {searchResults.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6
                       transition-transform hover:-translate-y-0.5
                       hover:shadow-lg duration-300 ease-in-out"
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {item.title}
            </h3>
            <p className="mt-2 text-gray-700 dark:text-gray-300">
              {item.description}
            </p>
            {item.type === "video" && item.videoUrl && (
              <div className="mt-4">
                <video
                  controls
                  className="w-full rounded-lg"
                  poster="https://via.placeholder.com/768x432.png?text=Video+Placeholder"
                >
                  <source src={item.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        ))}
      </div>
    </PageTransition>
  );
}

export default SearchRecommendations;
