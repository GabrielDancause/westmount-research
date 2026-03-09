const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const q = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'earnings', 'price', 'calendarEvents'] });
    console.log(Object.keys(q));
    console.log(q.defaultKeyStatistics);
  } catch (err) {
    console.error(err);
  }
}
run();
