// Test the flexible parsing function with malformed SRT text

// Simulate the malformed text from your example
const malformedText = `Okay, here are the accurate subtitles for the YouTube video in SRT format, with Japanese and English translations. 1 00:25:33,045 --> 00:28,805 健康なんていらない I don't need health 2 00:28,805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either`;

// Copy the parseFlexibleFormat function here for testing
function parseFlexibleFormat(text, hasTranslation = false) {
  console.log('Testing flexible parsing');
  const subtitles = [];
  
  try {
    // Remove any introductory text
    let cleanText = text.replace(/^.*?(?=\d+\s+\d{2}:\d{2}:\d{2})/s, '');
    console.log('Clean text:', cleanText);
    
    // Split by numbers at the start to separate subtitle entries
    const entries = cleanText.split(/(?=\d+\s+\d{1,2}:\d{2}:\d{2})/);
    console.log('Entries found:', entries.length);
    
    for (const entry of entries) {
      if (!entry.trim()) continue;
      
      console.log('Processing entry:', entry.trim());
      
      // Check if this entry contains multiple subtitle patterns
      const multiplePattern = /(\d+\s+\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3}\s*(?:-->|to)\s*\d{1,2}:\d{2}[,.:]\d{1,3}\s+.+?)(?=\s+\d+\s+\d{1,2}:\d{2}:\d{2}|$)/gs;
      const subEntries = [];
      let match;
      
      while ((match = multiplePattern.exec(entry)) !== null) {
        subEntries.push(match[1].trim());
      }
      
      // If no sub-entries found, treat the whole entry as one
      if (subEntries.length === 0) {
        subEntries.push(entry.trim());
      }
      
      console.log('Sub-entries found:', subEntries.length, subEntries);
      
      for (const subEntry of subEntries) {
        // More flexible pattern to handle malformed timestamps
        const entryPattern = /^(\d+)\s+(\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})\s*(?:-->|to)\s*(\d{1,2}:\d{2}[,.:]\d{1,3})\s+(.+)$/s;
        const subMatch = subEntry.match(entryPattern);
        
        if (subMatch) {
          console.log('Sub-match found:', subMatch);
          const [, sequence, startTime, endTime, content] = subMatch;
          
          // Normalize time format and fix malformed milliseconds
          let normalizedStartTime = startTime.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
          let normalizedEndTime = endTime.replace(/[.:](\d{1,3})$/, (_, ms) => `,${ms.padEnd(3, '0')}`);
          
          console.log('Normalized times:', normalizedStartTime, '->', normalizedEndTime);
          console.log('Content:', content);
          
          // Handle cases where content has both original and translation
          if (hasTranslation) {
            // Try to split by language patterns (e.g., Japanese followed by English)
            const parts = content.split(/(?=[A-Z][a-z]|\s[A-Z])/);
            
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
              const midPoint = Math.floor(content.length / 2);
              const spaceIndex = content.indexOf(' ', midPoint);
              const splitIndex = spaceIndex > -1 ? spaceIndex : midPoint;
              
              subtitles.push({
                sequence: parseInt(sequence),
                startTime: normalizedStartTime,
                endTime: normalizedEndTime,
                text: content.substring(0, splitIndex).trim(),
                translation: content.substring(splitIndex).trim()
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
        } else {
          console.log('No match for sub-entry:', subEntry);
        }
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