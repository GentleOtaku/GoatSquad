import React, { useState } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedVideo, setProcessedVideo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setProcessedVideo(null);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setUploadStatus(data.message);
      
      // If upload was successful, get the processed video
      if (response.ok) {
        const videoResponse = await fetch('http://localhost:5000/analyze', {
          method: 'POST',
        });
        
        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob();
          setProcessedVideo(URL.createObjectURL(videoBlob));
        }
      }
    } catch (error) {
      setUploadStatus('Upload failed: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div>
        <input type="file" accept="video/*" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={!selectedFile}>
          Upload and Process
        </button>
      </div>
      
      {uploadStatus && <p>{uploadStatus}</p>}
      
      {processedVideo && (
        <div style={{ marginTop: '20px' }}>
          <h3>Processed Video:</h3>
          <video 
            controls 
            width="500"
            src={processedVideo}
            style={{ maxWidth: '100%' }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
}

export default App;
