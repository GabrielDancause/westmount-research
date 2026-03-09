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

        // Let's print out the classes of the first few tr tags inside the main table
        $('tr').slice(0, 30).each((i, row) => {
            const classAttr = $(row).attr('class');
            const cols = $(row).find('td').length;
            const text = $(row).text().replace(/\s+/g, ' ').substring(0, 50);
            if(cols > 5) {
                console.log(`row ${i} [${classAttr}] cols:${cols} - ${text}`);
            }
        });

    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
