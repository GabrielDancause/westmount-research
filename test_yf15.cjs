const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function test() {
    const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/AAPL?period1=1577836800&period2=1767225600&type=annualBasicAverageShares,annualDilutedAverageShares&merge=false`;
    const res = await fetch(url, { headers: {'User-Agent': 'Mozilla/5.0'} });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}

test();
