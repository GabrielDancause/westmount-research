import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/institutional-ownership.json'));
console.log(`Loaded ${data.length} items`);
