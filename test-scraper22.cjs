const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
    try {
        const res = await axios.get('https://stockanalysis.com/stocks/jnj/dividend/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(res.data);

        let divGrowth5yr = null;
        let consecutiveYears = null;

        // Find by text content
        $('*:contains("Growth")').each((i, el) => {
            const text = $(el).text();
            if(text.includes('1Y') && text.length < 50) {
               console.log("1Y Parent text:", $(el).parent().text());
            }
        });

    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
