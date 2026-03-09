const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/dividend-yield-vs-growth.json', 'utf8'));

console.log(`Total: ${data.length}`);
console.log(`First 3 items:`);
console.log(JSON.stringify(data.slice(0, 3), null, 2));

const payers = data.filter(d => d.dividendYield > 0);
console.log(`Payers: ${payers.length}`);

// check for valid properties
let hasNullYield = 0;
for(const d of data) {
    if(d.dividendYield === null) hasNullYield++;
}
console.log(`Null yield (non-payers/errors): ${hasNullYield}`);
