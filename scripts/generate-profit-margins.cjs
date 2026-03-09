const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

const escapeHtml = (unsafe) => {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

async function main() {
    const tickers = JSON.parse(fs.readFileSync(path.join(__dirname, '../tickers.json'), 'utf8'));
    const results = [];
    const errors = [];

    console.log(`Fetching data for ${tickers.length} tickers...`);

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(tickers.length / batchSize)}...`);

        await Promise.all(batch.map(async (ticker) => {
            try {
                const summary = await yahooFinance.quoteSummary(ticker, { modules: ['summaryProfile', 'financialData', 'price'] });
                const profile = summary.summaryProfile || {};
                const financials = summary.financialData || {};
                const price = summary.price || {};

                if (profile.sector && profile.industry && financials.profitMargins !== undefined && financials.operatingMargins !== undefined) {
                    results.push({
                        ticker,
                        name: price.shortName || ticker,
                        sector: profile.sector,
                        industry: profile.industry,
                        netMargin: financials.profitMargins,
                        operatingMargin: financials.operatingMargins
                    });
                }
            } catch (error) {
                // Silently ignore errors for individual tickers to keep going
                errors.push(ticker);
            }
        }));
    }

    console.log(`Successfully fetched data for ${results.length} companies.`);
    if (errors.length > 0) {
        console.log(`Failed to fetch data for ${errors.length} companies.`);
    }

    // Group by industry
    const industries = {};
    for (const company of results) {
        if (!industries[company.industry]) {
            industries[company.industry] = {
                industry: company.industry,
                sector: company.sector,
                companies: [],
            };
        }
        industries[company.industry].companies.push(company);
    }

    const industryStats = [];

    for (const ind of Object.values(industries)) {
        if (ind.companies.length < 2) continue; // Skip industries with only 1 company to have meaningful medians? No, let's keep all.

        const validNetMargins = ind.companies.filter(c => c.netMargin !== null && c.netMargin !== undefined).sort((a, b) => a.netMargin - b.netMargin);
        const validOpMargins = ind.companies.filter(c => c.operatingMargin !== null && c.operatingMargin !== undefined).sort((a, b) => a.operatingMargin - b.operatingMargin);

        if (validNetMargins.length === 0) continue;

        const getMedian = (arr, key) => {
            if (arr.length === 0) return null;
            const mid = Math.floor(arr.length / 2);
            return arr.length % 2 !== 0 ? arr[mid][key] : (arr[mid - 1][key] + arr[mid][key]) / 2;
        };

        const medianNet = getMedian(validNetMargins, 'netMargin');
        const medianOp = getMedian(validOpMargins, 'operatingMargin');

        const highest = validNetMargins[validNetMargins.length - 1];
        const lowest = validNetMargins[0];

        industryStats.push({
            industry: ind.industry,
            sector: ind.sector,
            median_net_margin: medianNet,
            median_operating_margin: medianOp,
            num_companies: ind.companies.length,
            highest_margin_company: highest ? highest.name : null,
            lowest_margin_company: lowest ? lowest.name : null,
        });
    }

    // Sort by median net margin descending
    industryStats.sort((a, b) => b.median_net_margin - a.median_net_margin);

    fs.writeFileSync(path.join(__dirname, '../data-margins.json'), JSON.stringify({
        industries: industryStats,
        overallCount: results.length,
        topIndustry: industryStats[0]
    }, null, 2));

    console.log("Data saved to data-margins.json");
}

main().catch(console.error);
