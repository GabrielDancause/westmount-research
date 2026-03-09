const axios = require('axios');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
    const tickers = ["AAPL", "JNJ", "MSFT"];

    for (const ticker of tickers) {
        try {
            const summary = await yahooFinance.quoteSummary(ticker, { modules: ['summaryDetail', 'defaultKeyStatistics'] });

            console.log(`--- ${ticker} ---`);
            console.log("dividendYield:", summary.summaryDetail?.dividendYield);
            console.log("fiveYearAvgDividendYield:", summary.summaryDetail?.fiveYearAvgDividendYield);
            console.log("trailingAnnualDividendYield:", summary.summaryDetail?.trailingAnnualDividendYield);
            console.log("payoutRatio:", summary.summaryDetail?.payoutRatio);
            console.log("marketCap:", summary.summaryDetail?.marketCap);
            console.log("enterpriseValue:", summary.defaultKeyStatistics?.enterpriseValue);

            // Check yahoo finance for dividend history to calculate 5 year growth? Or dividend growth rate directly?

            // Let's try grabbing from Seeking Alpha or Yahoo Finance historical data
            const dividends = await yahooFinance.historical(ticker, {
                period1: new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000), // 6 years ago
                events: 'dividends'
            });
            console.log(`Found ${dividends.length} dividends in last 6 years`);
            if(dividends.length > 0) {
               console.log("Most recent:", dividends[dividends.length - 1]);
               console.log("Oldest:", dividends[0]);
            }
        } catch(e) {
            console.error(ticker, e.message);
        }
    }
}
run();
