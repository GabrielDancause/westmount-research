const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  try {
    const res = await axios.get('https://en.wikipedia.org/wiki/List_of_U.S._states_and_territories_by_cost_of_living', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(res.data);
    const table = $('table.wikitable').first();
    const rows = table.find('tr');
    console.log(`Found ${rows.length} rows`);
    const headers = [];
    rows.first().find('th').each((i, el) => {
      headers.push($(el).text().trim());
    });
    console.log('Headers:', headers);

    const data = [];
    rows.slice(1, 4).each((i, el) => {
      const cols = $(el).find('td, th');
      const rowData = [];
      cols.each((j, col) => {
        rowData.push($(col).text().trim());
      });
      data.push(rowData);
    });
    console.log('Sample Data:', data);
  } catch (err) {
    console.error(err.message);
  }
}
run();
