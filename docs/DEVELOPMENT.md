# Development Guide

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/youtube-gemini-subtitles.git
cd youtube-gemini-subtitles
```

2. Install dependencies:
```bash
npm install
```

## Development

### Project Structure
```
youtube-gemini-subtitles/
├── src/                    # Source files
│   ├── background.js      # Background script
│   ├── content.js         # Content script
│   ├── popup.js           # Popup script
│   └── options.js         # Options page script
├── assets/                # Static assets
├── dist/                  # Build output
├── docs/                  # Documentation
└── tests/                 # Test files
```

### Available Scripts

- `npm run dev`: Start development build with watch mode
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

### Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run dev` to watch for changes
3. Load the `dist` directory as an unpacked extension in Chrome
4. Test your changes
5. Run `npm run lint` and `npm run format` before committing

## Testing

### Manual Testing
1. Load the extension in Chrome
2. Visit a YouTube video
3. Test the following features:
   - Hotkey functionality
   - Subtitle generation
   - Options page
   - Error handling

### Automated Testing
- Write unit tests in `tests/`
- Run tests with `npm test`

## Building for Production

1. Update version in `manifest.json`
2. Run `npm run build`
3. Test the production build
4. Create a zip file of the `dist` directory

## Deployment

1. Create a zip file of the `dist` directory
2. Upload to Chrome Web Store
3. Fill in store listing details
4. Submit for review

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check manifest.json for errors
   - Verify all required files are present
   - Check console for errors

2. **API not working**
   - Verify API key is set
   - Check network requests
   - Verify YouTube URL format

3. **Build errors**
   - Check webpack configuration
   - Verify all dependencies are installed
   - Check for syntax errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Write clear comments
- Follow Chrome extension best practices 