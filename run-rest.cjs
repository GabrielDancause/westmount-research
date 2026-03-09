const fs = require('fs');
const script = fs.readFileSync('scripts/crawl-dividend-yield-vs-growth.cjs', 'utf8');
const newScript = script.replace(
    `const TICKERS_FILE = path.join(__dirname, '..', 'tickers.json');`,
    `const TICKERS_FILE = path.join(__dirname, '..', 'tickers-remaining.json');`
).replace(
    `const results = [];`,
    `const results = JSON.parse(fs.readFileSync(OUT_FILE, "utf-8"));`
);
fs.writeFileSync('scripts/crawl-rest.cjs', newScript);
