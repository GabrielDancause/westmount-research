const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const historicalData = await yahooFinance.historical('AAPL', {
      period1: '2020-01-01',
      period2: '2026-01-01',
      interval: '1d'
    });
    console.log(historicalData[0]);
  } catch (err) {
    console.error(err);
  }
}

test();
