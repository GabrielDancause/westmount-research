const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
async function run() {
    const data = await yahooFinance.quoteSummary('VEA', { modules: ['topHoldings'] });
    console.log(JSON.stringify(data.topHoldings.sectorWeightings, null, 2));
}
run();
