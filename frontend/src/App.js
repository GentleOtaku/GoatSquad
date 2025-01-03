import React, { useState } from 'react';
import Stats from './components/Stats';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedVideo, setProcessedVideo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [videoStats, setVideoStats] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setProcessedVideo(null);
    setVideoStats(null);
    setUploadStatus(null);
  };

  const handleUpload = async () => {
    try {
      setIsProcessing(true);
      setUploadStatus('Uploading...');
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await fetch(`${BACKEND_URL}/video/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUploadStatus('Processing video...');
        const videoResponse = await fetch(`${BACKEND_URL}/video/analyze`, {
          method: 'POST',
        });
        
        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob();
          setProcessedVideo(URL.createObjectURL(videoBlob));
          setUploadStatus('Video processed successfully!');
          if (data.processed_stats) {
            setVideoStats(data.processed_stats);
          }
        } else {
          setUploadStatus('Failed to process video');
        }
      } else {
        setUploadStatus(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error:', error);
      setUploadStatus('Upload failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Color Inverter</h1>
          <p className="text-gray-600">Upload a video to invert its colors</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="flex-1 w-full">
              <input
                type="file"
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
              />
              <div className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                {selectedFile ? selectedFile.name : 'Choose video file...'}
              </div>
            </label>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isProcessing}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !selectedFile || isProcessing
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Process Video'}
            </button>
          </div>

          {uploadStatus && (
            <div className={`mt-4 p-4 rounded-lg ${
              uploadStatus.includes('failed')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>

        {videoStats && (
          <div className="mb-6">
            <Stats stats={videoStats} title="Processed Video Statistics" />
          </div>
        )}

        {processedVideo && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Processed Video</h3>
            <video
              controls
              className="w-full rounded-lg"
              src={processedVideo}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
