const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  const modules = await yahooFinance.quoteSummary('AAPL', {
    modules: ['financialData', 'summaryProfile', 'price', 'summaryDetail', 'defaultKeyStatistics']
  });

  const roe = modules.financialData?.returnOnEquity;
  const net_income = modules.defaultKeyStatistics?.netIncomeToCommon;

  console.log({
    ticker: 'AAPL',
    company: modules.price?.shortName,
    sector: modules.summaryProfile?.sector,
    roe: roe,
    net_income: net_income,
    implied_equity: roe && net_income ? net_income / roe : null,
    market_cap: modules.price?.marketCap,
    pe_ratio: modules.summaryDetail?.trailingPE || modules.summaryDetail?.forwardPE,
  });
}

test().catch(console.error);
