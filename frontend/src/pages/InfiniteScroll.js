import React, { useState, useEffect, useRef } from "react";

function RecommendationsPage() {
  const [videos, setVideos] = useState([]);
  const [start, setStart] = useState(1); // The batch-start: 1, 6, 11, etc.
  const [isLoading, setIsLoading] = useState(false);

  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // 1) Fetch 5 recommended videos starting at `startValue`.
  //    Then, for each video ID returned, fetch its details.
  const fetchRecommendations = async (startValue) => {
    setIsLoading(true);
    const token = localStorage.getItem("auth_token") || "";

    try {
      // a) Request the recommended video IDs
      const res = await fetch(
        `http://localhost:5001/recommend/vector?start=${startValue}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      // data.recommendations is assumed to be an array of 5 video IDs
      if (Array.isArray(data.recommendations)) {
        // b) For each ID, fetch the video details
        const detailsPromises = data.recommendations.map(async (videoId) => {
          try {
            const videoRes = await fetch(
              `http://localhost:5001/api/mlb/video?play_id=${videoId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            const videoData = await videoRes.json();
            if (videoData.success) {
              return { id: videoId, ...videoData };
            }
          } catch (err) {
            console.error("Error fetching details for", videoId, err);
          }
          return null;
        });

        const details = (await Promise.all(detailsPromises)).filter(Boolean);

        // c) Append the newly fetched videos
        setVideos((prev) => [...prev, ...details]);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2) Whenever `start` changes, load the next 5 videos
  useEffect(() => {
    fetchRecommendations(start);
  }, [start]);

  // 3) Use IntersectionObserver to detect when user scrolls near the bottom
  useEffect(() => {
    // Cleanup old observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        // If sentinel is visible and we're not already loading, load next batch
        if (entry.isIntersecting && !isLoading) {
          setStart((prev) => prev + 5);
        }
      },
      {
        root: null, // Observe the entire viewport
        rootMargin: "200px", // Trigger 200px before reaching the sentinel
      }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    // Cleanup on unmount or re-render
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading]); // Re-run if `isLoading` changes

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
      {videos.map((video) => (
        <div key={video.id} style={{ marginBottom: "20px" }}>
          <h3>{video.title}</h3>
          <p>{video.blurb}</p>
          <video
            controls
            width="100%"
            poster="https://via.placeholder.com/768x432.png?text=Video+Placeholder"
          >
            <source src={video.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      ))}

      {/* Show a loading indicator while fetching */}
      {isLoading && <p>Loading...</p>}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} style={{ height: "1px" }} />
    </div>
  );
}

export default RecommendationsPage;
