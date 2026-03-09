const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });
async function test() {
  const summary = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryProfile', 'financialData'] });
  console.log(summary.summaryProfile.sector, summary.summaryProfile.industry);
  console.log(summary.financialData.profitMargins, summary.financialData.operatingMargins);
}
test();
