const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function scrape() {
    try {
        const res = await fetch('https://www.dataroma.com/m/holdings.php?m=BRK', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });
        const html = await res.text();
        console.log(html.substring(0, 500));

        const $ = cheerio.load(html);
        const holdings = [];

        $('table#grid tbody tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length >= 6) {
                const stock = $(tds[0]).text().trim();
                const ticker = stock.split('-')[0].trim();
                const percent = $(tds[1]).text().trim();
                const shares = $(tds[2]).text().trim();
                const value = $(tds[3]).text().trim();
                const activity = $(tds[4]).text().trim();

                holdings.push({ ticker, percent, shares, value, activity });
            }
        });

        console.log(holdings.slice(0, 5));
    } catch (e) {
        console.error(e);
    }
}
scrape();
