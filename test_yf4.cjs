const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const data = await yahooFinance.quoteSummary('AAPL', { modules: ['defaultKeyStatistics', 'summaryDetail', 'price', 'assetProfile'] });
    console.log(JSON.stringify(data.assetProfile, null, 2));

    const yfOptions = {
        period1: '2019-01-01',
        period2: '2025-01-01',
        module: 'financials',
        type: 'annualBasicAverageShares'
    };

    // We can also just fetch quoteSummary modules 'balanceSheetHistory'
    const quoteSum = await yahooFinance.quoteSummary('AAPL', { modules: ['balanceSheetHistory', 'balanceSheetHistoryQuarterly', 'financialData', 'defaultKeyStatistics']});
    console.log(Object.keys(quoteSum));

  } catch (err) {
    console.error(err);
  }
}

test();
