const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const tsData = await yahooFinance.quoteSummary('AAPL', {
      modules: ['defaultKeyStatistics']
    });
    console.log(tsData.defaultKeyStatistics.sharesOutstanding);
    console.log(tsData.defaultKeyStatistics.impliedSharesOutstanding);
  } catch (err) {
    console.error(err);
  }
}

test();
