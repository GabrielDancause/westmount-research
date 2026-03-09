const fetch = global.fetch; // Memory says Node.js 18+ global fetch API is available and preferred
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function scrape() {
  console.log("Fetching IPO list...");
  const res = await fetch("https://stockanalysis.com/ipos/");
  const text = await res.text();
  const dom = new JSDOM(text);
  const rows = dom.window.document.querySelectorAll("table tbody tr");

  const ipos = [];
  for (const row of rows) {
    const cols = row.querySelectorAll("td");
    if (cols.length < 5) continue;
    const date = cols[0].textContent.trim();
    const symbol = cols[1].textContent.trim();
    const company = cols[2].textContent.trim();

    // We might need to get the IPO price. Wait, does stockanalysis show IPO price in the table?
    // Let's print out what the columns are.
    console.log(`Date: ${date}, Symbol: ${symbol}, Company: ${company}`);
    ipos.push({date, symbol, company});
    if (ipos.length >= 10) break;
  }
}
scrape().catch(console.error);
