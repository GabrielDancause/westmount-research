const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const quote = await yahooFinance.quote('AAPL');
    console.log(quote.trailingAnnualDividendYield);
    console.log(quote.trailingAnnualDividendRate);
    console.log(quote.dividendYield);
    console.log(quote.dividendRate);

  } catch (err) {
    console.error(err);
  }
}
run();
