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

IMPORTANT: Generate subtitles in proper SRT format ONLY. Do not include any explanatory text, markdown formatting, or code blocks. Start directly with the subtitle entries.

Create subtitles in the video's original language first, then provide translations in ${translationLanguage}.

For each subtitle entry, use EXACTLY this format:
[sequence number]
[start time] --> [end time]
[original subtitle text]
[${translationLanguage} translation]

Example:
1
00:00:00,000 --> 00:00:03,000
Welcome to this amazing video!
¡Bienvenidos a este increíble video!

2
00:00:03,000 --> 00:00:06,000
Today we'll be exploring...
Hoy vamos a explorar...

Generate approximately ${Math.max(10, Math.floor(videoLength / 6))} subtitle segments with realistic timing. Use the exact time format shown (HH:MM:SS,mmm --> HH:MM:SS,mmm).`;
    } else {
      textPrompt = `Please analyze this YouTube video and generate accurate subtitles based on the actual video content.

Video Details:
Title: "${videoTitle}"
Description: "${videoDescription}"
Duration: ${videoLength} seconds

IMPORTANT: Generate subtitles in proper SRT format ONLY. Do not include any explanatory text, markdown formatting, or code blocks. Start directly with the subtitle entries.

Create subtitles in the video's original language (detect from the actual video content).

For each subtitle entry, use EXACTLY this format:
[sequence number]
[start time] --> [end time]
[subtitle text in original language]

Example:
1
00:00:00,000 --> 00:00:03,000
Welcome to this amazing video!

2
00:00:03,000 --> 00:00:06,000
Today we'll be exploring...

Generate approximately ${Math.max(10, Math.floor(videoLength / 6))} subtitle segments with realistic timing. Use the exact time format shown (HH:MM:SS,mmm --> HH:MM:SS,mmm).`;
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
    console.log('Background: Generated text preview:', generatedText.substring(0, 500));

    // Parse the SRT format
    const subtitles = parseSRTFormat(generatedText, hasTranslation);
    console.log('Background: Parsed subtitles count:', subtitles.length);
    
    if (subtitles.length === 0) {
      console.error('Background: Failed to parse subtitles. Generated text:', generatedText);
      
      // Try to create basic subtitles from the generated text as fallback
      const fallbackSubtitles = createFallbackSubtitles(generatedText, videoLength, hasTranslation);
      if (fallbackSubtitles.length > 0) {
        console.log('Background: Using fallback subtitles:', fallbackSubtitles.length);
        return fallbackSubtitles;
      }
      
      throw new Error('Failed to parse generated subtitles. The AI may have generated content in an unexpected format. Please try again.');
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



// Function to parse SRT format with improved flexibility
function parseSRTFormat(srtText, hasTranslation = false) {
  const subtitles = [];
  
  console.log('Background: Parsing SRT text, length:', srtText.length);
  
  // Try to extract SRT content if it's wrapped in markdown code blocks
  let cleanText = srtText;
  const codeBlockMatch = srtText.match(/```(?:srt)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleanText = codeBlockMatch[1];
    console.log('Background: Extracted from code block');
  }
  
  // Split into blocks - try different separators
  let blocks = cleanText.split(/\n\s*\n/).filter(block => block.trim());
  
  if (blocks.length === 0) {
    // Try splitting by double newlines with different whitespace
    blocks = cleanText.split(/\n\n+/).filter(block => block.trim());
  }
  
  if (blocks.length === 0) {
    // Try splitting by sequence numbers
    blocks = cleanText.split(/(?=^\d+$)/m).filter(block => block.trim());
  }
  
  console.log('Background: Found', blocks.length, 'blocks to parse');
  
  blocks.forEach((block, index) => {
    const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line);
    console.log(`Background: Block ${index + 1}:`, lines);
    
    if (lines.length >= 3) {
      // Try to find sequence number (might not be first line)
      let sequenceIndex = 0;
      let sequence = parseInt(lines[0]);
      
      // If first line isn't a number, look for it
      if (isNaN(sequence)) {
        for (let i = 0; i < lines.length; i++) {
          const num = parseInt(lines[i]);
          if (!isNaN(num) && lines[i].match(/^\d+$/)) {
            sequence = num;
            sequenceIndex = i;
            break;
          }
        }
      }
      
      // Find time line (look for timestamp pattern)
      let timeLineIndex = -1;
      let timeMatch = null;
      
      for (let i = sequenceIndex; i < lines.length; i++) {
        // More flexible time matching
        timeMatch = lines[i].match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{3})\s*[-–—>]+\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{3})/);
        if (timeMatch) {
          timeLineIndex = i;
          break;
        }
      }
      
      if (timeMatch && timeLineIndex !== -1) {
        // Normalize time format (convert dots to commas)
        const startTime = timeMatch[1].replace('.', ',');
        const endTime = timeMatch[2].replace('.', ',');
        
        // Get text lines (everything after the time line)
        const textLines = lines.slice(timeLineIndex + 1).filter(line => line.trim());
        
        if (textLines.length > 0) {
          if (hasTranslation && textLines.length >= 2) {
            // Format: original text, translation
            const originalText = textLines[0].trim();
            const translationText = textLines[1].trim();
            
            subtitles.push({
              sequence: sequence || subtitles.length + 1,
              startTime: startTime,
              endTime: endTime,
              text: originalText,
              translation: translationText
            });
          } else {
            // Standard format: all remaining lines as text
            const text = textLines.join('\n').trim();
            
            subtitles.push({
              sequence: sequence || subtitles.length + 1,
              startTime: startTime,
              endTime: endTime,
              text: text
            });
          }
        }
      }
    }
  });
  
  console.log('Background: Successfully parsed', subtitles.length, 'subtitles');
  return subtitles;
}

// Create fallback subtitles when SRT parsing fails
function createFallbackSubtitles(text, videoDuration, hasTranslation = false) {
  const subtitles = [];
  
  try {
    // Split text into sentences or meaningful chunks
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return [];
    }
    
    const duration = videoDuration || 60;
    const intervalPerSentence = Math.max(3, duration / sentences.length);
    
    sentences.forEach((sentence, index) => {
      const startTime = formatTime(index * intervalPerSentence);
      const endTime = formatTime((index + 1) * intervalPerSentence);
      
      subtitles.push({
        sequence: index + 1,
        startTime: startTime,
        endTime: endTime,
        text: sentence.trim()
      });
    });
    
    console.log('Background: Created', subtitles.length, 'fallback subtitles');
    return subtitles;
  } catch (error) {
    console.error('Background: Error creating fallback subtitles:', error);
    return [];
  }
}

// Format seconds to SRT time format
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);
});