const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
  try {
    const quote = await yahooFinance.quote('AAPL');
    console.log(quote);

  } catch (err) {
    console.error(err);
  }
}
run();
