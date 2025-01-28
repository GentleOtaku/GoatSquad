import React, { useState, useEffect, useRef, useMemo } from "react";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../contexts/AuthContext";
import TranslatedText from "../components/TranslatedText";

// A helper function to simulate new data fetch:
function generateMockPosts(page = 1) {
  // For demo, we'll just replicate some posts, maybe with slight variations
  // In a real app, you'd fetch from an API endpoint with the page/offset.
  const baseItems = [
    {
      id: 1,
      type: "news",
      title: `Breaking: Big Trade Rumors (Page ${page})`,
      description: "Rumors are swirling about a potential blockbuster trade...",
      fullText: `Multiple sources indicate a major trade on page ${page}.`,
      upvotes: 10,
      downvotes: 2,
      comments: [
        {
          id: 101,
          author: "Mark Edwards",
          avatarUrl: "/images/default-avatar.jpg",
          title: "This rumor could shake up the league!",
          content: "Lots of buzz on page " + page,
        },
      ],
    },
    {
      id: 2,
      type: "video",
      title: `Amazing Homerun Highlight (Page ${page})`,
      description: "Check out this clutch homerun by the star player!",
      fullText: `A 2-run homer on page ${page}.`,
      videoUrl:
        "https://cuts.diamond.mlb.com/FORGE/2019/2019-04/22/abdef6c1-be0c15cf-0075faf5-csvm-diamondx64-asset_1280x720_59_4000K.mp4",
      upvotes: 25,
      downvotes: 1,
      comments: [
        {
          id: 201,
          author: "GrandSlam",
          avatarUrl: "/images/default-avatar.jpg",
          title: "Clutch Performance",
          content: "Unbelievable! That crack of the bat gave me chills.",
        },
      ],
    },
    {
      id: 3,
      type: "news",
      title: `Injury Update (Page ${page})`,
      description: "Star pitcher is expected to return soon...",
      fullText: `Good news on page ${page}: the ace is recovering.`,
      upvotes: 5,
      downvotes: 0,
      comments: [
        {
          id: 301,
          author: "FastballFreak",
          avatarUrl: "/images/default-avatar.jpg",
          title: "Crucial for the Postseason",
          content: "They need him healthy.",
        },
      ],
    },
  ];

  // In a real scenario, you'll have unique IDs for each item. Here,
  // we just produce new IDs so we don't clash with existing ones.
  return baseItems.map((item, index) => {
    return {
      ...item,
      id: parseInt(`${page}${index}`), // e.g. page=2 => 20,21,22
    };
  });
}

const generateFallbackDescription = (title) => {
  // Extract the most relevant part of the title
  const cleanTitle = title.replace(/\([^)]*\)/g, '').trim();
  return `Watch this exciting highlight featuring ${cleanTitle}`;
};

const fetchDescriptionFromGemini = async (title) => {
  try {
    if (!title) {
      console.warn("No title provided for description generation");
      return generateFallbackDescription(title || "this baseball moment");
    }

    // Keep track of retries
    let retries = 0;
    const maxRetries = 2;
    let lastError = null;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/generate-blurb`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: title.trim() }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error(`Error from generate-blurb (attempt ${retries + 1}):`, error);
          lastError = error;
          throw new Error(error.detail || "Failed to generate description");
        }

        const data = await response.json();
        if (data.success && data.description) {
          return data.description;
        }
        throw new Error("Invalid response format");
      } catch (error) {
        retries++;
        if (retries <= maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
          continue;
        }
        throw error;
      }
    }

    console.error("All retries failed:", lastError);
    return generateFallbackDescription(title);
  } catch (error) {
    console.error("Error fetching description:", error);
    return generateFallbackDescription(title);
  }
};

function RecommendationsPage() {
  // Replace the dummy data with user data from AuthContext
  const { user } = useAuth();

  // Get followed teams and players from user data
  const followedTeams = user?.preferences?.teams || [];
  const followedPlayers = user?.preferences?.players || [];

  // Placeholder upcoming events
  const upcomingEvents = [
    { id: 1, date: "Jan 20", event: "Spring Training Begins" },
    { id: 2, date: "Feb 14", event: "First Preseason Game" },
    { id: 3, date: "Mar 27", event: "Opening Day" },
  ];

  // Track all feed items
  const [feedItems, setFeedItems] = useState([]);
  // Page counter for "infinite scroll"
  const [page, setPage] = useState(1);
  // Whether we are currently fetching more
  const [loading, setLoading] = useState(false);

  // Track the post open in the modal (if any)
  const [expandedPost, setExpandedPost] = useState(null);
  // For new comment text
  const [newComment, setNewComment] = useState("");

  // Get current user from AuthContext
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [followRecommendations, setFollowRecommendations] = useState([]);
  const [modelRecommendations, setModelRecommendations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [followHasMore, setFollowHasMore] = useState(true);
  const [modelHasMore, setModelHasMore] = useState(true);

  // Add these state variables at the top with other states
  const [viewTimes, setViewTimes] = useState({});
  const [lastSubmittedRating, setLastSubmittedRating] = useState({});

  // -----------
  // FETCH LOGIC
  // ---------
  const fetchFollowRecommendations = async (pageNum) => {
    try {
      setIsLoadingMore(true);
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/recommend/follow?page=${pageNum}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      const data = await response.json();

      if (data.success) {
        const newRecommendations = await Promise.all(data.recommendations.map(async (rec) => {
          const videoResponse = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/mlb/video?play_id=${rec.reel_id}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
              }
            );
            const videoData = await videoResponse.json();

            const generatedDescription = await fetchDescriptionFromGemini(
              videoData.title
            );

            return {
              id: rec.reel_id,
              type: "video",
              title: videoData.success ? `${videoData.title} (follow)` : 'Followed Team/Player Highlight',
              description: videoData.success
                ? generatedDescription
                : "Highlight from your followed teams/players",
              videoUrl: videoData.success ? videoData.video_url : null,
              upvotes: 0,
              downvotes: 0,
              comments: [],
            };
          })
        );

        setFollowRecommendations((prev) => [...prev, ...newRecommendations]);
        setFollowHasMore(data.has_more);
      }
    } catch (err) {
      console.error("Error fetching follow recommendations:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const fetchModelRecommendations = async (pageNum) => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/recommend/predict?user_id=${user.id}&page=${pageNum}&per_page=5&table=user_ratings_db`
      );
      const data = await response.json();

      if (data.success && data.recommendations?.length > 0) {
        const newRecommendations = await Promise.all(
          data.recommendations.map(async (rec) => {
            if (!rec.reel_id) return null;

            try {
              const videoResponse = await fetch(
                `${process.env.REACT_APP_BACKEND_URL}/api/mlb/video?play_id=${rec.reel_id}`
              );
              const videoData = await videoResponse.json();
              const generatedDescription = await fetchDescriptionFromGemini(
                videoData.title || "Baseball highlight"
              );

              if (!videoData.success) return null;

              return {
                id: rec.reel_id,
                type: "video",
                title: `${videoData.title} (model)`,
                description: generatedDescription,
                videoUrl: videoData.video_url,
                upvotes: Math.floor(rec.predicted_score),
                downvotes: 0,
                comments: [],
              };
            } catch (err) {
              return null;
            }
          })
        );

        const validRecommendations = newRecommendations.filter(
          (rec) => rec !== null
        );
        if (validRecommendations.length > 0) {
          setModelRecommendations((prev) => [...prev, ...validRecommendations]);
          setModelHasMore(data.has_more);
          setIsModelLoaded(true);
        } else {
          setModelHasMore(false);
        }
      } else {
        setModelHasMore(false);
      }
    } catch (err) {
      setModelHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle infinite scroll
  const handleLoadMore = async () => {
    if (isLoadingMore) return;

    const nextPage = currentPage + 1;
    try {
      setIsLoadingMore(true);
      const isEvenPage = nextPage % 2 === 0;
      const pageNumber = Math.ceil(nextPage / 2);

      if (isEvenPage) {
        await fetchFollowRecommendations(pageNumber);
        setCurrentPage(nextPage);
      } else {
        setCurrentPage(nextPage);
        await fetchModelRecommendations(pageNumber);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    // Update the combined hasMore state based on both sources
    setHasMore(followHasMore || modelHasMore);
  }, [followHasMore, modelHasMore]);

  // Initial load
  useEffect(() => {
    fetchFollowRecommendations(1);
    fetchModelRecommendations(1);
  }, [user?.id]);

  // Combine recommendations
  const combinedRecommendations = useMemo(() => {
    if (!isModelLoaded) {
      return followRecommendations;
    }

    // When model loads, keep all existing followed recommendations
    // and alternate with model recommendations
    const combined = [];
    const pageSize = 5;
    const totalPages = Math.ceil(currentPage);

    for (let i = 0; i < totalPages; i++) {
      const startIdx = Math.floor(i / 2) * pageSize;
      const endIdx = startIdx + pageSize;

      if (i % 2 === 0) {
        // Add follow recommendations page
        const pageItems = followRecommendations.slice(startIdx, endIdx);
        if (pageItems.length > 0) {
          combined.push(...pageItems);
        }
      } else {
        // Add model recommendations page if they're loaded
        const modelItems = modelRecommendations.slice(startIdx, endIdx);
        if (modelItems.length > 0) {
          combined.push(...modelItems);
        }
      }
    }

    return combined;
  }, [isModelLoaded, followRecommendations, modelRecommendations, currentPage]);

  // Intersection Observer setup
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoadingMore && hasMore) {
        handleLoadMore();
      }
    }, options);

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [isLoadingMore, hasMore, currentPage]);

  // -----------
  // VOTING LOGIC
  // -----------
  const handleUpvote = (id) => {
    setFeedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item
      )
    );
  };

  const handleDownvote = (id) => {
    setFeedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, downvotes: item.downvotes + 1 } : item
      )
    );
  };

  // --------
  // MODAL LOGIC
  // --------
  // Open modal for a specific post
  const handleOpenModal = (post) => {
    setExpandedPost(post);
    setNewComment(""); // clear out any previous text
  };
  // Close modal
  const handleCloseModal = () => {
    setExpandedPost(null);
  };
  // Add a new comment
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setExpandedPost((prevPost) => {
      if (!prevPost) return null;

      const updatedComments = [
        ...prevPost.comments,
        {
          id: Date.now(),
          author: "You",
          avatarUrl: "/images/default-avatar.jpg",
          title: "My Response",
          content: newComment,
        },
      ];

      return { ...prevPost, comments: updatedComments };
    });
    setNewComment("");
  };

  // Add this function to calculate rating based on view time
  const calculateRating = (viewTime, duration) => {
    if (!viewTime || !duration) return 0;
    const percentage = viewTime / duration;
    if (percentage >= 0.9) return 5;
    if (percentage >= 0.7) return 4;
    if (percentage >= 0.5) return 3;
    if (percentage >= 0.3) return 2;
    if (percentage > 0) return 1;
    return 0;
  };

  // Add function to submit rating
  const submitRating = async (reelId, rating) => {
    if (!user?.id || lastSubmittedRating[reelId]) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/recommend/add?user_id=${user.id}&reel_id=${reelId}&rating=${rating}&table=user_ratings_db`
      );
      if (response.ok) {
        setLastSubmittedRating((prev) => ({ ...prev, [reelId]: true }));
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  // Add these handlers for video events
  const handleTimeUpdate = (itemId, event) => {
    const video = event.target;
    setViewTimes((prev) => ({
      ...prev,
      [itemId]: {
        viewTime: (prev[itemId]?.viewTime || 0) + 0.25, // Update every quarter second
        duration: video.duration,
      },
    }));
  };

  const handleVideoEnd = (itemId) => {
    if (viewTimes[itemId]) {
      const rating = calculateRating(
        viewTimes[itemId].viewTime,
        viewTimes[itemId].duration
      );
      submitRating(itemId, rating);
    }
  };

  const handleVideoSwitch = (currentItemId) => {
    if (viewTimes[currentItemId]) {
      const rating = calculateRating(
        viewTimes[currentItemId].viewTime,
        viewTimes[currentItemId].duration
      );
      submitRating(currentItemId, rating);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        {/* Grid layout: left sidebar, main feed, right sidebar */}
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT SIDEBAR */}
          <aside className="col-span-3 hidden lg:block relative">
            <div className="fixed w-[280px] left-[calc((100vw-80rem)/2+1.5rem)] space-y-6 top-24">
              {/* Followed Teams */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-all">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  <TranslatedText text="Followed Teams" />
                </h2>
                {followedTeams.length > 0 ? (
                  followedTeams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0 border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-gray-800 dark:text-gray-200">
                        <TranslatedText text={team.name} />
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    <TranslatedText text="No teams followed." />
                  </p>
                )}
              </div>

              {/* Followed Players */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-all">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  <TranslatedText text="Followed Players" />
                </h2>
                {followedPlayers.length > 0 ? (
                  followedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0 border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-gray-800 dark:text-gray-200">
                        <TranslatedText text={player.fullName} />
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    <TranslatedText text="No players followed." />
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* MAIN FEED */}
          <main className="col-span-12 lg:col-span-6 space-y-6">
            {!isModelLoaded && (
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
                <p className="text-blue-700 dark:text-blue-200">
                  Loading personalized recommendations... Meanwhile, enjoy
                  highlights from your favorite teams and players!
                </p>
              </div>
            )}

            {combinedRecommendations.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-4
                           transition-transform transform hover:-translate-y-0.5
                           hover:shadow-lg duration-300 ease-in-out"
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  <TranslatedText text={item.title} />
                </h3>
                <p className="mt-2 text-gray-700 dark:text-gray-300">
                  <TranslatedText text={item.description} />
                </p>

                {/* If it's a video, show the video player */}
                {item.type === "video" && item.videoUrl && (
                  <div className="mt-4">
                    <video
                      controls
                      className="w-full rounded-lg"
                      poster="https://via.placeholder.com/768x432.png?text=Video+Placeholder"
                      onTimeUpdate={(e) => handleTimeUpdate(item.id, e)}
                      onEnded={() => handleVideoEnd(item.id)}
                      onPlay={() => handleVideoSwitch(item.id)}
                    >
                      <source src={item.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* Voting buttons */}
                <div className="mt-4 flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                  <button
                    onClick={() => handleUpvote(item.id)}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    aria-label={`Upvote ${item.title}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    <span>{item.upvotes}</span>
                  </button>
                  <button
                    onClick={() => handleDownvote(item.id)}
                    className="flex items-center space-x-1 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    aria-label={`Downvote ${item.title}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    <span>{item.downvotes}</span>
                  </button>
                </div>

                {/* Button to read the full post (opens modal) */}
                <div className="mt-4">
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="text-sm text-indigo-600 hover:text-indigo-800
                               dark:text-indigo-400 dark:hover:text-indigo-300
                               transition-colors"
                  >
                    <TranslatedText text="Read More" /> &rarr;
                  </button>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoadingMore && (
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Loading more content...
                </p>
              </div>
            )}

            {/* Sentinel element for infinite scroll */}
            <div ref={sentinelRef} className="h-10" />
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="col-span-3 hidden lg:block relative">
            <div className="fixed w-[280px] right-[calc((100vw-80rem)/2+1.5rem)] top-24">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-all">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  <TranslatedText text="Upcoming Events" />
                </h2>
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="py-2 border-b last:border-b-0 border-gray-200 dark:border-gray-700"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100 mr-2">
                      {event.date}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      <TranslatedText text={event.event} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* MODAL for expanded post */}
      {expandedPost && (
        <div
          className="fixed inset-0 z-10 w-screen overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-500/75 transition-opacity duration-300"
            aria-hidden="true"
            onClick={handleCloseModal}
          />

          {/* Modal Panel */}
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center">
            <div
              className="relative w-full max-w-4xl transform overflow-hidden
                         rounded-lg bg-white px-4 pb-8 pt-6 shadow-2xl transition-all
                         duration-300 dark:bg-gray-800 sm:px-6 sm:pt-8"
            >
              {/* Close Button */}
              <button
                type="button"
                className="absolute right-4 top-4 text-gray-400
                           hover:text-gray-500 dark:hover:text-gray-300
                           transition-colors"
                onClick={handleCloseModal}
              >
                <span className="sr-only">
                  <TranslatedText text="Close" />
                </span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Modal Content */}
              <div className="mt-2 text-left">
                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  <TranslatedText text={expandedPost.title} />
                </h2>

                {/* Video if applicable */}
                {expandedPost.type === "video" && expandedPost.videoUrl && (
                  <div className="mb-4">
                    <video
                      controls
                      className="w-full rounded-lg"
                      poster="https://via.placeholder.com/768x432.png?text=Video+Placeholder"
                    >
                      <source src={expandedPost.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* Full text */}
                <p className="text-gray-700 dark:text-gray-200 whitespace-pre-line">
                  <TranslatedText text={expandedPost.fullText} />
                </p>

                {/* Comments section */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    <TranslatedText text="Comments" />
                  </h3>

                  {expandedPost.comments && expandedPost.comments.length > 0 ? (
                    <ul className="space-y-8">
                      {expandedPost.comments.map((comment) => (
                        <li
                          key={comment.id}
                          className="flex flex-col sm:flex-row sm:space-x-4"
                        >
                          {/* Avatar */}
                          <div className="shrink-0 mb-2 sm:mb-0">
                            <img
                              className="h-12 w-12 rounded-full object-cover"
                              src={
                                comment.avatarUrl ||
                                "/images/default-avatar.jpg"
                              }
                              alt={comment.author}
                            />
                          </div>

                          {/* Main comment content */}
                          <div>
                            {/* Name */}
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {comment.author}
                            </p>

                            {/* Title (optional) */}
                            {comment.title && (
                              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                                {comment.title}
                              </p>
                            )}

                            {/* Body/content */}
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                              {comment.content}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <TranslatedText text="No comments yet." />
                    </p>
                  )}
                </div>

                {/* Response form */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    <TranslatedText text="Add Your Comment" />
                  </h4>
                  <form onSubmit={handleAddComment} className="space-y-2">
                    <textarea
                      className="w-full rounded-md border border-gray-300
                                 dark:border-gray-700 bg-white dark:bg-gray-700
                                 px-3 py-2 text-sm text-gray-800 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500
                                 dark:focus:ring-blue-400"
                      rows={3}
                      placeholder="Write your thoughts..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2
                                 text-sm font-medium text-white hover:bg-blue-700
                                 dark:bg-blue-500 dark:hover:bg-blue-600
                                 focus:outline-none focus:ring-2 focus:ring-blue-500
                                 dark:focus:ring-blue-400 transition-colors"
                    >
                      <TranslatedText text="Submit" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

export default RecommendationsPage;
