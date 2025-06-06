// YouTube Gemini Subtitles - Background Script
// Clean version with structured output focus

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title
        });
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true;
  }
  
  if (request.action === 'transcribeWithGemini') {
    console.log('Background: Received transcribeWithGemini request');
    console.log('Background: Request data keys:', Object.keys(request));
    console.log('Background: Video data:', request.data);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000);
    });
    
    Promise.race([
      transcribeWithGemini(request.data, request.apiKey, request.translationLanguage, request.selectedModel, request.videoTitle),
      timeoutPromise
    ])
      .then(result => {
        console.log('Background: Sending successful response');
        // Ensure consistent response format
        if (result && result.subtitles) {
          sendResponse({ success: true, subtitles: result.subtitles, hasTranslation: result.hasTranslation });
        } else if (Array.isArray(result)) {
          sendResponse({ success: true, subtitles: result, hasTranslation: false });
        } else {
          sendResponse({ success: true, data: result });
        }
      })
      .catch(error => {
        console.error('Background: Error generating subtitles:', error);
        const errorMessage = error.message || 'Failed to generate subtitles';
        console.log('Background: Sending error response:', errorMessage);
        sendResponse({ 
          success: false, 
          error: errorMessage
        });
      });
    return true; // Keep message channel open for async response
  }
});

async function transcribeWithGemini(videoData, apiKey, translationLanguage, selectedModel, videoTitle) {
  try {
    console.log('Background: Starting subtitle generation');
    console.log('Background: Video data:', videoData);
    console.log('Background: Model:', selectedModel);
    console.log('Background: Translation:', translationLanguage);

    // Extract data from videoData object
    const { youtubeUrl, duration, videoId } = videoData;
    
    // Create simplified prompt for structured output
    const hasTranslation = translationLanguage && translationLanguage !== 'none';
    
    let prompt = `Analyze this YouTube video and generate accurate subtitles.

Video: "${videoTitle}"
Duration: ${duration} seconds

Generate approximately ${Math.max(10, Math.floor(duration / 6))} subtitle segments with realistic timing based on the actual video content.

Requirements:
- Use exact time format: HH:MM:SS,mmm (e.g., "00:01:23,500")
- Keep segments 3-5 seconds each for readability
- Ensure timestamps are sequential and don't overlap`;

    if (hasTranslation) {
      prompt += `\n- Include ${translationLanguage} translations for each subtitle`;
    }

    // Define strict JSON schema
    const subtitleSchema = {
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
            description: "Start time in HH:MM:SS,mmm format"
          },
          endTime: {
            type: "string", 
            pattern: "^\\d{2}:\\d{2}:\\d{2},\\d{3}$",
            description: "End time in HH:MM:SS,mmm format"
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
    if (hasTranslation) {
      subtitleSchema.items.properties.translation = {
        type: "string",
        description: "Translated subtitle text"
      };
      subtitleSchema.items.required.push("translation");
    }

    // Make API request with structured output
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          { fileData: { fileUri: youtubeUrl } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: subtitleSchema
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    console.log('Background: Making API request with structured output');

    console.log('Background: Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('Background: Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Background: API error response:', errorText);
      
      // If structured output fails, try without it
      if (errorText.includes('responseSchema') || errorText.includes('responseMimeType') || 
          errorText.includes('generationConfig') || response.status === 400) {
        console.log('Background: Structured output not supported, retrying without schema');
        return await transcribeWithoutSchema(videoData, apiKey, translationLanguage, selectedModel, videoTitle);
      }
      
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Background: API response received');

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid API response structure');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    console.log('Background: Generated text length:', generatedText.length);

    // Parse structured response (should be clean JSON due to schema)
    const subtitles = parseStructuredResponse(generatedText, hasTranslation);
    
    if (subtitles.length === 0) {
      throw new Error('No valid subtitles generated');
    }

    console.log('Background: Successfully generated', subtitles.length, 'subtitles');
    
    return {
      subtitles: subtitles,
      hasTranslation: hasTranslation
    };

  } catch (error) {
    console.error('Background: Error in generateSubtitles:', error);
    throw error;
  }
}

// Fallback function without structured output
async function transcribeWithoutSchema(videoData, apiKey, translationLanguage, selectedModel, videoTitle) {
  console.log('Background: Generating subtitles without structured output');
  
  const { youtubeUrl, duration } = videoData;
  const hasTranslation = translationLanguage && translationLanguage !== 'none';
  
  // Create traditional prompt with explicit JSON instructions
  let textPrompt;
  if (hasTranslation) {
    textPrompt = `Analyze this YouTube video and generate accurate subtitles with ${translationLanguage} translations.

Video: "${videoTitle}" (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})

CRITICAL: Return ONLY a valid JSON array with this exact format:
[
  {
    "sequence": 1,
    "startTime": "00:01:23,500",
    "endTime": "00:01:26,800", 
    "text": "Original text",
    "translation": "${translationLanguage} translation"
  }
]

Generate approximately ${Math.max(10, Math.floor(duration / 6))} subtitle segments.
Use EXACT timestamp format HH:MM:SS,mmm (hours:minutes:seconds,milliseconds).
NO markdown, NO explanations, ONLY the JSON array.`;
  } else {
    textPrompt = `Analyze this YouTube video and generate accurate subtitles.

Video: "${videoTitle}" (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})

CRITICAL: Return ONLY a valid JSON array with this exact format:
[
  {
    "sequence": 1,
    "startTime": "00:01:23,500",
    "endTime": "00:01:26,800",
    "text": "Subtitle text"
  }
]

Generate approximately ${Math.max(10, Math.floor(duration / 6))} subtitle segments.
Use EXACT timestamp format HH:MM:SS,mmm (hours:minutes:seconds,milliseconds).
NO markdown, NO explanations, ONLY the JSON array.`;
  }

  const requestBody = {
    contents: [{
      parts: [
        { text: textPrompt },
        { fileData: { fileUri: youtubeUrl } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 8192
    }
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid API response structure');
  }

  const generatedText = data.candidates[0].content.parts[0].text;
  console.log('Background: Generated text (fallback):', generatedText.substring(0, 500));

  // Use the existing multi-strategy parsing
  const subtitles = parseSimpleFallback(generatedText, hasTranslation);
  
  return {
    subtitles: subtitles,
    hasTranslation: hasTranslation
  };
}

// Simple parser for structured JSON response
function parseStructuredResponse(responseText, hasTranslation = false) {
  console.log('Background: Parsing structured JSON response');
  
  try {
    // Clean response text
    let jsonText = responseText.trim();
    
    // Remove any potential markdown wrapping (shouldn't happen with structured output)
    if (jsonText.startsWith('```') && jsonText.endsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log('Background: Parsing JSON, length:', jsonText.length);
    
    // Parse JSON directly (schema should ensure it's valid)
    const subtitlesArray = JSON.parse(jsonText);
    
    if (!Array.isArray(subtitlesArray)) {
      throw new Error('Response is not an array');
    }
    
    // Minimal validation (schema should prevent most issues)
    const validSubtitles = [];
    for (const subtitle of subtitlesArray) {
      if (!subtitle || typeof subtitle !== 'object') continue;
      if (!subtitle.startTime || !subtitle.endTime || !subtitle.text) continue;
      
      const normalizedSubtitle = {
        sequence: subtitle.sequence,
        startTime: subtitle.startTime,
        endTime: subtitle.endTime,
        text: subtitle.text.trim()
      };
      
      if (hasTranslation && subtitle.translation) {
        normalizedSubtitle.translation = subtitle.translation.trim();
      }
      
      validSubtitles.push(normalizedSubtitle);
    }
    
    console.log('Background: Successfully parsed', validSubtitles.length, 'subtitles');
    return validSubtitles;
    
  } catch (error) {
    console.error('Background: Structured parsing failed:', error.message);
    console.log('Background: Raw response:', responseText.substring(0, 500));
    
    // Simple fallback: try to extract JSON array from anywhere in the response
    return parseSimpleFallback(responseText, hasTranslation);
  }
}

// Minimal fallback parser
function parseSimpleFallback(responseText, hasTranslation = false) {
  console.log('Background: Using simple fallback parser');
  
  try {
    // Find any JSON array in the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found');
    }
    
    let jsonText = jsonMatch[0];
    
    // Basic cleanup
    jsonText = jsonText.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
    
    const subtitlesArray = JSON.parse(jsonText);
    
    if (!Array.isArray(subtitlesArray)) {
      throw new Error('Not an array');
    }
    
    const validSubtitles = [];
    for (let i = 0; i < subtitlesArray.length; i++) {
      const subtitle = subtitlesArray[i];
      if (!subtitle || !subtitle.text || !subtitle.startTime || !subtitle.endTime) continue;
      
      validSubtitles.push({
        sequence: subtitle.sequence || (i + 1),
        startTime: subtitle.startTime,
        endTime: subtitle.endTime,
        text: subtitle.text.trim(),
        ...(hasTranslation && subtitle.translation && { translation: subtitle.translation.trim() })
      });
    }
    
    console.log('Background: Fallback parsing successful:', validSubtitles.length, 'subtitles');
    return validSubtitles;
    
  } catch (error) {
    console.error('Background: All parsing methods failed:', error.message);
    return [];
  }
}