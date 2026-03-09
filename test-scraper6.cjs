const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  try {
    const res = await axios.get('https://stockanalysis.com/stocks/aapl/dividend/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(res.data);

    // Find divs with class or text that might contain Growth (5Y)
    // stockanalysis changed their layout sometimes.
    const textElements = $('td, th, span, div, p');
    let found = false;
    textElements.each((i, el) => {
        const text = $(el).text();
        if (text.includes('Growth') && text.length < 50) {
            console.log("Found Growth element:", text, $(el).html());
            found = true;
        }
    });

  } catch (err) {
    console.error(err.message);
  }
}
run();
