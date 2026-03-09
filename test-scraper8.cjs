const axios = require('axios');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
    const tickers = ["AAPL"];
    for (const ticker of tickers) {
        try {
            const chartOpts = {
                period1: new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000), // 6 years ago
                period2: new Date(),
                interval: '1mo', // must specify to grab dividends correctly? No, events:'div' gets all for the period
                events: 'div'
            };
            const result = await yahooFinance.chart(ticker, chartOpts);
            const events = result.events?.dividends;

            if(events) {
                const dates = Object.keys(events).sort();
                console.log(`Found ${dates.length} dividends in last 6 years`);
                const latest = events[dates[dates.length - 1]];
                console.log("Latest:", latest);

                // Let's group by year to find annual growth?
                const annualDivs = {};
                for (const dateSec of dates) {
                    const d = new Date(parseInt(dateSec) * 1000);
                    const yr = d.getFullYear();
                    annualDivs[yr] = (annualDivs[yr] || 0) + events[dateSec].amount;
                }
                console.log("Annual divs:", annualDivs);
            }
        } catch(e) {
            console.error(ticker, e.message);
        }
    }
}
run();
