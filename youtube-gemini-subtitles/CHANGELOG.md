# Changelog - YouTube Gemini Subtitles

## Version 1.1.0 - Latest Updates

### 🔧 Fixed Issues
- **Fixed model loading error**: Extension now gracefully handles API errors and falls back to default model
- **Improved error handling**: Better error messages and fallback mechanisms

### ✨ New Features
- **Default Model**: Now uses `gemini-2.0-flash` as the default model
- **Flexible Language Input**: Replaced dropdown with text input for target language
- **Better User Experience**: Extension works even without API key (uses default model)

### 🎨 UI Improvements
- **Language Input Field**: Users can now type any language name instead of selecting from dropdown
- **Language Hints**: Added helpful examples for language input
- **Default Model Display**: Shows default model even when API key is not provided

### 📝 Changes Made

#### 1. Language Selection
- **Before**: Dropdown with predefined languages (en, es, fr, etc.)
- **After**: Text input field with "English" as default
- **Benefit**: Users can specify any language supported by Gemini AI

#### 2. Model Selection
- **Before**: Required API key to load models, showed error if failed
- **After**: Uses `gemini-2.0-flash` as default, loads additional models if API key provided
- **Benefit**: Extension works immediately without configuration

#### 3. Error Handling
- **Before**: Extension failed if model loading failed
- **After**: Graceful fallback to default model with informative messages
- **Benefit**: More reliable user experience

### 🔄 Technical Changes

#### popup.js
- Added `setDefaultModel()` function
- Improved `loadModels()` with better error handling
- Default language set to "English"
- Models load on startup regardless of API key status

#### popup.html
- Changed language dropdown to text input
- Added language hint text
- Updated default model option

#### content.js
- Enhanced prompt to better handle flexible language input
- Improved language specification in subtitle generation

#### Documentation
- Updated README.md with new language support info
- Updated demo.html to reflect changes
- Added changelog for tracking updates

### 🚀 How to Use New Features

1. **Language Input**: Simply type any language name (e.g., "Spanish", "Japanese", "French")
2. **Default Model**: Extension works immediately with gemini-2.0-flash
3. **API Key Optional**: Can generate subtitles without API key using default model
4. **Enhanced Models**: Provide API key to access additional Gemini models

### 🔮 Future Improvements
- Real-time language suggestions
- Language code support (en, es, fr)
- Custom model configuration
- Batch subtitle generation

---

**Ready to generate AI-powered subtitles with improved reliability!** ✨