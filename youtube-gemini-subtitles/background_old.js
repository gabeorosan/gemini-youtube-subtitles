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
    
    // Add text prompt for subtitle generation using JSON structured output
    let textPrompt;
    if (hasTranslation) {
      textPrompt = `Analyze this YouTube video and generate accurate subtitles with ${translationLanguage} translations.

Video: "${videoTitle}" (${Math.floor(videoLength / 60)}:${(videoLength % 60).toString().padStart(2, '0')})

Generate approximately ${Math.max(10, Math.floor(videoLength / 6))} subtitle segments with realistic timing. Each subtitle should be 2-6 seconds long with natural speech breaks.

Provide both the original text and ${translationLanguage} translation for each subtitle segment.`;
    } else {
      textPrompt = `Analyze this YouTube video and generate accurate subtitles.

Video: "${videoTitle}" (${Math.floor(videoLength / 60)}:${(videoLength % 60).toString().padStart(2, '0')})

Generate approximately ${Math.max(10, Math.floor(videoLength / 6))} subtitle segments with realistic timing. Each subtitle should be 2-6 seconds long with natural speech breaks.`;
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

    // Define schema based on whether translation is requested
    const baseSchema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          sequence: {
            type: "integer",
            description: "Sequential number starting from 1"
          },
          startTime: {
            type: "string",
            pattern: "^\\d{2}:\\d{2}:\\d{2},\\d{3}$",
            description: "Start time in HH:MM:SS,mmm format (e.g., 00:01:23,500)"
          },
          endTime: {
            type: "string", 
            pattern: "^\\d{2}:\\d{2}:\\d{2},\\d{3}$",
            description: "End time in HH:MM:SS,mmm format (e.g., 00:01:26,800)"
          },
          text: {
            type: "string",
            description: "Original subtitle text"
          }
        },
        required: ["sequence", "startTime", "endTime", "text"],
        additionalProperties: false
      }
    };

    // Add translation field if needed
    if (translationLanguage && translationLanguage !== 'none') {
      baseSchema.items.properties.translation = {
        type: "string",
        description: "Translated subtitle text"
      };
      baseSchema.items.required.push("translation");
    }

    const requestBody = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: baseSchema
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

    // With structured output, try direct JSON parsing first
    let subtitles = [];
    
    try {
      // With structured output, the response should be valid JSON
      subtitles = JSON.parse(generatedText);
      
      if (!Array.isArray(subtitles)) {
        throw new Error('Response is not an array');
      }
      
      console.log('Background: Structured JSON parsing successful:', subtitles.length, 'subtitles');
      
    } catch (structuredError) {
      console.log('Background: Structured JSON parsing failed:', structuredError.message);
      console.log('Background: Falling back to multi-strategy parsing');
      
      try {
        // First try JSON format
        subtitles = parseJSONFormat(generatedText, hasTranslation);
        console.log('Background: JSON parsing successful:', subtitles.length, 'subtitles');
      } catch (jsonError) {
        console.log('Background: JSON parsing failed:', jsonError.message);
        
        try {
          // Fall back to SRT format parsing
          subtitles = parseSRTFormat(generatedText, hasTranslation);
          console.log('Background: SRT parsing successful:', subtitles.length, 'subtitles');
        } catch (srtError) {
          console.log('Background: SRT parsing also failed:', srtError.message);
          
          // Try to extract subtitles from malformed text
          subtitles = parseFlexibleFormat(generatedText, hasTranslation);
          console.log('Background: Flexible parsing result:', subtitles.length, 'subtitles');
        }
      }
    }

    if (subtitles.length === 0) {
      console.error('Background: All parsing methods failed. Generated text:', generatedText);
      
      // Create basic fallback subtitles
      const fallbackSubtitles = createFallbackSubtitles(generatedText, videoLength, hasTranslation);
      if (fallbackSubtitles.length > 0) {
        console.log('Background: Using fallback subtitles:', fallbackSubtitles.length);
        return fallbackSubtitles;
      }
      
      throw new Error('Failed to parse generated subtitles. The AI may have generated content in an unexpected format. Please try again.');
    }
    
    console.log('Background: Returning subtitles array:', {
      type: typeof subtitles,
      isArray: Array.isArray(subtitles),
      length: subtitles.length,
      firstItem: subtitles[0]
    });
    
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



// Function to parse JSON format with fallback to SRT
function parseJSONFormat(responseText, hasTranslation = false) {
  console.log('Background: Attempting to parse JSON format');
  
  try {
    // First, try to extract JSON from the response
    let jsonText = responseText.trim();
    
    // Check for the specific malformed case where response starts with a partial JSON object
    // containing nested JSON in the text field
    if (jsonText.startsWith('{ "sequence": 1') && jsonText.includes('```json')) {
      console.log('Background: Detected malformed response with nested JSON, extracting...');
      const nestedJsonMatch = jsonText.match(/```json\s*(\[[\s\S]*)/);
      if (nestedJsonMatch) {
        jsonText = nestedJsonMatch[1];
        console.log('Background: Extracted nested JSON from malformed response');
      }
    }
    
    // Remove any markdown code blocks if present - be more aggressive
    if (jsonText.includes('```')) {
      // Try multiple patterns for code blocks
      let jsonMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (!jsonMatch) {
        // Try without the closing ```
        jsonMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*)/);
      }
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        console.log('Background: Extracted from code block');
      }
    }
    
    // Try to find the most complete JSON array in the text
    const jsonArrayMatches = jsonText.match(/\[[\s\S]*\]/g);
    if (jsonArrayMatches && jsonArrayMatches.length > 0) {
      // Take the longest match (most complete)
      jsonText = jsonArrayMatches.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      );
    }
    
    // Clean up common JSON issues
    jsonText = jsonText
      .replace(/,\s*\]/g, ']')  // Remove trailing commas
      .replace(/,\s*\}/g, '}')  // Remove trailing commas in objects
      .trim();
    
    // If JSON appears to be truncated, try to fix it
    if (!jsonText.endsWith(']') && !jsonText.endsWith('}')) {
      console.log('Background: JSON appears truncated, attempting to fix');
      
      // Find the last complete object
      const lastCompleteObject = jsonText.lastIndexOf('}');
      if (lastCompleteObject !== -1) {
        jsonText = jsonText.substring(0, lastCompleteObject + 1) + ']';
      }
    }
    
    console.log('Background: Cleaned JSON text:', jsonText.substring(0, 300));
    
    // Parse the JSON
    const subtitlesArray = JSON.parse(jsonText);
    
    if (!Array.isArray(subtitlesArray)) {
      throw new Error('Response is not an array');
    }
    
    // Validate and normalize the subtitle objects
    const validSubtitles = [];
    for (let i = 0; i < subtitlesArray.length; i++) {
      const subtitle = subtitlesArray[i];
      
      if (!subtitle || typeof subtitle !== 'object') {
        console.warn(`Background: Invalid subtitle object at index ${i}:`, subtitle);
        continue;
      }
      
      // Handle nested JSON in text field (common Gemini issue)
      let text = subtitle.text;
      if (typeof text === 'string' && text.includes('```json')) {
        console.log('Background: Found nested JSON in text field, this indicates malformed response');
        console.log('Background: Problematic text field:', text.substring(0, 200));
        
        // This is a sign that Gemini returned malformed JSON where the entire JSON array
        // is embedded in the first subtitle's text field. Extract and re-parse.
        const nestedMatch = text.match(/```json\s*(\[[\s\S]*)/);
        if (nestedMatch) {
          console.log('Background: Extracting nested JSON and re-parsing entire response');
          // Re-parse the entire response using the nested JSON
          return parseJSONFormat(nestedMatch[1], hasTranslation);
        }
        
        // If we can't extract nested JSON, clean the text field
        text = text.replace(/```json[\s\S]*?```/g, '').trim();
        if (!text) {
          console.warn('Background: Text field became empty after cleaning nested JSON');
          continue; // Skip this subtitle
        }
      }
      
      // Validate required properties
      if (!subtitle.startTime || !subtitle.endTime || !text) {
        console.warn(`Background: Missing required properties in subtitle ${i + 1}:`, subtitle);
        continue;
      }
      
      // Normalize time format
      const normalizeTime = (timeStr) => {
        if (!timeStr) return '00:00:00,000';
        
        // Handle various time formats
        let normalized = timeStr.toString().replace(/\./g, ',');
        
        // Check if this looks like HH:MM:SSS format (where SSS should be SS.S)
        const hmmSssPattern = /^(\d{1,2}):(\d{2}):(\d{3})$/;
        const hmmSssMatch = normalized.match(hmmSssPattern);
        
        if (hmmSssMatch) {
          const [, hours, minutes, sssValue] = hmmSssMatch;
          // Convert SSS to SS,mmm format (treat as seconds.milliseconds)
          const totalMs = parseInt(sssValue);
          const seconds = Math.floor(totalMs / 100);
          const milliseconds = (totalMs % 100) * 10; // Convert to 3-digit milliseconds
          normalized = `${hours.padStart(2, '0')}:${minutes}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
          return normalized;
        }
        
        // Ensure proper millisecond format
        const parts = normalized.split(',');
        if (parts.length === 2) {
          let ms = parts[1];
          if (ms.length === 1) ms += '00';
          else if (ms.length === 2) ms += '0';
          else if (ms.length > 3) ms = ms.substring(0, 3);
          normalized = parts[0] + ',' + ms;
        } else if (!normalized.includes(',')) {
          normalized += ',000';
        }
        
        return normalized;
      };
      
      // Normalize the subtitle object
      const normalizedSubtitle = {
        sequence: subtitle.sequence || (i + 1),
        startTime: normalizeTime(subtitle.startTime),
        endTime: normalizeTime(subtitle.endTime),
        text: text.trim()
      };
      
      if (hasTranslation && subtitle.translation) {
        normalizedSubtitle.translation = subtitle.translation.trim();
      }
      
      validSubtitles.push(normalizedSubtitle);
    }
    
    console.log('Background: Successfully parsed JSON format:', validSubtitles.length, 'subtitles');
    if (validSubtitles.length > 0) {
      console.log('Background: First subtitle sample:', validSubtitles[0]);
    }
    return validSubtitles;
    
  } catch (error) {
    console.log('Background: JSON parsing failed:', error.message);
    console.log('Background: Falling back to SRT parsing');
    
    // Fallback to SRT parsing
    return parseSRTFormat(responseText, hasTranslation);
  }
}

// Function to parse SRT format with improved flexibility for malformed input
function parseSRTFormat(srtText, hasTranslation = false) {
  const subtitles = [];
  
  console.log('Background: Parsing SRT text, length:', srtText.length);
  console.log('Background: SRT text preview:', srtText.substring(0, 300));
  
  // Remove any introductory text before the actual subtitles
  let cleanText = srtText.replace(/^.*?(?=\d+\s+\d{2}:\d{2}:\d{2})/s, '');
  
  // Try to extract SRT content if it's wrapped in markdown code blocks
  const codeBlockMatch = srtText.match(/```(?:srt)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleanText = codeBlockMatch[1];
    console.log('Background: Extracted from code block');
  }
  
  // Handle the malformed format like: "1 00:25:33,045 --> 00:28:805 健康なんていらない I don't need health"
  // Use regex to find all subtitle entries
  const subtitlePattern = /(\d+)\s+(\d{2}:\d{2}:\d{2}[,\.]\d{1,3})\s*(?:-->|→|–|-)\s*(\d{2}:\d{2}:\d{2}[,\.]\d{1,3})\s+(.+?)(?=\d+\s+\d{2}:\d{2}:\d{2}|$)/gs;
  
  let match;
  while ((match = subtitlePattern.exec(cleanText)) !== null) {
    const [, sequenceStr, startTimeStr, endTimeStr, textContent] = match;
    
    const sequence = parseInt(sequenceStr);
    if (isNaN(sequence)) continue;
    
    // Normalize time format (fix milliseconds and use commas)
    const normalizeTime = (timeStr) => {
      let normalized = timeStr.replace('.', ','); // Convert periods to commas
      
      // Fix milliseconds format (ensure 3 digits)
      const timeParts = normalized.split(',');
      if (timeParts.length === 2) {
        let milliseconds = timeParts[1];
        if (milliseconds.length === 1) milliseconds += '00';
        else if (milliseconds.length === 2) milliseconds += '0';
        else if (milliseconds.length > 3) milliseconds = milliseconds.substring(0, 3);
        normalized = timeParts[0] + ',' + milliseconds;
      }
      
      return normalized;
    };
    
    const startTime = normalizeTime(startTimeStr);
    const endTime = normalizeTime(endTimeStr);
    
    // Handle text content (might contain both original and translation)
    let text = textContent.trim();
    let translation = '';
    
    if (hasTranslation) {
      // Try to split text into original and translation
      // Look for common patterns like Japanese followed by English
      const lines = text.split(/\n+/).filter(line => line.trim());
      if (lines.length >= 2) {
        text = lines[0].trim();
        translation = lines.slice(1).join(' ').trim();
      } else {
        // Try to detect language boundary (very basic)
        const words = text.split(/\s+/);
        if (words.length > 1) {
          // Simple heuristic: if we have mixed scripts, try to separate them
          const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
          const hasLatin = /[A-Za-z]/.test(text);
          
          if (hasJapanese && hasLatin) {
            const parts = text.split(/(?<=[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF])\s+(?=[A-Za-z])/);
            if (parts.length >= 2) {
              text = parts[0].trim();
              translation = parts.slice(1).join(' ').trim();
            }
          }
        }
      }
    }
    
    const subtitle = {
      sequence,
      startTime,
      endTime,
      text
    };
    
    if (translation) {
      subtitle.translation = translation;
    }
    
    subtitles.push(subtitle);
    console.log(`Background: Parsed subtitle ${sequence}:`, subtitle);
  }
  
  // If regex parsing failed, try the old block-based approach
  if (subtitles.length === 0) {
    console.log('Background: Regex parsing failed, trying block-based approach');
    return parseSRTBlocks(cleanText, hasTranslation);
  }
  
  console.log('Background: Successfully parsed', subtitles.length, 'subtitles using regex approach');
  return subtitles;
}

// Fallback block-based SRT parsing
function parseSRTBlocks(srtText, hasTranslation = false) {
  const subtitles = [];
  
  // Split into blocks - try different separators
  let blocks = srtText.split(/\n\s*\n/).filter(block => block.trim());
  
  if (blocks.length === 0) {
    blocks = srtText.split(/\n\n+/).filter(block => block.trim());
  }
  
  if (blocks.length === 0) {
    blocks = srtText.split(/(?=^\d+$)/m).filter(block => block.trim());
  }
  
  console.log('Background: Found', blocks.length, 'blocks to parse');
  
  blocks.forEach((block, index) => {
    const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length >= 3) {
      let sequenceIndex = 0;
      let sequence = parseInt(lines[0]);
      
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

// Parse malformed subtitle text with flexible patterns
function parseFlexibleFormat(text, hasTranslation = false) {
  console.log('Background: Attempting flexible parsing');
  const subtitles = [];
  
  try {
    // Remove any introductory text
    let cleanText = text.replace(/^.*?(?=\d+\s+\d{1,2}:\d{2}:\d{2})/s, '');
    
    // Use flexible pattern that handles both normal and malformed timestamps
    const timestampPattern = /(\d+)\s+((?:\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})|(?:\d{1,2}:\d{2}[,:]\d{2,3}))\s*(?:-->|→|to)\s*((?:\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})|(?:\d{1,2}:\d{2}[,:]\d{2,3}))/g;
    const matches = [];
    let match;
    
    while ((match = timestampPattern.exec(cleanText)) !== null) {
      matches.push({
        sequence: match[1],
        startTime: match[2],
        endTime: match[3],
        startPos: match.index,
        endPos: timestampPattern.lastIndex
      });
    }
    
    console.log('Background: Found', matches.length, 'timestamp matches in flexible parsing');
    
    // Extract content for each match
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      
      // Content starts after the timestamp and goes to the next timestamp or end
      const contentStart = current.endPos;
      const contentEnd = next ? next.startPos : cleanText.length;
      const content = cleanText.substring(contentStart, contentEnd).trim();
      
      if (content.length === 0) continue;
      
      // Normalize time format - fix malformed timestamps
      let normalizedStartTime = normalizeTimestamp(current.startTime);
      let normalizedEndTime = normalizeTimestamp(current.endTime);
      
      // Handle cases where content has both original and translation
      if (hasTranslation) {
        // Try to split by language patterns (e.g., Japanese followed by English)
        const parts = content.split(/(?=[A-Z][a-z]|\s[A-Z])/);
        
        if (parts.length >= 2) {
          subtitles.push({
            sequence: parseInt(current.sequence),
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            text: parts[0].trim(),
            translation: parts.slice(1).join('').trim()
          });
        } else {
          // Fallback: split roughly in half
          const midPoint = Math.floor(content.length / 2);
          const spaceIndex = content.indexOf(' ', midPoint);
          const splitIndex = spaceIndex > -1 ? spaceIndex : midPoint;
          
          subtitles.push({
            sequence: parseInt(current.sequence),
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            text: content.substring(0, splitIndex).trim(),
            translation: content.substring(splitIndex).trim()
          });
        }
      } else {
        subtitles.push({
          sequence: parseInt(current.sequence),
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
          text: content
        });
      }
    }
    
    console.log('Background: Flexible parsing extracted', subtitles.length, 'subtitles');
    return subtitles;
    
  } catch (error) {
    console.error('Background: Flexible parsing failed:', error);
    return [];
  }
}

// Normalize malformed timestamps
function normalizeTimestamp(timestamp) {
  // Handle various malformed timestamp formats
  // Examples: 00:28,805 -> 00:28:00,805, 00:33,095 -> 00:33:00,095
  
  // If it looks like HH:MM,SSS (comma in wrong place), fix it
  if (/^\d{1,2}:\d{2},\d{3}$/.test(timestamp)) {
    // Convert 00:28,805 to 00:28:00,805
    const parts = timestamp.split(',');
    const timePart = parts[0]; // "00:28"
    const msPart = parts[1]; // "805"
    return `${timePart}:00,${msPart}`;
  }
  
  // If it looks like HH:MM:SS,MS (normal format), just ensure 3-digit milliseconds
  if (/^\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3}$/.test(timestamp)) {
    return timestamp.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
  }
  
  // Fallback: return as-is
  return timestamp;
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