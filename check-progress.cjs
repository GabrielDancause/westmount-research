const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/dividend-yield-vs-growth.json', 'utf8'));
console.log(`Saved ${data.length} items out of 500`);
