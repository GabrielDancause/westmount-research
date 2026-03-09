const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
  try {
    const symbols = ['AAPL', 'MSFT', 'AMZN', 'META', 'GOOGL'];

    // Test chart for 5 year div history
    for (const sym of symbols) {
      const q = await yahooFinance.quote(sym);
      const events = await yahooFinance.chart(sym, { period1: '2020-01-01', period2: '2026-03-01' });
      const divs = events.events?.dividends || [];
      const yield = q.dividendYield || 0;
      console.log(sym, yield, divs.length);
    }

  } catch (err) {
    console.error(err);
  }
}
run();
