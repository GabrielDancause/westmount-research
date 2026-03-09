const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const symbols = ['AAPL', 'MSFT', 'GOOGL'];
    const quotes = await yahooFinance.quote(symbols);
    console.log(JSON.stringify(quotes, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
