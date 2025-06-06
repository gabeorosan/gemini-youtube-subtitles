# Subtitle Parsing Improvements

## Problem Solved
Fixed Chrome extension subtitle formatting issues where subtitles displayed as "raw text" with timestamps "mashed together" instead of proper formatting.

## Root Cause
Gemini sometimes generates SRT format without proper line breaks, causing parsing to fail and raw text to display. Example malformed output:
```
1 00:25:33,045 --> 00:28,805 健康なんていらない I don't need health 2 00:28,805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either
```

## Solution Implemented

### 1. Multi-Strategy Parsing
- **Primary**: JSON format parsing (preferred)
- **Fallback 1**: Standard SRT format parsing
- **Fallback 2**: Flexible parsing for malformed text
- **Fallback 3**: Basic text splitting as last resort

### 2. Flexible Parsing Engine
Created `parseFlexibleFormat()` function that handles:
- **Malformed timestamps**: `00:28,805` → `00:28:00,805`
- **Missing line breaks**: Parses all entries from single line
- **Mixed formats**: Handles both normal and malformed timestamps
- **Translation splitting**: Separates original and translated text

### 3. Robust Timestamp Handling
- **Flexible regex**: Matches various timestamp formats
- **Normalization**: Converts malformed timestamps to proper SRT format
- **Error recovery**: Handles missing milliseconds, wrong comma placement

### 4. Enhanced Prompts
- More explicit JSON format requirements
- Clear instructions to avoid SRT format
- Emphasis on returning only JSON arrays

## Technical Details

### Flexible Parsing Regex
```javascript
const timestampPattern = /(\d+)\s+((?:\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})|(?:\d{1,2}:\d{2}[,:]\d{2,3}))\s*(?:-->|→|to)\s*((?:\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})|(?:\d{1,2}:\d{2}[,:]\d{2,3}))/g;
```

This pattern matches:
- Normal timestamps: `00:25:33,045`
- Malformed timestamps: `00:28,805`, `00:33,095`
- Various separators: `-->`, `→`, `to`

### Timestamp Normalization
```javascript
function normalizeTimestamp(timestamp) {
  // Convert 00:28,805 to 00:28:00,805
  if (/^\d{1,2}:\d{2},\d{3}$/.test(timestamp)) {
    const parts = timestamp.split(',');
    return `${parts[0]}:00,${parts[1]}`;
  }
  // Handle other formats...
}
```

## Test Results
Successfully parses the malformed example:
- **Input**: `1 00:25:33,045 --> 00:28,805 健康なんていらない I don't need health 2 00:28,805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either`
- **Output**: 3 properly formatted subtitle objects with correct timestamps and text separation

## Benefits
1. **Robust parsing**: Handles various malformed formats from Gemini
2. **Better user experience**: No more raw text display
3. **Graceful degradation**: Multiple fallback strategies
4. **Translation support**: Properly splits original and translated text
5. **Timestamp accuracy**: Normalizes malformed timestamps to valid format

## Files Modified
- `background.js`: Added flexible parsing functions and improved prompts
- `content.js`: Enhanced debugging and validation (previously done)
- Test files created for validation

## Future Improvements
- Could add more timestamp format variations if needed
- Could implement machine learning-based text splitting for better translation separation
- Could add user feedback mechanism for parsing quality