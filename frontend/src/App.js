import React, { useState } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [results, setResults] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await fetch('http://backend:5000/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setUploadStatus(data.message);
    } catch (error) {
      setUploadStatus('Upload failed: ' + error.message);
    }
  };

  const handleAnalyze = async () => {
    const response = await fetch('http://backend:5000/analyze', { method: 'POST' });
    const data = await response.json();
    setResults(data);
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <button onClick={handleAnalyze}>Analyze</button>
      {uploadStatus && <p>{uploadStatus}</p>}
      {results && (
        <div>
          <h3>Analysis Results:</h3>
          <p>Pitch Speed: {results.pitch_speed} mph</p>
          <p>Launch Angle: {results.launch_angle} degrees</p>
        </div>
      )}
    </div>
  );
}

export default App;
