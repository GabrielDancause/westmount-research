const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
const fs = require('fs');

async function testSectors() {
    const holdings = JSON.parse(fs.readFileSync('brk_data.json', 'utf8'));
    for (let h of holdings.slice(0, 5)) {
        try {
            const quote = await yahooFinance.quoteSummary(h.ticker, { modules: ['assetProfile'] });
            const sector = quote.assetProfile?.sector;
            console.log(h.ticker, sector);
        } catch (e) {
            console.log(h.ticker, 'Error', e.message);
        }
    }
}
testSectors();
