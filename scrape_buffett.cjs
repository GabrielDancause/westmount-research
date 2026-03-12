const cheerio = require('cheerio');
const fs = require('fs');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function scrape() {
    try {
        console.log("Fetching dataroma...");
        const res = await fetch('https://www.dataroma.com/m/holdings.php?m=BRK', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        const holdings = [];
        $('table#grid tbody tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length >= 7) {
                const stockText = $(tds[1]).text().trim();
                const ticker = stockText.split('-')[0].trim();
                const nameText = stockText.split('-').slice(1).join('-').trim();

                const percent = parseFloat($(tds[2]).text().trim());
                const activity = $(tds[3]).text().trim();
                const shares = parseInt($(tds[4]).text().replace(/,/g, '').trim(), 10);
                const valueStr = $(tds[6]).text().replace(/,/g, '').replace('$', '').trim();
                const value = parseInt(valueStr, 10);

                holdings.push({ ticker, nameText, percent, activity, shares, value });
            }
        });

        console.log("Scraped", holdings.length, "holdings. Fetching sectors...");

        const enriched = [];
        for (const h of holdings) {
            let sector = null;
            try {
                if (h.ticker !== "Cash" && h.ticker !== "Other") {
                    const quote = await yahooFinance.quoteSummary(h.ticker, { modules: ['assetProfile'] });
                    sector = quote.assetProfile?.sector || null;
                }
            } catch (err) {
                console.log(`Failed to fetch sector for ${h.ticker}: ${err.message}`);
            }
            enriched.push({ ...h, sector });
        }

        fs.writeFileSync('brk_enriched.json', JSON.stringify(enriched, null, 2));
        console.log("Done.");
    } catch (e) {
        console.error(e);
    }
}
scrape();
