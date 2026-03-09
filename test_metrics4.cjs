const fs = require('fs');
const tickers = JSON.parse(fs.readFileSync('tickers.json'));
console.log(tickers.length);
