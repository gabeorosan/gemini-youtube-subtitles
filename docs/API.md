# API Documentation

## Gemini API Integration

The extension uses Google's Gemini AI API to generate subtitles. The API integration is handled in the background script.

### API Endpoint
```
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

### Models
- `gemini-2.0-flash` (default): Fastest model, good for real-time subtitle generation
- `gemini-1.5-pro`: More accurate but slower model

### Request Format
```json
{
  "contents": [{
    "parts": [
      { "text": "prompt" },
      { "fileData": { "fileUri": "youtube_url" } }
    ]
  }],
  "generationConfig": {
    "temperature": 0.1,
    "topK": 1,
    "topP": 0.8,
    "maxOutputTokens": 8192
  }
}
```

### Response Format
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "generated_subtitles"
      }]
    }
  }]
}
```

## Chrome Extension API Usage

### Storage
- `chrome.storage.sync`: Stores user preferences and API key
- `chrome.storage.local`: Stores temporary data

### Messaging
- `chrome.runtime.sendMessage`: Communication between content script and background
- `chrome.tabs.sendMessage`: Communication between popup and content script

### Commands
- `chrome.commands`: Handles keyboard shortcuts
- Default: `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows/Linux)

## Error Handling

### API Errors
- Invalid API key
- Rate limiting
- Network errors
- Invalid response format

### Extension Errors
- Missing permissions
- Invalid YouTube URL
- No video element found
- Communication errors

## Security

- API key is stored securely in Chrome's storage
- No data is sent to external servers except Gemini API
- All user data is stored locally 