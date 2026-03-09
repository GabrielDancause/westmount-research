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
        const tickers = [];
        // Finviz uses a specific table structure for screener results
        $('table.screener_table tr').each((i, row) => {
            const cols = $(row).find('td');
            if(cols.length > 2) {
               const ticker = $(cols[1]).text().trim();
               if(ticker && ticker !== 'Ticker') {
                   tickers.push(ticker);
               }
            }
        });
        console.log("Tickers found:", tickers.length > 0 ? tickers.join(", ") : "None");

        // try another selector
        const t2 = [];
        $('.screener-link-primary').each((i, el) => t2.push($(el).text()));
        console.log("Tickers found (screener-link-primary):", t2.length);

        // Let's just output some table text to see what we're dealing with
        console.log("Body tables count:", $('table').length);
        console.log("Contains MO?", res.data.includes('>MO<'));
    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
