import React from 'react';

function Stats({ stats }) {
  if (!stats) return null;

  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: '20px',
      borderRadius: '8px',
      marginTop: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0 }}>Video Statistics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <StatItem label="Duration" value={`${stats.duration.toFixed(2)} seconds`} />
        <StatItem label="Frame Count" value={stats.frame_count} />
        <StatItem label="FPS" value={stats.fps.toFixed(1)} />
        <StatItem label="Resolution" value={`${stats.width}x${stats.height}`} />
        <StatItem label="File Size" value={formatFileSize(stats.file_size)} />
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ color: '#666', fontSize: '0.9em' }}>{label}</div>
      <div style={{ fontSize: '1.1em', fontWeight: 'bold', marginTop: '5px' }}>{value}</div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default Stats; 