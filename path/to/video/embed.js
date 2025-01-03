// MLB Video Embed Configuration
function createMLBVideoEmbed(videoId) {
    // Create container for MLB video
    const videoContainer = document.createElement('div');
    videoContainer.className = 'mlb-video-container';
    
    // Create iframe for MLB video
    const videoIframe = document.createElement('iframe');
    videoIframe.src = `https://www.mlb.com/video/embed/${videoId}`;
    videoIframe.width = '100%';
    videoIframe.height = '100%';
    videoIframe.frameBorder = '0';
    videoIframe.allowFullscreen = true;
    
    // Add iframe to container
    videoContainer.appendChild(videoIframe);
    
    return videoContainer;
} 