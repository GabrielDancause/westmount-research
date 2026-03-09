const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function run() {
    try {
        const url = 'https://finviz.com/screener.ashx?v=111&f=idx_sp500,fa_div_pos&o=-dividendyield';
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            }
        });
        console.log("Finviz length:", res.data.length);

        const $ = cheerio.load(res.data);
        const firstTicker = $('.screener-link-primary').first().text();
        console.log("First ticker:", firstTicker);
    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
