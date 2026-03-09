const fs = require('fs');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function main() {
    const tickers = JSON.parse(fs.readFileSync('tickers.json', 'utf-8'));
    const results = [];

    console.log(`Fetching data for ${tickers.length} tickers...`);

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(tickers.length / batchSize)}`);

        await Promise.all(batch.map(async (ticker) => {
            try {
                const quote = await yahooFinance.quoteSummary(ticker, {
                    modules: ['summaryProfile', 'defaultKeyStatistics', 'price', 'financialData']
                });

                const company = quote.price?.shortName || quote.price?.longName || null;
                const sector = quote.summaryProfile?.sector || null;
                const price = quote.price?.regularMarketPrice || null;
                const bookValue = quote.defaultKeyStatistics?.bookValue || null;
                const pbRatio = quote.defaultKeyStatistics?.priceToBook || null;
                const marketCap = quote.price?.marketCap || null;
                const roe = quote.financialData?.returnOnEquity || null;

                if (company && sector && pbRatio !== null) {
                    results.push({
                        ticker,
                        company,
                        sector,
                        price,
                        book_value_per_share: bookValue,
                        pb_ratio: pbRatio,
                        market_cap: marketCap,
                        roe
                    });
                }
            } catch (e) {
                console.error(`Failed to fetch data for ${ticker}:`, e.message);
            }
        }));
    }

    console.log(`Successfully fetched data for ${results.length} companies.`);
    fs.writeFileSync('pb_data.json', JSON.stringify(results, null, 2));
}

main();
