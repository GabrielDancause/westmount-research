const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
    try {
        const url = 'https://finviz.com/screener.ashx?v=111&f=idx_sp500,fa_div_pos&o=-dividendyield';
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const $ = cheerio.load(res.data);
        const results = [];

        // Find rows with a ticker link
        $('a.screener-link').each((i, el) => {
            const row = $(el).closest('tr');
            if(row.length > 0) {
               const cols = row.find('td');
               if(cols.length >= 10) {
                   const ticker = $(cols[1]).text().trim();
                   // Wait, finviz columns for 'Overview' (v=111):
                   // No., Ticker, Company, Sector, Industry, Country, Market Cap, P/E, Price, Change, Volume
                   const company = $(cols[2]).text().trim();
                   const sector = $(cols[3]).text().trim();

                   if(ticker && ticker !== 'Ticker') {
                       results.push(ticker);
                   }
               }
            }
        });
        console.log("Found:", [...new Set(results)].slice(0, 10));

        // Let's check slickcharts S&P 500
        const res2 = await axios.get('https://www.slickcharts.com/sp500', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $2 = cheerio.load(res2.data);
        const slick = [];
        $2('table.table tbody tr').each((i, row) => {
            const cols = $2(row).find('td');
            if(cols.length >= 3) {
               const ticker = $2(cols[2]).text().trim();
               slick.push(ticker);
            }
        });
        console.log("Slickcharts S&P500:", slick.length);
        console.log("First 10 slick:", slick.slice(0,10));
    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
