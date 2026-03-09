const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const data = await yahooFinance.quote('AAPL');
    console.log(JSON.stringify(data, null, 2));

    const moduleData = await yahooFinance.fundamentalsTimeSeries('AAPL', {
      period1: '2019-01-01',
      period2: '2025-01-01',
      type: 'annualBasicAverageShares'
    });
    console.log(JSON.stringify(moduleData, null, 2));

  } catch (err) {
    console.error(err);
  }
}

test();
