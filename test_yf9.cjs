const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const data = await yahooFinance.quoteSummary('AAPL', {
      modules: ['incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory', 'earnings', 'financialData', 'defaultKeyStatistics']
    });
    console.log(Object.keys(data));
  } catch (err) {
    console.error(err);
  }
}

test();
