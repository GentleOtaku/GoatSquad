import React, { useState } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [results, setResults] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('video', selectedFile);

    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });
    // ... handle response ...
  };

  const handleAnalyze = async () => {
    const response = await fetch('/analyze', { method: 'POST' });
    const data = await response.json();
    setResults(data);
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <button onClick={handleAnalyze}>Analyze</button>
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