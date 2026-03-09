const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/dividend-yield-vs-growth.json', 'utf8'));
const dividendPayers = data.filter(d => d.dividendYield > 0);
console.log(`Total: ${data.length}`);
console.log(`Dividend Payers: ${dividendPayers.length}`);

let missing5y = 0;
let missingCon = 0;

for(const d of dividendPayers) {
    if(d.divGrowth5yr === null) missing5y++;
    if(d.consecutiveYears === null) missingCon++;
}
console.log(`Missing 5Y Growth: ${missing5y}`);
console.log(`Missing Consecutive Years: ${missingCon}`);
