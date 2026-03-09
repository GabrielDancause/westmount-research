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

        // Let's just grab rows by class 'table-dark-row-cp' or 'table-light-row-cp'
        $('tr[class*="table-dark-row-cp"], tr[class*="table-light-row-cp"]').each((i, row) => {
            const cols = $(row).find('td');
            if(cols.length >= 10) {
               const ticker = $(cols[1]).text().trim();
               const company = $(cols[2]).text().trim();
               const sector = $(cols[3]).text().trim();

               if(ticker && ticker !== 'Ticker') {
                   results.push({ticker, company, sector});
               }
            }
        });
        console.log("Found:", results.slice(0, 10));
    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
