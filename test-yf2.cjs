const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const q = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'] });
    console.log(q.summaryDetail);
  } catch (err) {
    console.error(err);
  }
}
run();
