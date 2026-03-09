const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  const result = await yahooFinance.quoteSummary('AAPL', {
    modules: ['financialData', 'summaryProfile', 'price', 'summaryDetail', 'defaultKeyStatistics']
  });
  const data = result;

  // ROE from financialData (could be fallback or check)
  console.log("ROE from yf:", data.financialData.returnOnEquity);

  // Manual ROE calculation: Net Income / Total Shareholder Equity
  // Let's check balance sheet
  const bs = await yahooFinance.quoteSummary('AAPL', { modules: ['balanceSheetHistory'] });
  console.log("Balance sheet keys:", Object.keys(bs));
  if (bs.balanceSheetHistory && bs.balanceSheetHistory.balanceSheetStatements) {
    const latest = bs.balanceSheetHistory.balanceSheetStatements[0];
    console.log("Total Stockholder Equity:", latest.totalStockholderEquity);
  }
}

test().catch(console.error);
