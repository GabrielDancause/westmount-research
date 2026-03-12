const cheerio = require('cheerio');

async function scrape() {
    try {
        const res = await fetch('https://www.dataroma.com/m/holdings.php?m=BRK', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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
                // Value is in tds[6] formatted as '$61,961,735,000'
                const valueStr = $(tds[6]).text().replace(/,/g, '').replace('$', '').trim();
                const value = parseInt(valueStr, 10);

                holdings.push({ ticker, nameText, percent, activity, shares, value });
            }
        });

        console.log("HOLDINGS LENGTH:", holdings.length);
        console.log("FIRST 5:", holdings.slice(0, 5));

        const fs = require('fs');
        fs.writeFileSync('brk_data.json', JSON.stringify(holdings, null, 2));
    } catch (e) {
        console.error(e);
    }
}
scrape();
