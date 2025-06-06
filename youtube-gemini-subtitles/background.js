// Background script for the Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Gemini Subtitles extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (this is handled automatically by manifest.json)
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'generate-subtitles') {
    console.log('Background: Keyboard shortcut triggered');
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('youtube.com/watch')) {
      console.log('Background: Not on YouTube video page');
      return;
    }
    
    // Get saved settings
    const settings = await chrome.storage.sync.get(['apiKey', 'translationLanguage', 'selectedModel']);
    
    if (!settings.apiKey) {
      console.log('Background: No API key found, opening popup');
      // Open popup if no API key is set
      chrome.action.openPopup();
      return;
    }
    
    // Send message to content script to generate subtitles
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'generateSubtitles',
        apiKey: settings.apiKey,
        translationLanguage: settings.translationLanguage || '',
        selectedModel: settings.selectedModel || 'gemini-2.0-flash'
      });
      console.log('Background: Subtitle generation triggered via keyboard shortcut');
    } catch (error) {
      console.error('Background: Error triggering subtitle generation:', error);
    }
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title
        });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'transcribeWithGemini') {
    transcribeWithGemini(request.data, request.apiKey, request.translationLanguage, request.selectedModel, request.videoTitle)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

// Function to handle Gemini API calls from background script
async function transcribeWithGemini(videoData, apiKey, translationLanguage, selectedModel, videoTitle) {
  console.log('Background: Starting transcription with Gemini');
  console.log('Background: Video data:', { 
    title: videoTitle, 
    duration: videoData.duration, 
    model: selectedModel, 
    translationLanguage,
    videoId: videoData.videoId,
    youtubeUrl: videoData.youtubeUrl
  });
  
  try {
    // Validate inputs
    if (!apiKey || !apiKey.trim()) {
      throw new Error('API key is required');
    }
    
    if (!selectedModel || !selectedModel.trim()) {
      throw new Error('Model selection is required');
    }
    
    if (!videoData.videoId) {
      throw new Error('Could not extract YouTube video ID from URL');
    }
    
    const videoDescription = videoData.description || '';
    const videoLength = Math.floor(videoData.duration) || 60;
    const youtubeUrl = videoData.youtubeUrl;
    
    console.log('Background: Processing YouTube video:', youtubeUrl);
    
    const hasTranslation = translationLanguage && translationLanguage.trim();
    
    // Create multimodal prompt with YouTube URL using file_uri
    const parts = [];
    
    // Add text prompt for subtitle generation
    let textPrompt;
    if (hasTranslation) {
      textPrompt = `Please analyze this YouTube video and generate accurate subtitles based on the actual video content.

Video Details:
Title: "${videoTitle}"
Description: "${videoDescription}"
Duration: ${videoLength} seconds

Generate subtitles in SRT format with appropriate timing based on the actual video content. Create subtitles in the video's original language first, then provide translations in ${translationLanguage}.

For each subtitle entry, provide BOTH the original text AND the translation in this format:
[sequence number]
[start time] --> [end time]
[original subtitle text]
[${translationLanguage} translation]

Example format:
1
00:00:00,000 --> 00:00:03,000
Welcome to this amazing video!
¡Bienvenidos a este increíble video!

2
00:00:03,000 --> 00:00:06,000
Today we'll be exploring...
Hoy vamos a explorar...

Include approximately ${Math.max(10, Math.floor(videoLength / 6))} subtitle segments with realistic timing based on the actual video analysis.`;
    } else {
      textPrompt = `Please analyze this YouTube video and generate accurate subtitles based on the actual video content.

Video Details:
Title: "${videoTitle}"
Description: "${videoDescription}"
Duration: ${videoLength} seconds

Generate subtitles in SRT format with appropriate timing based on the actual video content. Create subtitles in the video's original language (detect from the actual video content).

Format each subtitle as:
[sequence number]
[start time] --> [end time]
[subtitle text in original language]

Example format:
1
00:00:00,000 --> 00:00:03,000
Welcome to this amazing video!

2
00:00:03,000 --> 00:00:06,000
Today we'll be exploring...

Include approximately ${Math.max(10, Math.floor(videoLength / 6))} subtitle segments with realistic timing based on the actual video analysis.`;
    }
    
    // Add text prompt first, then YouTube URL as fileData
    parts.push({ text: textPrompt });
    parts.push({
      fileData: {
        fileUri: youtubeUrl
      }
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    console.log('Background: Making API request to:', apiUrl.replace(apiKey, '[API_KEY_HIDDEN]'));

    const requestBody = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Background: API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Background: Gemini API Error Response:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        const errorMessage = errorData.error?.message || errorText;
        throw new Error(`API Error (${response.status}): ${errorMessage}`);
      } catch (parseError) {
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('Background: Gemini API Response received, candidates:', data.candidates?.length || 0);
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('Background: No generated text in response:', data);
      throw new Error('No content generated by Gemini API. Please try again.');
    }

    console.log('Background: Generated text length:', generatedText.length);

    // Parse the SRT format
    const subtitles = parseSRTFormat(generatedText, hasTranslation);
    console.log('Background: Parsed subtitles count:', subtitles.length);
    
    if (subtitles.length === 0) {
      throw new Error('Failed to parse generated subtitles. Please try again.');
    }
    
    return subtitles;

  } catch (error) {
    console.error('Background: Transcription error:', error);
    
    if (error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to Gemini API. Please check your internet connection.');
    } else if (error.message.includes('API_KEY_INVALID')) {
      throw new Error('Invalid API key. Please check your Gemini API key in the extension settings.');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      throw new Error('API quota exceeded. Please check your Gemini API usage limits.');
    } else {
      throw new Error('Transcription failed: ' + error.message);
    }
  }
}



// Function to parse SRT format
function parseSRTFormat(srtText, hasTranslation = false) {
  const subtitles = [];
  const blocks = srtText.split(/\n\s*\n/).filter(block => block.trim());
  
  blocks.forEach(block => {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const sequence = parseInt(lines[0]);
      const timeLine = lines[1];
      
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (timeMatch) {
        if (hasTranslation && lines.length >= 4) {
          // Format: sequence, time, original text, translation
          const originalText = lines[2].trim();
          const translationText = lines[3].trim();
          
          subtitles.push({
            sequence,
            startTime: timeMatch[1],
            endTime: timeMatch[2],
            text: originalText,
            translation: translationText
          });
        } else {
          // Standard format: sequence, time, text
          const text = lines.slice(2).join('\n').trim();
          
          subtitles.push({
            sequence,
            startTime: timeMatch[1],
            endTime: timeMatch[2],
            text: text
          });
        }
      }
    }
  });
  
  return subtitles;
}

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);
});