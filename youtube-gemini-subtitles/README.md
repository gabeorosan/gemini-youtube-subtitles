# YouTube Gemini Subtitles Chrome Extension

A Chrome extension that uses Google's Gemini AI to generate subtitles for YouTube videos in multiple languages.

## Features

- 🤖 **AI-Powered Subtitles**: Uses Google Gemini AI to generate contextual subtitles
- 🌍 **Multi-Language Support**: Generate subtitles in 12+ languages
- 🎯 **Dynamic Model Selection**: Automatically fetches and lets you choose from available Gemini models
- 💾 **SRT Export**: Download generated subtitles in standard SRT format
- 🎨 **Beautiful UI**: Modern, responsive interface with smooth animations
- ⚡ **Real-time Generation**: Generate subtitles directly on YouTube pages

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Download the Extension**
   - Clone or download this repository
   - Extract the files to a folder on your computer

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "YouTube Gemini Subtitles" and click the pin icon

## Setup

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (keep it secure!)

### 2. Configure the Extension

1. Click the extension icon in Chrome's toolbar
2. Enter your Gemini API key
3. Select your preferred target language
4. Choose a Gemini model (models are loaded automatically)
5. Click "Save Settings"

## Usage

1. **Navigate to YouTube**
   - Go to any YouTube video page
   - Make sure the video is loaded

2. **Generate Subtitles**
   - Click the extension icon
   - Click "Generate Subtitles"
   - Wait for the AI to process the video

3. **View and Manage Subtitles**
   - Subtitles will appear in a floating panel on the right side
   - Use the eye icon to toggle subtitle visibility
   - Use the download icon to save subtitles as SRT file
   - Use the X icon to close the subtitle panel

## Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Arabic (ar)
- Hindi (hi)

## How It Works

1. **Video Analysis**: The extension analyzes the YouTube video's title, description, and metadata
2. **AI Processing**: Sends contextual information to Google Gemini AI
3. **Subtitle Generation**: Gemini generates realistic, timed subtitles based on the video content
4. **Display**: Subtitles are formatted and displayed in an elegant overlay

## Technical Details

### Files Structure
```
youtube-gemini-subtitles/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── content.js             # YouTube page integration
├── background.js          # Background service worker
├── styles.css             # Subtitle container styling
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

### Permissions Used
- `activeTab`: Access current YouTube tab
- `storage`: Save user settings
- `scripting`: Inject content scripts
- `https://www.youtube.com/*`: Access YouTube pages
- `https://generativelanguage.googleapis.com/*`: Access Gemini API

## Limitations

- **Audio Processing**: Currently generates subtitles based on video metadata rather than actual audio analysis
- **API Costs**: Gemini API usage may incur costs based on Google's pricing
- **Rate Limits**: Subject to Gemini API rate limits
- **YouTube Only**: Only works on YouTube video pages

## Privacy & Security

- **API Key Storage**: Your Gemini API key is stored locally in Chrome's sync storage
- **No Data Collection**: The extension doesn't collect or transmit personal data
- **Secure Communication**: All API calls use HTTPS encryption

## Troubleshooting

### Common Issues

1. **"No video found"**
   - Make sure you're on a YouTube video page (not playlist or channel)
   - Refresh the page and try again

2. **"Error loading models"**
   - Check your API key is correct
   - Ensure you have internet connection
   - Verify your Gemini API quota

3. **"API Error: 403"**
   - Your API key may be invalid or expired
   - Check API key permissions in Google AI Studio

4. **Extension not appearing**
   - Make sure Developer mode is enabled
   - Try reloading the extension
   - Check Chrome's extension page for errors

### Debug Mode

1. Open Chrome DevTools (F12)
2. Check the Console tab for error messages
3. Look for messages starting with "YouTube Gemini Subtitles"

## Development

### Local Development

1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Building for Production

For production deployment, you would need to:
1. Create a Chrome Web Store developer account
2. Package the extension as a .zip file
3. Submit for review following Chrome Web Store policies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Please check the license file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Open an issue on the project repository
3. Provide detailed error messages and steps to reproduce

---

**Note**: This extension is for educational and personal use. Please respect YouTube's terms of service and content creators' rights when using generated subtitles.