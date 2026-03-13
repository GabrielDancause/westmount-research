const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
const fs = require('fs');

async function fix() {
    let html = fs.readFileSync('public/vea-etf-review-2026.html', 'utf8');

    // Fetch sectors and countries
    const topHoldings = await yahooFinance.quoteSummary('VEA', { modules: ['topHoldings'] });
    const profile = await yahooFinance.quoteSummary('VEA', { modules: ['fundProfile'] }); // wait, country is in what module?

    // Check if fundProfile or topHoldings has countries.
    // Let me log modules first.
}
fix();
