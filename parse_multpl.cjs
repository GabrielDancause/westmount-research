const fs = require('fs');

function parseHtml(filename) {
    const html = fs.readFileSync(filename, 'utf8');
    const trs = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    const data = [];
    if (trs) {
      for (const tr of trs) {
        if (tr.includes('<th>')) continue;
        const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
        if (tds && tds.length === 2) {
          let dateStr = tds[0].replace(/<td[^>]*>|<\/td>/g, '').trim();
          let valStr = tds[1].replace(/<td[^>]*>|<\/td>/g, '').replace(/<[^>]*>/g, '').replace(/%|\u2002|\u2020|†|&[a-z0-9#]+;/gi, '').trim();
          const val = parseFloat(valStr);
          if (!isNaN(val)) {
            data.push({ date: dateStr, value: val });
          }
        }
      }
    }

    // Convert to yearly
    const byYear = {};
    for (const row of data) {
        const year = new Date(row.date).getFullYear();
        if (!isNaN(year) && year >= 1960 && year <= 2026) {
            if (!byYear[year]) {
                byYear[year] = [];
            }
            byYear[year].push(row.value);
        }
    }

    const finalData = [];
    for (let year = 1960; year <= 2026; year++) {
        if (byYear[year] && byYear[year].length > 0) {
            const avg = byYear[year].reduce((a, b) => a + b, 0) / byYear[year].length;
            finalData.push({ year, value: Number(avg.toFixed(2)) });
        } else {
            finalData.push({ year, value: null });
        }
    }

    return finalData;
}

const divData = parseHtml('multpl_div_yield.html');
fs.writeFileSync('div_data.json', JSON.stringify(divData));

const treasuryData = parseHtml('multpl_10yr_rate.html');
fs.writeFileSync('treasury_data.json', JSON.stringify(treasuryData));
console.log('Parsed successfully');
