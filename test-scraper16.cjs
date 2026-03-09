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

        // Find rows with styled background colors in Finviz table
        $('table').each((i, table) => {
            const rows = $(table).find('tr');
            if(rows.length > 10) {
               // checking if it's the data table
               const firstRowText = $(rows[0]).text().replace(/\s+/g, ' ').trim();
               if(firstRowText.includes('Ticker') || firstRowText.includes('Company')) {
                   console.log(`Table ${i} has ${rows.length} rows`);
                   rows.slice(1).each((j, row) => { // skip header
                       const cols = $(row).find('td');
                       if(cols.length > 5) {
                           const ticker = $(cols[1]).text().trim();
                           const company = $(cols[2]).text().trim();
                           const sector = $(cols[3]).text().trim();
                           const price = $(cols[8]).text().trim();

                           if(ticker) {
                               results.push({ticker, company, sector, price});
                           }
                       }
                   });
               }
            }
        });
        console.log("Found:", results.slice(0, 10));
    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
