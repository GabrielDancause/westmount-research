const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
  try {
    const data = await yahooFinance.fundamentalsTimeSeries('AAPL', {
        period1: '2020-01-01',
        module: 'financials',
        type: 'operatingMargin'
    });
    console.log(data);
  } catch (e) {
    console.error(e.message);
  }
}
run();
