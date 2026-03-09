const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });
const fs = require('fs');

async function test() {
  const result = await yahooFinance.quoteSummary('AAPL', {
    modules: ['financialData', 'summaryProfile', 'price', 'summaryDetail', 'defaultKeyStatistics']
  });
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
