const axios = require('axios');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
    const tickers = ["AAPL"];
    for (const ticker of tickers) {
        try {
            const chartOpts = {
                period1: '2019-01-01',
                period2: '2026-03-10',
                interval: '1mo'
            };
            const result = await yahooFinance.chart(ticker, chartOpts);
            const events = result.events?.dividends;

            if(events) {
                const dates = Object.keys(events).sort();
                console.log(`Found ${dates.length} dividends`);

                // Group by year correctly
                const annualDivs = {};
                for (const dateSec of dates) {
                    const evt = events[dateSec];
                    const yr = evt.date.getFullYear();
                    annualDivs[yr] = (annualDivs[yr] || 0) + evt.amount;
                }
                console.log("Annual divs:", annualDivs);

                // Calculate 5-year growth
                // We have years: 2019, 2020, 2021, 2022, 2023, 2024, 2025
                const currentYear = 2025;
                if (annualDivs[currentYear-1] && annualDivs[currentYear-6]) {
                    const cagr = Math.pow(annualDivs[currentYear-1] / annualDivs[currentYear-6], 1/5) - 1;
                    console.log(`5Y CAGR (2019 to 2024): ${(cagr*100).toFixed(2)}%`);
                }
                if (annualDivs[currentYear] && annualDivs[currentYear-5]) {
                    const cagr = Math.pow(annualDivs[currentYear] / annualDivs[currentYear-5], 1/5) - 1;
                    console.log(`5Y CAGR (2020 to 2025): ${(cagr*100).toFixed(2)}%`);
                }
            } else {
                console.log("No div events found in response");
            }
        } catch(e) {
            console.error(ticker, e.message);
        }
    }
}
run();
