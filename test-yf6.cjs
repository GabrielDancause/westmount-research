const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
  try {
    const events = await yahooFinance.chart('AAPL', { period1: '2020-01-01', period2: '2026-03-01' });
    const divs = events.events?.dividends;
    console.log(divs);

  } catch (err) {
    console.error(err);
  }
}
run();
