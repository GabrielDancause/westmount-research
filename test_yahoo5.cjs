const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const quote = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics', 'price', 'summaryDetail'] });
    const cap = quote.price.marketCap || quote.summaryDetail.marketCap;
    const fcf = quote.financialData.freeCashflow;
    const yield = (fcf / cap) * 100;
    console.log(`Cap: ${cap}, FCF: ${fcf}, Yield: ${yield}`);
  } catch (e) {
    console.error(e);
  }
}
run();
