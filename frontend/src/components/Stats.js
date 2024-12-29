import React from 'react';

function Stats({ stats, title }) {
  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title || 'Video Statistics'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-lg font-semibold text-gray-900 mt-1">{value}</div>
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