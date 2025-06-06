# 🎬 YouTube Gemini Subtitles

A Chrome extension that generates accurate subtitles for YouTube videos using Google's Gemini AI. The extension analyzes video content and generates subtitles in real-time, with optional translation support.

## ✨ Features

- 🤖 **AI-Powered Subtitles**: Uses Google's Gemini AI to analyze video content and generate accurate subtitles
- 🌍 **Translation Support**: Optional translation of subtitles into any language
- ⌨️ **Keyboard Shortcuts**: Quick access with customizable keyboard shortcuts
- 💾 **SRT Export**: Download generated subtitles in SRT format
- 🎨 **Customizable Display**: Adjust subtitle position, size, and appearance
- 🔄 **Real-time Generation**: Generate subtitles while watching videos

## 🚀 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/youtube-gemini-subtitles.git
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select the `youtube-gemini-subtitles` directory

5. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

6. Click the extension icon and enter your API key

## 🎯 Usage

1. Navigate to any YouTube video
2. Click the extension icon or use the keyboard shortcut (default: `Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
3. Wait for the subtitles to generate
4. Use the controls to:
   - Toggle subtitle visibility
   - Download subtitles as SRT
   - Close the subtitle panel

## ⚙️ Configuration

Access the options page by clicking the ⚙️ button in the popup to configure:

- Default Gemini model
- Translation language
- Subtitle display preferences
- Keyboard shortcuts

## 🛠️ Development

### Project Structure

```
youtube-gemini-subtitles/
├── src/                    # Source code
│   ├── content.js         # Content script for YouTube pages
│   ├── background.js      # Background service worker
│   ├── popup.js           # Popup UI logic
│   ├── popup.html         # Popup UI
│   ├── options.js         # Options page logic
│   ├── options.html       # Options page UI
│   └── styles.css         # Shared styles
├── assets/                # Static assets
│   └── icons/            # Extension icons
├── docs/                  # Documentation
├── tests/                 # Test files
└── manifest.json          # Extension manifest
```

### Building from Source

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the `dist` directory as an unpacked extension in Chrome

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for providing the AI capabilities
- YouTube for the video platform
- All contributors who have helped improve this extension

## 📚 Documentation

For detailed documentation, see the [docs](docs/) directory:

- [API Documentation](docs/API.md)
- [User Guide](docs/USER_GUIDE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md) 