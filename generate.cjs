const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeCostOfLiving() {
    const res = await axios.get('https://meric.mo.gov/data/cost-living-data-series', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(res.data);
    const table = $('table').first();
    const rows = table.find('tr');

    const data = [];
    rows.slice(1).each((i, el) => {
      const cols = $(el).find('td, th');
      if (cols.length >= 9) {
          const state = $(cols[1]).text().trim();
          if (state && state !== 'State' && state !== 'United States') {
            data.push({
                state: state,
                index: parseFloat($(cols[2]).text().trim()),
                grocery: parseFloat($(cols[3]).text().trim()),
                housing: parseFloat($(cols[4]).text().trim()),
                utilities: parseFloat($(cols[5]).text().trim()),
                transportation: parseFloat($(cols[6]).text().trim()),
                health: parseFloat($(cols[7]).text().trim()),
                misc: parseFloat($(cols[8]).text().trim())
            });
          }
      }
    });
    return data;
}

async function scrapeIncome() {
    const res = await axios.get('https://en.wikipedia.org/wiki/List_of_U.S._states_and_territories_by_income', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(res.data);
    const table = $('table.wikitable').first();
    const rows = table.find('tr');

    const data = {};
    rows.slice(1).each((i, el) => {
      const cols = $(el).find('td, th');
      if (cols.length >= 2) {
          const state = $(cols[0]).text().trim().replace(/\[.*?\]/g, '').replace(' Washington, D.C.', 'District of Columbia').trim();
          let incomeStr = $(cols[1]).text().trim().replace(/[^0-9.]/g, '');
          if (incomeStr) {
             data[state] = parseFloat(incomeStr);
          }
      }
    });
    return data;
}

async function scrapeTaxWalletHub() {
    try {
        const res = await axios.get('https://wallethub.com/edu/states-with-highest-lowest-tax-burden/20494', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(res.data);
        const data = {};
        $('table').first().find('tr').slice(1).each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 3) {
                const state = $(cols[1]).text().trim();
                const taxStr = $(cols[2]).text().trim();
                const tax = parseFloat(taxStr.replace('%',''));
                if (state && !isNaN(tax)) {
                    data[state] = tax;
                }
            }
        });
        return data;
    } catch(err) {
        return {};
    }
}

async function run() {
    const colData = await scrapeCostOfLiving();
    const incomeData = await scrapeIncome();
    const taxData = await scrapeTaxWalletHub();

    const finalData = colData.map(d => {
        let income = incomeData[d.state] || null;
        if (!income && d.state === 'District of Columbia') income = incomeData['Washington, D.C.'];
        if (!income) {
             const key = Object.keys(incomeData).find(k => k.startsWith(d.state));
             if (key) income = incomeData[key];
        }

        let tax = taxData[d.state] || null;
        let effectiveIncome = income ? income * (1 - (tax || 0) / 100) : income;

        return {
            ...d,
            income: income,
            taxBurden: tax,
            effectiveIncome: effectiveIncome ? parseFloat(effectiveIncome.toFixed(0)) : null,
            affordabilityScore: effectiveIncome ? parseFloat((effectiveIncome / d.index).toFixed(2)) : null
        }
    }).filter(d => d.state !== 'Puerto Rico' && d.state !== 'District of Columbia' && d.state !== 'United States');

    finalData.sort((a,b) => a.index - b.index);
    fs.writeFileSync('colData.json', JSON.stringify(finalData, null, 2));
}

run();
