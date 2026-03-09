const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const data = await yahooFinance.quoteSummary('AAPL', { modules: ['incomeStatementHistory', 'balanceSheetHistory', 'assetProfile', 'summaryDetail'] });
    console.log(JSON.stringify(data.incomeStatementHistory, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
