const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const tsData = await yahooFinance.quoteSummary('AAPL', {
      modules: ['earnings']
    });
    console.log(JSON.stringify(tsData, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
