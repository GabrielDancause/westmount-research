const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
  const quote = await yahooFinance.quote('SPY');
  console.log(quote.regularMarketPrice);
}
run();
