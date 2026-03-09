const axios = require('axios');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function run() {
    try {
        const res = await axios.get('https://stockanalysis.com/stocks/jnj/dividend/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(res.data);

        let divGrowth5yr = null;
        let consecutiveYears = null;

        $('div, span, p, td, th').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('Dividend Growth(5Y)')) {
                // Find next text block with %
                const parentText = $(el).parent().text();
                const match = parentText.match(/Dividend Growth\(5Y\).*?([\d.]+)%/);
                if (match) divGrowth5yr = parseFloat(match[1]) / 100;
            }
            if (text.includes('Growth Years')) {
                const parentText = $(el).parent().text();
                const match = parentText.match(/Growth Years.*?(\d+)/);
                if (match) consecutiveYears = parseInt(match[1]);
            }
        });

        console.log("JNJ from stockanalysis:", { divGrowth5yr, consecutiveYears });
    } catch(err) {
        console.log("Error:", err.message);
    }
}
run();
