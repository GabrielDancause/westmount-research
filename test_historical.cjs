const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const quote = await yahooFinance.quote('MMED');
    const chart = await yahooFinance.historical('MMED', { period1: '2026-03-01', period2: '2026-03-10' });
    console.log(quote);
    console.log(chart);
  } catch(e) {
    console.error(e);
  }
}
test();
