import React, { useState } from 'react';
import Stats from './components/Stats';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedVideo, setProcessedVideo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [videoStats, setVideoStats] = useState(null);

  // Get the backend URL based on environment
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setProcessedVideo(null);
    setVideoStats(null);
  };

  const handleUpload = async () => {
    try {
      setUploadStatus('Uploading...');
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await fetch(`${BACKEND_URL}/video/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setUploadStatus(data.message || data.error);
      
      // If upload was successful, get the processed video
      if (response.ok) {
        setUploadStatus('Processing video...');
        const videoResponse = await fetch(`${BACKEND_URL}/video/analyze`, {
          method: 'POST',
        });
        
        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob();
          setProcessedVideo(URL.createObjectURL(videoBlob));
          setUploadStatus('Video processed successfully!');
          
          // Set video statistics if available
          if (data.original_stats && data.processed_stats) {
            setVideoStats({
              original: data.original_stats,
              processed: data.processed_stats
            });
          }
        } else {
          setUploadStatus('Failed to process video');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setUploadStatus('Upload failed: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Video Color Inverter</h1>
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleFileChange}
          style={{ marginRight: '10px' }}
        />
        <button 
          onClick={handleUpload} 
          disabled={!selectedFile}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedFile ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedFile ? 'pointer' : 'not-allowed'
          }}
        >
          Upload and Process
        </button>
      </div>
      
      {uploadStatus && (
        <p style={{ 
          padding: '10px', 
          backgroundColor: uploadStatus.includes('failed') ? '#ffebee' : '#e8f5e9',
          borderRadius: '4px'
        }}>
          {uploadStatus}
        </p>
      )}
      
      {videoStats && (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
          <Stats stats={videoStats.original} title="Original Video" />
          <Stats stats={videoStats.processed} title="Processed Video" />
        </div>
      )}
      
      {processedVideo && (
        <div style={{ marginTop: '20px' }}>
          <h3>Processed Video:</h3>
          <video 
            controls 
            width="100%"
            src={processedVideo}
            style={{ 
              maxWidth: '100%',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
}

export default App;
