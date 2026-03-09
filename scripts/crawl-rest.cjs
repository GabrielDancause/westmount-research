#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');

const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const OUT_FILE = path.join(__dirname, '..', 'data', 'dividend-yield-vs-growth.json');
const TICKERS_FILE = path.join(__dirname, '..', 'tickers-remaining.json');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getStockAnalysisData(ticker) {
    try {
        const res = await axios.get(`https://stockanalysis.com/stocks/${ticker}/dividend/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        const $ = cheerio.load(res.data);

        let consecutiveYears = null;

        // Find consecutive years
        const textElements = $('div, span, p, td, th');
        textElements.each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('Growth Years')) {
                const parentText = $(el).parent().text();
                const match = parentText.match(/Growth Years.*?(\d+)/);
                if (match) consecutiveYears = parseInt(match[1]);
            }
        });

        return { consecutiveYears };
    } catch (e) {
        console.warn(`[${ticker}] Failed to fetch from stockanalysis: ${e.message}`);
        return { consecutiveYears: null };
    }
}

async function getYahooFinanceData(ticker) {
    try {
        // Quote summary gives sector, yield, payout ratio
        const summary = await yahooFinance.quoteSummary(ticker, {
            modules: ['summaryProfile', 'summaryDetail', 'price', 'defaultKeyStatistics']
        });

        const sector = summary.summaryProfile?.sector || null;
        const company = summary.price?.shortName || ticker;
        const dividendYield = summary.summaryDetail?.dividendYield || summary.summaryDetail?.trailingAnnualDividendYield || null;
        const payoutRatio = summary.summaryDetail?.payoutRatio || null;
        const marketCap = summary.price?.marketCap || summary.summaryDetail?.marketCap || null;
        const marketCapB = marketCap ? marketCap / 1e9 : null;

        // Calculate 5Y Dividend Growth using chart history
        let divGrowth5yr = null;
        if (dividendYield && dividendYield > 0) {
            const currentYear = 2025; // Base our calculations backwards from last completed year
            try {
                const chartOpts = {
                    period1: '2019-01-01',
                    period2: '2026-12-31',
                    interval: '1mo'
                };
                const chartResult = await yahooFinance.chart(ticker, chartOpts);
                const events = chartResult.events?.dividends;
                if (events) {
                    const annualDivs = {};
                    for (const dateSec in events) {
                        const evt = events[dateSec];
                        const yr = evt.date.getFullYear();
                        annualDivs[yr] = (annualDivs[yr] || 0) + evt.amount;
                    }

                    if (annualDivs[currentYear] && annualDivs[currentYear - 5] && annualDivs[currentYear - 5] > 0) {
                        divGrowth5yr = Math.pow(annualDivs[currentYear] / annualDivs[currentYear - 5], 1/5) - 1;
                    } else if (annualDivs[currentYear - 1] && annualDivs[currentYear - 6] && annualDivs[currentYear - 6] > 0) {
                        divGrowth5yr = Math.pow(annualDivs[currentYear - 1] / annualDivs[currentYear - 6], 1/5) - 1;
                    } else {
                        // fallback 3y? Or just null.
                    }
                }
            } catch (e) {
                console.warn(`[${ticker}] Failed to fetch dividend history: ${e.message}`);
            }
        }

        return {
            company,
            sector,
            dividendYield,
            payoutRatio,
            marketCapB,
            divGrowth5yr
        };

    } catch (e) {
        console.warn(`[${ticker}] Failed to fetch from yahoo-finance2: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log("Loading tickers...");
    let tickers = [];
    try {
        tickers = JSON.parse(fs.readFileSync(TICKERS_FILE, 'utf-8'));
    } catch (e) {
        console.error("Failed to read tickers.json", e.message);
        process.exit(1);
    }

    console.log(`Starting data collection for ${tickers.length} tickers...`);

    const results = JSON.parse(fs.readFileSync(OUT_FILE, "utf-8"));

    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        console.log(`[${i+1}/${tickers.length}] Processing ${ticker}...`);

        const yfData = await getYahooFinanceData(ticker);

        // Skip entirely if we can't get basic info
        if (!yfData) {
            await delay(500);
            continue;
        }

        // Only fetch stockanalysis data if the company pays a dividend
        let saData = { consecutiveYears: null };
        if (yfData.dividendYield && yfData.dividendYield > 0) {
            saData = await getStockAnalysisData(ticker);
        }

        const finalData = {
            ticker,
            company: yfData.company,
            sector: yfData.sector,
            dividendYield: yfData.dividendYield,
            divGrowth5yr: yfData.divGrowth5yr,
            payoutRatio: yfData.payoutRatio,
            marketCapB: yfData.marketCapB ? parseFloat(yfData.marketCapB.toFixed(2)) : null,
            consecutiveYears: saData.consecutiveYears
        };

        results.push(finalData);

        // Save intermediate results just in case
        if ((i + 1) % 50 === 0) {
            fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
        }

        await delay(500); // 500ms delay as requested
    }

    console.log("Filtering out invalid or non-dividend payers for final output if needed, but saving all collected data...");

    fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    console.log(`Completed. Saved ${results.length} items to ${OUT_FILE}`);
}

run().catch(e => {
    console.error("Fatal error:", e);
});
