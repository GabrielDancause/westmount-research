const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const quote = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics', 'price', 'summaryDetail'] });
    console.log(JSON.stringify(quote.financialData, null, 2));
    console.log(JSON.stringify(quote.price, null, 2));
    console.log(JSON.stringify(quote.summaryDetail, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
