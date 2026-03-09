const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  const result = await yahooFinance.quote('AAPL');
  console.log(Object.keys(result));
}

test().catch(console.error);
