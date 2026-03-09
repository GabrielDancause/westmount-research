const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
  const chart = await yahooFinance.chart('AAPL', { period1: '2019-01-01', period2: '2025-01-01' });
  console.log(Object.keys(chart));
  console.log(Object.keys(chart.events || {}));
}

run();
