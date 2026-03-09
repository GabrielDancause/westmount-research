const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const tickers = JSON.parse(fs.readFileSync('tickers.json'));
console.log(`Loaded ${tickers.length} tickers`);
