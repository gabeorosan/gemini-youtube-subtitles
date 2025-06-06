# Extension Communication Error Fixes

## Problem
"Extension communication error: The message port closed before a response was received."

## Root Causes Identified & Fixed

### 1. Response Format Mismatch
**Issue**: Content script expected `response.subtitles` but background script returned `response.data`
**Fix**: Updated response handler to return consistent format:
```javascript
// Background script now returns:
{ success: true, subtitles: result.subtitles, hasTranslation: result.hasTranslation }

// Content script expects:
response.subtitles (not response.data)
```

### 2. Structured Output Compatibility
**Issue**: Gemini models might not support structured output (responseSchema)
**Fix**: Added fallback mechanism:
- Try structured output first
- If API returns 400 or mentions schema errors, retry without structured output
- Graceful degradation to traditional prompting

### 3. Timeout Handling
**Issue**: Long API requests could cause message port to close
**Fix**: Added 60-second timeout with Promise.race:
```javascript
Promise.race([
  transcribeWithGemini(...),
  timeoutPromise
])
```

### 4. Error Handling Improvements
**Issue**: Uncaught exceptions could crash background script
**Fix**: 
- Better error logging at each step
- Consistent error response format
- Input validation for required parameters

### 5. Function Signature Consistency
**Issue**: Fallback function returned different format than main function
**Fix**: Both functions now return `{ subtitles: [], hasTranslation: boolean }`

## Implementation Details

### Structured Output Schema
```javascript
responseSchema: {
  type: "array",
  items: {
    type: "object", 
    properties: {
      sequence: { type: "integer" },
      startTime: { 
        type: "string",
        pattern: "^\\d{2}:\\d{2}:\\d{2},\\d{3}$"
      },
      endTime: { 
        type: "string",
        pattern: "^\\d{2}:\\d{2}:\\d{2},\\d{3}$" 
      },
      text: { type: "string" },
      translation: { type: "string" } // conditional
    },
    required: ["sequence", "startTime", "endTime", "text"],
    additionalProperties: false
  }
}
```

### Fallback Detection
```javascript
if (errorText.includes('responseSchema') || 
    errorText.includes('responseMimeType') || 
    errorText.includes('generationConfig') || 
    response.status === 400) {
  return await transcribeWithoutSchema(...);
}
```

### Response Processing
```javascript
// Primary: Direct JSON parsing for structured output
try {
  subtitles = JSON.parse(generatedText);
} catch (structuredError) {
  // Fallback: Multi-strategy parsing
  // parseJSONFormat → parseSRTFormat → parseFlexibleFormat → fallback
}
```

## Expected Results
- ✅ No more message port timeout errors
- ✅ Consistent response format between content/background scripts  
- ✅ Graceful fallback when structured output unsupported
- ✅ Better error messages for debugging
- ✅ 60-second timeout prevents hanging requests

## Testing
1. Load extension in Chrome
2. Navigate to YouTube video
3. Open extension popup
4. Generate subtitles
5. Check console for any errors
6. Verify subtitles display correctly

The extension should now handle both structured output (when supported) and traditional prompting (as fallback) without communication errors.