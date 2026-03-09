const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const quote = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics'] });
    console.log(JSON.stringify(quote, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
