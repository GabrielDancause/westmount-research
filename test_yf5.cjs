const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const tsData = await yahooFinance.fundamentalsTimeSeries('AAPL', {
      period1: '2019-01-01',
      period2: '2025-01-01',
      module: 'all',
      type: 'annualBasicAverageShares'
    });
    console.log(JSON.stringify(tsData, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
