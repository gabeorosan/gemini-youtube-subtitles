const malformedText = `1 00:25:33,045 --> 00:28,805 健康なんていらない I don't need health 2 00:28,805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either`;

console.log('Original text:', malformedText);

// Test different regex patterns
const patterns = [
  /(\d+)\s+(\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})\s*(?:-->|to)\s*(\d{1,2}:\d{2}[,.:]\d{1,3})/g,
  /(\d+)\s+(\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}[,.:]\d{1,3})/g,
  /(\d+)\s+(\d{2}:\d{2}:\d{2}[,.:]\d{1,3})\s*-->\s*(\d{2}:\d{2}[,.:]\d{1,3})/g
];

patterns.forEach((pattern, i) => {
  console.log(`\n=== Pattern ${i + 1}: ${pattern} ===`);
  let match;
  while ((match = pattern.exec(malformedText)) !== null) {
    console.log('Match:', match);
  }
  pattern.lastIndex = 0; // Reset for next test
});

// Test manual splitting
console.log('\n=== Manual approach ===');
const entries = malformedText.split(/(?=\d+\s+\d{2}:\d{2}:\d{2})/);
console.log('Split entries:', entries);

// Test with a simpler approach - find all timestamps first
console.log('\n=== Find timestamps ===');
const timestampPattern = /(\d+)\s+(\d{2}:\d{2}:\d{2}[,.:]\d{1,3})\s*-->\s*(\d{2}:\d{2}[,.:]\d{1,3})/g;
let match;
while ((match = timestampPattern.exec(malformedText)) !== null) {
  console.log('Timestamp match:', match);
  const startPos = match.index;
  const endPos = timestampPattern.lastIndex;
  console.log('Position:', startPos, 'to', endPos);
  
  // Find the next timestamp or end of string
  const nextMatch = timestampPattern.exec(malformedText);
  const contentEnd = nextMatch ? nextMatch.index : malformedText.length;
  timestampPattern.lastIndex = endPos; // Reset to continue from current position
  
  const content = malformedText.substring(endPos, contentEnd).trim();
  console.log('Content:', content);
}