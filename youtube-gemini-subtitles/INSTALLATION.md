# Installation Guide - YouTube Gemini Subtitles

## Quick Start

### 1. Download the Extension
- Download all files from this directory to your computer
- Keep all files in the same folder structure

### 2. Install in Chrome

1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder containing all extension files
   - The extension should appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "YouTube Gemini Subtitles" and click the pin icon

### 3. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (keep it secure!)

### 4. Configure Extension

1. Click the extension icon in Chrome
2. Enter your Gemini API key
3. Select target language
4. Choose a Gemini model
5. Click "Save Settings"

### 5. Test the Extension

1. Go to any YouTube video
2. Click the extension icon
3. Click "Generate Subtitles"
4. Watch the magic happen!

## File Structure

```
youtube-gemini-subtitles/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.js               # Popup functionality
├── content.js             # YouTube integration
├── background.js          # Background service worker
├── styles.css             # Subtitle styling
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # Detailed documentation
├── INSTALLATION.md        # This file
├── LICENSE                # MIT License
├── package.json           # Project metadata
└── demo.html              # Demo page
```

## Troubleshooting

### Extension Not Loading
- Make sure all files are in the same folder
- Check that Developer mode is enabled
- Try refreshing the extensions page

### API Errors
- Verify your Gemini API key is correct
- Check your API quota and billing
- Ensure internet connection is stable

### No Subtitles Generated
- Make sure you're on a YouTube video page
- Check the browser console for error messages
- Try refreshing the page and trying again

## Support

For issues:
1. Check the README.md for detailed troubleshooting
2. Verify all files are present and correctly named
3. Check Chrome's developer console for errors

## Demo

Visit the demo page at: `demo.html` (open in browser after starting local server)

---

**Ready to generate AI-powered subtitles for YouTube videos!** 🎬✨