const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  const tsData = await yahooFinance._env.fetch('https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/AAPL?period1=1577836800&period2=1767225600&type=annualBasicAverageShares&merge=false');
  console.log(await tsData.json());
}
test();
