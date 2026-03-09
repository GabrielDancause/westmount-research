const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const { data } = await axios.get('http://openinsider.com/insider-sales-100k', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  const $ = cheerio.load(data);
  const rows = $('table.tinytable tbody tr').slice(0, 5);
  rows.each((i, row) => {
    const tds = $(row).find('td');
    console.log({
      filingDate: $(tds[1]).text().trim(),
      tradeDate: $(tds[2]).text().trim(),
      ticker: $(tds[3]).text().trim(),
      company: $(tds[4]).text().trim(),
      insiderName: $(tds[5]).text().trim(),
      insiderTitle: $(tds[6]).text().trim(),
      transactionType: $(tds[7]).text().trim(),
      priceUSD: $(tds[8]).text().trim(),
      sharesTraded: $(tds[9]).text().trim(),
      sharesOwned: $(tds[10]).text().trim(),
      deltaOwn: $(tds[11]).text().trim(),
      totalValueUSD: $(tds[12]).text().trim(),
    });
  });
}
test();
