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

        // Let's use the simplest approach, finviz puts a specific class on ticker links
        $('.screener-link-primary').each((i, el) => {
            const ticker = $(el).text();
            results.push(ticker);
        });

        // Wait, class might not be screener-link-primary anymore.
        $('a.tab-link').each((i, el) => {
            const text = $(el).text();
            const href = $(el).attr('href');
            if(href && href.startsWith('quote.ashx?t=')) {
               results.push(text);
            }
        });

        console.log("Found links:", results.length > 0 ? results : "None");

        // Let's dump all hrefs that look like quote.ashx?t=
        const quoteHrefs = [];
        $('a').each((i, el) => {
           const href = $(el).attr('href');
           if(href && href.includes('quote.ashx?t=')) {
               quoteHrefs.push($(el).text());
           }
        });
        console.log("quote.ashx links:", quoteHrefs.slice(0, 10));

    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
