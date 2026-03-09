const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function get5YearGrowth(ticker) {
    try {
        const chartOpts = {
            period1: '2019-01-01',
            period2: '2026-03-10',
            interval: '1mo'
        };
        const result = await yahooFinance.chart(ticker, chartOpts);
        const events = result.events?.dividends;

        if(!events) return null;

        const dates = Object.keys(events).sort();
        const annualDivs = {};
        for (const dateSec of dates) {
            const evt = events[dateSec];
            const yr = evt.date.getFullYear();
            annualDivs[yr] = (annualDivs[yr] || 0) + evt.amount;
        }

        const currentYear = 2025; // using last full year
        if (annualDivs[currentYear] && annualDivs[currentYear-5]) {
            const cagr = Math.pow(annualDivs[currentYear] / annualDivs[currentYear-5], 1/5) - 1;
            return cagr;
        } else if (annualDivs[currentYear-1] && annualDivs[currentYear-6]) {
            const cagr = Math.pow(annualDivs[currentYear-1] / annualDivs[currentYear-6], 1/5) - 1;
            return cagr;
        }

        return null;
    } catch(err) {
        console.log("Error for", ticker, err.message);
        return null;
    }
}

async function run() {
    const tickers = ["AAPL", "MSFT", "JNJ", "MO"];
    for(const ticker of tickers) {
        const growth = await get5YearGrowth(ticker);
        console.log(`${ticker} 5Y Growth:`, growth ? (growth*100).toFixed(2) + "%" : "null");
    }
}
run();
