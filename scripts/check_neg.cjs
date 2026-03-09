const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/debt-to-equity.json'));

let hasNeg = false;
for (const d of data) {
    if (d.debtToEquity < 0) hasNeg = true;
}
console.log(`Has negative D/E: ${hasNeg}`);
