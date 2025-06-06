# Troubleshooting Guide - YouTube Gemini Subtitles Extension

## Common Issues and Solutions

### 1. "Failed to fetch" Error

**Symptoms:**
- Extension shows "Error: Failed to transcribe with Gemini: Failed to fetch"
- No subtitles are generated

**Possible Causes & Solutions:**

#### A. Invalid API Key
- **Check**: Ensure your Gemini API key is valid
- **Solution**: 
  1. Go to [Google AI Studio](https://aistudio.google.com/)
  2. Generate a new API key
  3. Copy and paste it into the extension

#### B. API Quota Exceeded
- **Check**: You may have exceeded your API usage limits
- **Solution**: 
  1. Check your API usage in Google AI Studio
  2. Wait for quota reset or upgrade your plan

#### C. Network/CORS Issues (FIXED)
- **Previous Issue**: Content script couldn't make cross-origin requests
- **Solution Applied**: Moved API calls to background script
- **Status**: ✅ Fixed in latest version

#### D. Wrong API Endpoint (FIXED)
- **Previous Issue**: Using `v1` instead of `v1beta` API version
- **Solution Applied**: Updated all endpoints to use `v1beta`
- **Status**: ✅ Fixed in latest version

### 2. Extension Not Loading

**Symptoms:**
- Extension icon doesn't appear
- No popup when clicking extension

**Solutions:**
1. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Find "YouTube Gemini Subtitles"
   - Click the reload button (🔄)

2. **Check Permissions**:
   - Ensure extension has access to YouTube
   - Check if extension is enabled

3. **Reinstall Extension**:
   - Remove and reinstall the extension

### 3. No Subtitles Generated

**Symptoms:**
- Extension runs but no subtitles appear
- Status shows success but no content

**Solutions:**
1. **Check Video Page**: Ensure you're on a YouTube video page (`youtube.com/watch?v=...`)
2. **Wait for Processing**: Large videos may take longer to process
3. **Check Console**: Open browser console (F12) for detailed error messages

### 4. Subtitles Not Accurate

**Symptoms:**
- Subtitles are generated but don't match video content
- Generic or irrelevant subtitles

**Explanation:**
- The extension generates contextual subtitles based on video title and description
- It doesn't process actual audio (browser limitation)
- Subtitles are AI-generated approximations

**Improvements:**
- Ensure video has a descriptive title
- Add detailed video description for better context

### 5. Language Issues

**Symptoms:**
- Subtitles not in requested language
- Mixed languages in output

**Solutions:**
1. **Specify Language Clearly**: Use full language names (e.g., "Spanish" not "ES")
2. **Check Model Support**: Some models work better with certain languages
3. **Try Different Models**: Switch between available Gemini models

## Testing Your Setup

### Quick Test
1. Open the extension test page: `test-api.html`
2. Enter your API key
3. Click "Test Generate Content"
4. Should see a successful response

### Full Extension Test
1. Navigate to any YouTube video
2. Open extension popup
3. Enter API key and select language
4. Click "Generate Subtitles"
5. Check for subtitle container on the page

## Debug Information

### Browser Console
Open browser console (F12) and look for:
- Extension loading messages
- API request/response logs
- Error details

### Extension Console
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "background page" or "service worker" for the extension
4. Check console for background script logs

## Getting Help

### Before Reporting Issues
1. ✅ Check this troubleshooting guide
2. ✅ Test with the `test-api.html` page
3. ✅ Check browser console for errors
4. ✅ Verify API key is valid
5. ✅ Try with a different YouTube video

### Information to Include
When reporting issues, please include:
- Browser version
- Extension version
- Error messages from console
- Steps to reproduce
- YouTube video URL (if relevant)

## Recent Fixes Applied

### Version 1.1 (Latest)
- ✅ Fixed CORS issues by moving API calls to background script
- ✅ Improved error handling and user feedback
- ✅ Better model selection and fallback
- ✅ Enhanced debugging capabilities

### Version 1.0
- ✅ Fixed API endpoints to use `v1beta`
- ✅ Updated default model to `gemini-1.5-flash`
- ✅ Added comprehensive error logging

---

**Most "Failed to fetch" errors should now be resolved with the latest fixes!** 🎉