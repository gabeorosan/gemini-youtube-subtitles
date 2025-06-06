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
      const audioData = await this.extractVideoInfo(video);
      
      console.log('Content: Video info extracted:', audioData);
      
      const statusMessage = translationLanguage ? 
        `Generating subtitles with ${translationLanguage} translations...` : 
        'Generating subtitles in original language...';
      this.showStatus(statusMessage, 'info');
      
      // Generate subtitles using Gemini via background script
      const subtitles = await this.transcribeWithGemini(audioData, apiKey, translationLanguage, selectedModel, videoTitle);
      
      console.log('Content: Subtitles received:', subtitles.length, 'items');
      
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
        
        // For this demo, we'll use video metadata instead of actual audio processing
        const videoInfo = {
          duration: video.duration,
          currentTime: video.currentTime,
          title: document.title,
          url: window.location.href,
          description: videoDescription
        };
        
        resolve(videoInfo);
      } catch (error) {
        reject(new Error('Failed to extract video info: ' + error.message));
      }
    });
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
        
        console.log('Content: Response from background:', { success: response.success, dataLength: response.data?.length });
        
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error from background script'));
        }
      });
    });
  }



  displaySubtitles(subtitles) {
    const subtitlesText = this.subtitleContainer.querySelector('.gemini-subtitles-text');
    subtitlesText.innerHTML = '';
    
    subtitles.forEach(subtitle => {
      const subtitleElement = document.createElement('div');
      subtitleElement.className = 'subtitle-item';
      
      if (subtitle.translation) {
        // Display both original and translation
        subtitleElement.innerHTML = `
          <div class="subtitle-timing">${subtitle.startTime} → ${subtitle.endTime}</div>
          <div class="subtitle-text original">${subtitle.text}</div>
          <div class="subtitle-text translation">${subtitle.translation}</div>
        `;
      } else {
        // Display only original text
        subtitleElement.innerHTML = `
          <div class="subtitle-timing">${subtitle.startTime} → ${subtitle.endTime}</div>
          <div class="subtitle-text">${subtitle.text}</div>
        `;
      }
      
      subtitlesText.appendChild(subtitleElement);
    });
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