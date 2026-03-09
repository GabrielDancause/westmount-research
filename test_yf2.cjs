const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  const result = await yahooFinance.quoteSummary('AAPL', { modules: ['assetProfile'] });
  console.log(result.assetProfile.sector);
}
test();
