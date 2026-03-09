const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  const tsData = await yahooFinance.fundamentalsTimeSeries('AAPL', {
    period1: '2020-01-01',
    period2: '2026-01-01',
    module: 'financials',
    type: 'annualBasicAverageShares'
  });
  console.log(tsData);
}
test();
