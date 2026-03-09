const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const data = await yahooFinance.quote('AAPL');
    const chart = await yahooFinance.chart('AAPL', { period1: '2021-01-01', interval: '1mo' });
    console.log(Object.keys(chart));
    console.log(Object.keys(chart.meta));

  } catch (err) {
    console.error(err);
  }
}

test();
