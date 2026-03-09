const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const quote = await yahooFinance.quote('MMED');
    console.log(quote);
  } catch(e) {
    console.error(e);
  }
}
test();
