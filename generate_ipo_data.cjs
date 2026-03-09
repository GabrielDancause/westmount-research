const fetch = global.fetch;
const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const escapeHtml = (unsafe) => {
    if (!unsafe) return null;
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function run() {
  console.log("Fetching IPO list...");
  const res = await fetch("https://stockanalysis.com/ipos/");
  const text = await res.text();
  const dom = new JSDOM(text);
  const rows = Array.from(dom.window.document.querySelectorAll("table tbody tr"));

  const results = [];

  for (const row of rows.slice(0, 15)) { // process top 15
    const cols = row.querySelectorAll("td");
    if (cols.length < 6) continue;
    const date = cols[0].textContent.trim();
    const ticker = cols[1].textContent.trim();
    const company = cols[2].textContent.trim();
    const ipo_price_str = cols[3].textContent.trim();
    const first_day_close_str = cols[4].textContent.trim();
    const first_day_return_str = cols[5].textContent.trim();

    // some rows don't have prices yet (just dashes)
    if (ipo_price_str === '-' || first_day_close_str === '-') {
      continue;
    }

    let ipo_price = parseFloat(ipo_price_str.replace('$', '').replace(/,/g, ''));
    let first_day_close = parseFloat(first_day_close_str.replace('$', '').replace(/,/g, ''));
    let first_day_return = first_day_return_str === '-' ? null : parseFloat(first_day_return_str.replace('%', ''));

    // if parsing failed, fallback
    if (isNaN(ipo_price)) ipo_price = null;
    if (isNaN(first_day_close)) first_day_close = null;
    if (isNaN(first_day_return)) first_day_return = null;

    let current_price = null;
    let return_from_ipo = null;
    let sector = null;

    try {
      const quote = await yahooFinance.quote(ticker);
      current_price = quote.regularMarketPrice || null;
      if (current_price !== null && ipo_price !== null) {
        return_from_ipo = ((current_price - ipo_price) / ipo_price) * 100;
      }

      const quoteSum = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile'] });
      if (quoteSum && quoteSum.assetProfile && quoteSum.assetProfile.sector) {
        sector = quoteSum.assetProfile.sector;
      }
    } catch(e) {
      console.log(`Failed to fetch Yahoo data for ${ticker}: ${e.message}`);
    }

    results.push({
      company: escapeHtml(company),
      ticker: escapeHtml(ticker),
      ipo_date: escapeHtml(date),
      ipo_price,
      first_day_close,
      first_day_return,
      current_price,
      return_from_ipo,
      sector: escapeHtml(sector)
    });
    console.log(`Processed ${ticker}`);

    // add a small delay
    await new Promise(r => setTimeout(r, 500));
  }

  // Save to JSON
  fs.writeFileSync(path.join(process.cwd(), 'ipo-data.json'), JSON.stringify(results, null, 2));
  console.log("Done");
}

run().catch(console.error);
