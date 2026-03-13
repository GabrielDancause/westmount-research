const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const spy = await yahooFinance.quoteSummary('SPY', { modules: ['fundProfile', 'defaultKeyStatistics', 'fundPerformance', 'price'] });
    console.log(JSON.stringify(spy, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
