// Content script for YouTube pages
class YouTubeGeminiSubtitles {
  constructor() {
    this.subtitleContainer = null;
    this.isGenerating = false;
    this.currentSubtitles = [];
    this.init();
  }

  init() {
    this.createSubtitleContainer();
    this.setupMessageListener();
    console.log('YouTube Gemini Subtitles initialized');
  }

  createSubtitleContainer() {
    // Create subtitle container
    this.subtitleContainer = document.createElement('div');
    this.subtitleContainer.id = 'gemini-subtitles-container';
    this.subtitleContainer.innerHTML = `
      <div class="gemini-subtitles-header">
        <span>🤖 Gemini Subtitles</span>
        <div class="gemini-subtitles-controls">
          <button id="gemini-toggle-subtitles" title="Toggle Subtitles">👁️</button>
          <button id="gemini-download-subtitles" title="Download SRT">💾</button>
          <button id="gemini-close-subtitles" title="Close">✕</button>
        </div>
      </div>
      <div class="gemini-subtitles-content">
        <div class="gemini-subtitles-status">Ready to generate subtitles</div>
        <div class="gemini-subtitles-text"></div>
      </div>
    `;

    // Add event listeners
    this.subtitleContainer.querySelector('#gemini-toggle-subtitles').addEventListener('click', () => {
      this.toggleSubtitles();
    });

    this.subtitleContainer.querySelector('#gemini-download-subtitles').addEventListener('click', () => {
      this.downloadSubtitles();
    });

    this.subtitleContainer.querySelector('#gemini-close-subtitles').addEventListener('click', () => {
      this.hideSubtitleContainer();
    });

    document.body.appendChild(this.subtitleContainer);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'generateSubtitles') {
        this.generateSubtitles(request.apiKey, request.translationLanguage, request.selectedModel);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  async generateSubtitles(apiKey, translationLanguage, selectedModel) {
    console.log('Content: Starting subtitle generation');
    
    if (this.isGenerating) {
      this.showStatus('Already generating subtitles...', 'info');
      return;
    }

    this.isGenerating = true;
    this.showSubtitleContainer();
    this.showStatus('Extracting video information...', 'info');

    try {
      // Get video element
      const video = document.querySelector('video');
      if (!video) {
        throw new Error('No video found on this page. Please make sure you are on a YouTube video page.');
      }

      // Get video title and URL
      const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || 
                        document.querySelector('h1.title')?.textContent?.trim() || 
                        document.title || 'YouTube Video';
      const videoUrl = window.location.href;

      console.log('Content: Video found:', { title: videoTitle, duration: video.duration, url: videoUrl, translationLanguage });

      // Extract video information
      this.showStatus('Extracting video information...', 'info');
      const videoData = await this.extractVideoInfo(video);
      
      console.log('Content: Video info extracted:', {
        duration: videoData.duration,
        videoId: videoData.videoId,
        title: videoData.title
      });
      
      const statusMessage = translationLanguage ? 
        `Analyzing YouTube video content and generating subtitles with ${translationLanguage} translations...` : 
        `Analyzing YouTube video content and generating subtitles...`;
      this.showStatus(statusMessage, 'info');
      
      // Generate subtitles using Gemini via background script
      const subtitles = await this.transcribeWithGemini(videoData, apiKey, translationLanguage, selectedModel, videoTitle);
      
      console.log('Content: Subtitles received:', subtitles.length, 'items');
      console.log('Content: First subtitle sample:', subtitles[0]);
      
      this.currentSubtitles = subtitles;
      this.displaySubtitles(subtitles);
      this.showStatus('Subtitles generated successfully!', 'success');

    } catch (error) {
      console.error('Content: Error generating subtitles:', error);
      this.showStatus('Error: ' + error.message, 'error');
    } finally {
      this.isGenerating = false;
    }
  }

  async extractVideoInfo(video) {
    return new Promise((resolve, reject) => {
      try {
        // Get video description
        const videoDescription = document.querySelector('#description-text')?.textContent?.trim() || '';
        
        // Extract YouTube video ID from URL
        const videoId = this.extractVideoId(window.location.href);
        
        const videoInfo = {
          duration: video.duration,
          currentTime: video.currentTime,
          title: document.title,
          url: window.location.href,
          videoId: videoId,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          description: videoDescription,
          width: video.videoWidth,
          height: video.videoHeight
        };
        
        resolve(videoInfo);
      } catch (error) {
        reject(new Error('Failed to extract video info: ' + error.message));
      }
    });
  }

  extractVideoId(url) {
    // Extract video ID from various YouTube URL formats
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async transcribeWithGemini(audioData, apiKey, translationLanguage, selectedModel, videoTitle) {
    console.log('Content: Sending transcription request to background script');
    
    return new Promise((resolve, reject) => {
      // Send message to background script to handle the API call
      const message = {
        action: 'transcribeWithGemini',
        data: audioData,
        apiKey: apiKey,
        translationLanguage: translationLanguage,
        selectedModel: selectedModel,
        videoTitle: videoTitle
      };
      
      console.log('Content: Message to background:', { ...message, apiKey: '[HIDDEN]' });
      
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Content: Chrome runtime error:', chrome.runtime.lastError);
          reject(new Error('Extension communication error: ' + chrome.runtime.lastError.message));
          return;
        }
        
        if (!response) {
          console.error('Content: No response from background script');
          reject(new Error('No response from background script. Please try reloading the extension.'));
          return;
        }
        
        console.log('Content: Response from background:', { 
          success: response.success, 
          dataType: typeof response.data,
          dataLength: response.data?.length,
          isArray: Array.isArray(response.data),
          firstItem: response.data?.[0]
        });
        
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error from background script'));
        }
      });
    });
  }



  displaySubtitles(subtitles) {
    console.log('Content: displaySubtitles called with:', {
      type: typeof subtitles,
      isArray: Array.isArray(subtitles),
      length: subtitles?.length,
      firstItem: subtitles?.[0]
    });

    const subtitlesText = this.subtitleContainer.querySelector('.gemini-subtitles-text');
    subtitlesText.innerHTML = '';
    
    // Handle case where subtitles might be a string instead of array
    if (typeof subtitles === 'string') {
      console.error('Content: Received string instead of array. This should not happen. Raw text:', subtitles.substring(0, 200));
      subtitlesText.innerHTML = `<div class="subtitle-item">
        <div class="subtitle-text">Error: Received raw text instead of parsed subtitles.</div>
        <div class="subtitle-text">This indicates a parsing issue in the background script.</div>
        <div class="subtitle-text">Please check the browser console for details.</div>
      </div>`;
      return;
    }
    
    if (!Array.isArray(subtitles)) {
      console.error('Content: Subtitles is not an array:', subtitles);
      subtitlesText.innerHTML = `<div class="subtitle-item"><div class="subtitle-text">Error: Invalid subtitle format</div></div>`;
      return;
    }
    
    // Add debug info at the top
    const debugElement = document.createElement('div');
    debugElement.className = 'subtitle-item';
    debugElement.style.background = 'rgba(255, 0, 0, 0.1)';
    debugElement.style.border = '1px solid red';
    debugElement.innerHTML = `
      <div class="subtitle-text" style="font-size: 12px; color: #ff6b6b;">
        🐛 DEBUG INFO: Received ${subtitles.length} subtitle objects
        <br>First subtitle: ${JSON.stringify(subtitles[0], null, 2)}
      </div>
    `;
    subtitlesText.appendChild(debugElement);

    subtitles.forEach((subtitle, index) => {
      console.log(`Content: Processing subtitle ${index + 1}:`, subtitle);
      
      // Validate subtitle object structure
      if (!subtitle || typeof subtitle !== 'object') {
        console.error(`Content: Invalid subtitle object at index ${index}:`, subtitle);
        return;
      }
      
      if (!subtitle.startTime || !subtitle.endTime || !subtitle.text) {
        console.error(`Content: Missing required properties in subtitle ${index + 1}:`, subtitle);
        return;
      }
      
      const subtitleElement = document.createElement('div');
      subtitleElement.className = 'subtitle-item';
      
      // Format timing for better readability
      const formatTime = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') {
          return 'Unknown';
        }
        // Convert HH:MM:SS,mmm to more readable format
        return timeStr.replace(',', '.').replace(/^00:/, '');
      };
      
      const startTime = formatTime(subtitle.startTime);
      const endTime = formatTime(subtitle.endTime);
      
      // Safely get text content
      const text = subtitle.text || 'No text available';
      const translation = subtitle.translation || '';
      
      if (translation) {
        // Display both original and translation
        subtitleElement.innerHTML = `
          <div class="subtitle-timing">${startTime} → ${endTime}</div>
          <div class="subtitle-text original">${this.escapeHtml(text)}</div>
          <div class="subtitle-text translation">${this.escapeHtml(translation)}</div>
        `;
      } else {
        // Display only original text
        subtitleElement.innerHTML = `
          <div class="subtitle-timing">${startTime} → ${endTime}</div>
          <div class="subtitle-text">${this.escapeHtml(text)}</div>
        `;
      }
      
      subtitlesText.appendChild(subtitleElement);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  toggleSubtitles() {
    const content = this.subtitleContainer.querySelector('.gemini-subtitles-content');
    const isVisible = content.style.display !== 'none';
    content.style.display = isVisible ? 'none' : 'block';
    
    const toggleBtn = this.subtitleContainer.querySelector('#gemini-toggle-subtitles');
    toggleBtn.textContent = isVisible ? '👁️‍🗨️' : '👁️';
  }

  downloadSubtitles() {
    if (this.currentSubtitles.length === 0) {
      this.showStatus('No subtitles to download', 'error');
      return;
    }

    const srtContent = this.currentSubtitles.map(subtitle => {
      if (subtitle.translation) {
        // Include both original and translation in SRT format
        return `${subtitle.sequence}\n${subtitle.startTime} --> ${subtitle.endTime}\n${subtitle.text}\n${subtitle.translation}\n`;
      } else {
        // Standard SRT format
        return `${subtitle.sequence}\n${subtitle.startTime} --> ${subtitle.endTime}\n${subtitle.text}\n`;
      }
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini-subtitles.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus('Subtitles downloaded!', 'success');
  }

  showSubtitleContainer() {
    this.subtitleContainer.style.display = 'block';
  }

  hideSubtitleContainer() {
    this.subtitleContainer.style.display = 'none';
  }

  showStatus(message, type) {
    const statusElement = this.subtitleContainer.querySelector('.gemini-subtitles-status');
    statusElement.textContent = message;
    statusElement.className = `gemini-subtitles-status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        statusElement.textContent = 'Ready to generate subtitles';
        statusElement.className = 'gemini-subtitles-status';
      }, 3000);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeGeminiSubtitles();
  });
} else {
  new YouTubeGeminiSubtitles();
}