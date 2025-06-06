// YouTube Gemini Subtitles - Background Script
// Clean version with structured output focus

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSubtitles') {
    generateSubtitles(request.data)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('Background: Error generating subtitles:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to generate subtitles' 
        });
      });
    return true; // Keep message channel open for async response
  }
});

async function generateSubtitles({ youtubeUrl, apiKey, selectedModel, translationLanguage, videoTitle, videoDescription, videoLength }) {
  try {
    console.log('Background: Starting subtitle generation');
    console.log('Background: YouTube URL:', youtubeUrl);
    console.log('Background: Model:', selectedModel);
    console.log('Background: Translation:', translationLanguage);

    // Create simplified prompt for structured output
    const hasTranslation = translationLanguage && translationLanguage !== 'none';
    
    let prompt = `Analyze this YouTube video and generate accurate subtitles.

Video: "${videoTitle}"
Duration: ${videoLength} seconds

Generate approximately ${Math.max(10, Math.floor(videoLength / 6))} subtitle segments with realistic timing based on the actual video content.

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
      success: true,
      subtitles: subtitles,
      hasTranslation: hasTranslation
    };

  } catch (error) {
    console.error('Background: Error in generateSubtitles:', error);
    throw error;
  }
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