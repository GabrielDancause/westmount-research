const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  try {
    const res = await axios.get('https://stockanalysis.com/stocks/aapl/dividend/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
    });
    const $ = cheerio.load(res.data);

    console.log('--- Stats ---');
    $('div').each((i, el) => {
        const txt = $(el).text();
        if (txt.includes('Dividend Yield')) {
            console.log("Yield block:", $(el).parent().text());
        }
        if (txt.includes('Growth (5Y)')) {
            console.log("Growth block:", $(el).parent().text());
        }
        if (txt.includes('Payout Ratio')) {
            console.log("Payout block:", $(el).parent().text());
        }
    });

  } catch (err) {
    console.error(err.message);
  }
}
run();
