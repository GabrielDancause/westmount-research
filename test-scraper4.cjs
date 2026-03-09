const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  try {
    const res = await axios.get('https://stockanalysis.com/stocks/aapl/dividend/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
    });
    const $ = cheerio.load(res.data);

    console.log('--- Stats ---');
    $('table').each((i, el) => {
        console.log($(el).text().substring(0, 100));
    });

    console.log('--- Divs ---');
    $('div').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Growth')) {
           // console.log($(el).text().substring(0, 50));
        }
    });
  } catch (err) {
    console.error(err.message);
  }
}
run();
