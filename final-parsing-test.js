const malformedText = `1 00:25:33,045 --> 00:28,805 健康なんていらない I don't need health 2 00:28,805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either`;

function parseFlexibleFormat(text, hasTranslation = false) {
  console.log('Testing final flexible parsing');
  const subtitles = [];
  
  try {
    // Remove any introductory text
    let cleanText = text.replace(/^.*?(?=\d+\s+\d{1,2}:\d{2}:\d{2})/s, '');
    console.log('Clean text:', cleanText);
    
    // Find all timestamp patterns with very flexible matching
    const timestampPattern = /(\d+)\s+(\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}[,.:]\d{1,3})/g;
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
      
      // Normalize time format and fix malformed milliseconds
      let normalizedStartTime = current.startTime.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
      let normalizedEndTime = current.endTime.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
      
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

// Test with translation
console.log('=== Testing with translation ===');
const result1 = parseFlexibleFormat(malformedText, true);
console.log('Result:', JSON.stringify(result1, null, 2));

// Test without translation
console.log('\n=== Testing without translation ===');
const result2 = parseFlexibleFormat(malformedText, false);
console.log('Result:', JSON.stringify(result2, null, 2));