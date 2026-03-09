const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const events = await yahooFinance.historical('AAPL', { period1: '2020-01-01', events: 'dividends' });
    console.log(events);

  } catch (err) {
    console.error(err);
  }
}
run();
