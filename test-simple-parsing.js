// Test a simpler approach to parsing malformed SRT text

const malformedText = `Okay, here are the accurate subtitles for the YouTube video in SRT format, with Japanese and English translations. 1 00:25:33,045 --> 00:28,805 健康なんていらない I don't need health 2 00:28,805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either`;

function parseFlexibleFormat(text, hasTranslation = false) {
  console.log('Testing simple flexible parsing');
  const subtitles = [];
  
  try {
    // Remove any introductory text
    let cleanText = text.replace(/^.*?(?=\d+\s+\d{1,2}:\d{2}:\d{2})/s, '');
    console.log('Clean text:', cleanText);
    
    // Use a global regex to find all subtitle patterns
    const globalPattern = /(\d+)\s+(\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})\s*(?:-->|to)\s*(\d{1,2}:\d{2}[,.:]\d{1,3})\s+([^0-9]+?)(?=\s*\d+\s+\d{1,2}:\d{2}:\d{2}|$)/gs;
    
    let match;
    while ((match = globalPattern.exec(cleanText)) !== null) {
      console.log('Match found:', match);
      const [, sequence, startTime, endTime, content] = match;
      
      // Normalize time format and fix malformed milliseconds
      let normalizedStartTime = startTime.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
      let normalizedEndTime = endTime.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
      
      console.log('Normalized times:', normalizedStartTime, '->', normalizedEndTime);
      console.log('Content:', content.trim());
      
      // Handle cases where content has both original and translation
      if (hasTranslation) {
        // Try to split by language patterns (e.g., Japanese followed by English)
        const trimmedContent = content.trim();
        const parts = trimmedContent.split(/(?=[A-Z][a-z]|\s[A-Z])/);
        
        if (parts.length >= 2) {
          subtitles.push({
            sequence: parseInt(sequence),
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            text: parts[0].trim(),
            translation: parts.slice(1).join('').trim()
          });
        } else {
          // Fallback: split roughly in half
          const midPoint = Math.floor(trimmedContent.length / 2);
          const spaceIndex = trimmedContent.indexOf(' ', midPoint);
          const splitIndex = spaceIndex > -1 ? spaceIndex : midPoint;
          
          subtitles.push({
            sequence: parseInt(sequence),
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            text: trimmedContent.substring(0, splitIndex).trim(),
            translation: trimmedContent.substring(splitIndex).trim()
          });
        }
      } else {
        subtitles.push({
          sequence: parseInt(sequence),
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
          text: content.trim()
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