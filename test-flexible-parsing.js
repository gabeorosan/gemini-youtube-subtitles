// Test the flexible parsing function with malformed SRT text

// Simulate the malformed text from your example
const malformedText = `Okay, here are the accurate subtitles for the YouTube video in SRT format, with Japanese and English translations. 1 00:25:33,045 --> 00:28:805 健康なんていらない I don't need health 2 00:28:805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either`;

// Copy the parseFlexibleFormat function here for testing
function parseFlexibleFormat(text, hasTranslation = false) {
  console.log('Testing flexible parsing');
  const subtitles = [];
  
  try {
    // Remove any introductory text
    let cleanText = text.replace(/^.*?(?=\d+\s+\d{2}:\d{2}:\d{2})/s, '');
    console.log('Clean text:', cleanText);
    
    // Split by numbers at the start of lines to separate subtitle entries
    const entries = cleanText.split(/(?=\d+\s+\d{2}:\d{2}:\d{2})/);
    console.log('Entries found:', entries.length);
    
    for (const entry of entries) {
      if (!entry.trim()) continue;
      
      console.log('Processing entry:', entry.trim());
      
      // More flexible pattern to handle malformed timestamps
      const entryPattern = /^(\d+)\s+(\d{2}:\d{2}:\d{2}[,.:]\d{1,3})\s*(?:-->|→|to)\s*(\d{2}:\d{2}:\d{2}[,.:]\d{1,3})\s+(.+)$/s;
      const match = entry.trim().match(entryPattern);
      
      if (match) {
        console.log('Match found:', match);
        const [, sequence, startTime, endTime, content] = match;
        
        // Normalize time format and fix malformed milliseconds
        let normalizedStartTime = startTime.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
        let normalizedEndTime = endTime.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
        
        console.log('Normalized times:', normalizedStartTime, '->', normalizedEndTime);
        console.log('Content:', content);
        
        // Handle cases where content has both original and translation
        const contentParts = content.trim().split(/\s{2,}|\n+/);
        
        if (hasTranslation && contentParts.length >= 2) {
          // Try to split by language patterns (e.g., Japanese followed by English)
          const allText = contentParts.join(' ');
          const parts = allText.split(/(?=[A-Z][a-z]|\s[A-Z])/);
          
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
            const midPoint = Math.floor(allText.length / 2);
            const spaceIndex = allText.indexOf(' ', midPoint);
            const splitIndex = spaceIndex > -1 ? spaceIndex : midPoint;
            
            subtitles.push({
              sequence: parseInt(sequence),
              startTime: normalizedStartTime,
              endTime: normalizedEndTime,
              text: allText.substring(0, splitIndex).trim(),
              translation: allText.substring(splitIndex).trim()
            });
          }
        } else {
          subtitles.push({
            sequence: parseInt(sequence),
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            text: contentParts.join(' ').trim()
          });
        }
      } else {
        console.log('No match for entry:', entry.trim());
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