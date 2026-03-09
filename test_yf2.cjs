const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const data = await yahooFinance.quoteSummary('AAPL', { modules: ['defaultKeyStatistics', 'summaryDetail', 'price'] });
    console.log(JSON.stringify(data.defaultKeyStatistics, null, 2));

    const tsData = await yahooFinance.fundamentalsTimeSeries('AAPL', {
      period1: '2019-01-01',
      period2: '2025-01-01',
      module: 'annualBasicAverageShares',
      type: 'annualBasicAverageShares'
    });
    console.log(JSON.stringify(tsData, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
