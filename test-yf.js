import yahooFinance from 'yahoo-finance2';
yahooFinance.suppressNotices(['yahooSurvey']);
async function test() {
  const summary = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryProfile', 'financialData'] });
  console.log(summary.summaryProfile.sector, summary.summaryProfile.industry);
  console.log(summary.financialData.profitMargins, summary.financialData.operatingMargins);
}
test();
