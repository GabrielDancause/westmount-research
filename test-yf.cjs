const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const quote = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'] });
    console.log("dividendYield:", quote.summaryDetail?.dividendYield);
    console.log("fiveYearAvgDividendYield:", quote.summaryDetail?.fiveYearAvgDividendYield);
    console.log("payoutRatio:", quote.summaryDetail?.payoutRatio);
    console.log("marketCap:", quote.summaryDetail?.marketCap);
  } catch (err) {
    console.error(err);
  }
}
run();
