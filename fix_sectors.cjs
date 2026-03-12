const fs = require('fs');
const enriched = JSON.parse(fs.readFileSync('brk_enriched.json', 'utf8'));

// HEI.A -> HEI
// LEN.B -> LEN
const fixes = {
    'HEI.A': 'Industrials',
    'LEN.B': 'Consumer Cyclical'
};

for (const h of enriched) {
    if (!h.sector && fixes[h.ticker]) {
        h.sector = fixes[h.ticker];
    }
}

fs.writeFileSync('brk_enriched.json', JSON.stringify(enriched, null, 2));
