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

        // Find by looping through all elements containing specific text
        $('*').each((i, el) => {
            const text = $(el).text();
            if(text === 'Dividend Growth(5Y)') {
               const val = $(el).next().text();
               console.log("Found 5Y next:", val);
            }
            if(text === 'Dividend Growth(1Y)') {
               const val = $(el).next().text();
               console.log("Found 1Y next:", val);
            }
        });

        // Print all labels
        $('.text-sm.text-gray-600').each((i, el) => {
            console.log("Label:", $(el).text(), "Value:", $(el).next().text());
        });

    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
