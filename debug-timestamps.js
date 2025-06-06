const malformedText = `1 00:25:33,045 --> 00:28,805 健康なんていらない I don't need health 2 00:28,805 --> 00:33,095 だって到底描ききれないや Because I can't possibly draw it all 3 00:33,705 --> 00:36,945 台本だって要らない I don't need a script either`;

console.log('Analyzing malformed timestamps...');

// Let's break down the timestamps we see:
// 1. 00:25:33,045 --> 00:28,805
// 2. 00:28,805 --> 00:33,095  
// 3. 00:33,705 --> 00:36,945

// The issue is that 00:28,805 is not HH:MM:SS,mmm format
// It's actually HH:MM,SSS format (comma in wrong place)

const patterns = [
  // Original pattern
  /(\d+)\s+(\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}[,.:]\d{1,3})/g,
  
  // Pattern for malformed timestamps like 00:28,805
  /(\d+)\s+(\d{1,2}:\d{2}[,:]\d{2,3})\s*-->\s*(\d{1,2}:\d{2}[,:]\d{2,3})/g,
  
  // Mixed pattern - handles both normal and malformed
  /(\d+)\s+((?:\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})|(?:\d{1,2}:\d{2}[,:]\d{2,3}))\s*-->\s*((?:\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3})|(?:\d{1,2}:\d{2}[,:]\d{2,3}))/g
];

patterns.forEach((pattern, i) => {
  console.log(`\n=== Pattern ${i + 1}: ${pattern} ===`);
  let match;
  const matches = [];
  while ((match = pattern.exec(malformedText)) !== null) {
    matches.push(match);
  }
  console.log(`Found ${matches.length} matches:`, matches.map(m => ({
    sequence: m[1],
    start: m[2], 
    end: m[3]
  })));
  pattern.lastIndex = 0; // Reset
});

// Test individual timestamp formats
console.log('\n=== Individual timestamp tests ===');
const timestamps = ['00:25:33,045', '00:28,805', '00:33,095', '00:36,945'];
timestamps.forEach(ts => {
  console.log(`${ts}:`);
  console.log('  Normal format:', /\d{1,2}:\d{2}:\d{2}[,.:]\d{1,3}/.test(ts));
  console.log('  Malformed format:', /\d{1,2}:\d{2}[,:]\d{2,3}/.test(ts));
});