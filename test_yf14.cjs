const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
  try {
    const quote = await yahooFinance.quote('AAPL');
    console.log("Current Shares:", quote.sharesOutstanding);
    console.log("Market Cap:", quote.marketCap);

    // There doesn't seem to be an easy way to get historical shares outstanding reliably from yahoo-finance2
    // Let's check 'fundamentalsTimeSeries' once more without 'module' option as it was complaining about it
    // Wait, it complained "missing module", then I put module, then "option type invalid"
    const opts = {
        period1: '2020-01-01',
        period2: '2026-01-01',
        module: 'all',
        type: 'annualBasicAverageShares'
    };
    try {
        const query = await yahooFinance._env.fetch(`https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/AAPL?period1=1577836800&period2=1767225600&type=annualBasicAverageShares,annualDilutedAverageShares`);
        const json = await query.json();
        console.log(JSON.stringify(json, null, 2));
    } catch(e) {
        console.error("raw fetch failed", e);
    }

  } catch (err) {
    console.error(err);
  }
}

test();
