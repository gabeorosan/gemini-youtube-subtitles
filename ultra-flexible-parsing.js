const malformedText = `1 00:25:33,045 --> 00:28,805 健康なんていらない I don't need health 2 00:28,805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either`;

function parseFlexibleFormat(text, hasTranslation = false) {
  console.log('Testing ultra-flexible parsing');
  const subtitles = [];
  
  try {
    // Remove any introductory text
    let cleanText = text.replace(/^.*?(?=\d+\s+\d{1,2}:\d{2}:\d{2})/s, '');
    console.log('Clean text:', cleanText);
    
    // Ultra-flexible pattern that matches various malformed timestamp formats
    // Matches: 00:28,805 (comma in wrong place), 00:33,095, etc.
    const timestampPattern = /(\d+)\s+(\d{1,2}:\d{2}[,:]\d{2,3}[,:]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}[,:]\d{2,3}[,:]\d{1,3})/g;
    const matches = [];
    let match;
    
    while ((match = timestampPattern.exec(cleanText)) !== null) {
      matches.push({
        sequence: match[1],
        startTime: match[2],
        endTime: match[3],
        startPos: match.index,
        endPos: timestampPattern.lastIndex
      });
    }
    
    console.log('Found', matches.length, 'timestamp matches');
    
    // Extract content for each match
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      
      // Content starts after the timestamp and goes to the next timestamp or end
      const contentStart = current.endPos;
      const contentEnd = next ? next.startPos : cleanText.length;
      const content = cleanText.substring(contentStart, contentEnd).trim();
      
      console.log(`Entry ${current.sequence}:`, content);
      
      // Normalize time format - fix malformed timestamps
      let normalizedStartTime = normalizeTimestamp(current.startTime);
      let normalizedEndTime = normalizeTimestamp(current.endTime);
      
      console.log('Normalized:', normalizedStartTime, '->', normalizedEndTime);
      
      // Handle cases where content has both original and translation
      if (hasTranslation && content.length > 0) {
        // Try to split by language patterns (e.g., Japanese followed by English)
        const parts = content.split(/(?=[A-Z][a-z]|\s[A-Z])/);
        
        if (parts.length >= 2) {
          subtitles.push({
            sequence: parseInt(current.sequence),
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            text: parts[0].trim(),
            translation: parts.slice(1).join('').trim()
          });
        } else {
          // Fallback: split roughly in half
          const midPoint = Math.floor(content.length / 2);
          const spaceIndex = content.indexOf(' ', midPoint);
          const splitIndex = spaceIndex > -1 ? spaceIndex : midPoint;
          
          subtitles.push({
            sequence: parseInt(current.sequence),
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            text: content.substring(0, splitIndex).trim(),
            translation: content.substring(splitIndex).trim()
          });
        }
      } else if (content.length > 0) {
        subtitles.push({
          sequence: parseInt(current.sequence),
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
          text: content
        });
      }
    }
    
    console.log('Flexible parsing extracted', subtitles.length, 'subtitles');
    return subtitles;
    
  } catch (error) {
    console.error('Flexible parsing failed:', error);
    return [];
  }
}

function normalizeTimestamp(timestamp) {
  // Handle various malformed timestamp formats
  // Examples: 00:28,805 -> 00:28:00,805, 00:33,095 -> 00:33:00,095
  
  console.log('Normalizing timestamp:', timestamp);
  
  // If it looks like HH:MM,SSS (comma in wrong place), fix it
  if (/^\d{1,2}:\d{2},\d{3}$/.test(timestamp)) {
    // Convert 00:28,805 to 00:28:00,805
    const parts = timestamp.split(',');
    const timePart = parts[0]; // "00:28"
    const msPart = parts[1]; // "805"
    return `${timePart}:00,${msPart}`;
  }
  
  // If it looks like HH:MM:SS,MS (normal format), just ensure 3-digit milliseconds
  if (/^\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3}$/.test(timestamp)) {
    return timestamp.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
  }
  
  // Fallback: return as-is
  return timestamp;
}

// Test with translation
console.log('=== Testing with translation ===');
const result1 = parseFlexibleFormat(malformedText, true);
console.log('Result:', JSON.stringify(result1, null, 2));

// Test without translation
console.log('\n=== Testing without translation ===');
const result2 = parseFlexibleFormat(malformedText, false);
console.log('Result:', JSON.stringify(result2, null, 2));