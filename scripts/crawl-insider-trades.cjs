const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function fetchOpenInsider(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (!res.ok) {
      console.error(`Failed to fetch ${url}: ${res.status}`);
      return [];
    }
    const html = await res.text();
    const dom = new JSDOM(html);
    const rows = dom.window.document.querySelectorAll('.tinytable tbody tr');
    const data = [];

    for (let i = 0; i < rows.length; i++) {
      const tds = rows[i].querySelectorAll('td');
      if (tds.length < 16) continue;

      const ticker = tds[3].textContent.trim();
      const company = tds[4].textContent.trim();
      const insiderName = tds[5].textContent.trim();
      const insiderTitle = tds[6].textContent.trim();
      const rawType = tds[7].textContent.trim();

      let transactionType = null;
      if (rawType.includes('P - Purchase')) {
        transactionType = 'Buy';
      } else if (rawType.includes('S - Sale')) {
        transactionType = 'Sell';
      } else if (rawType.includes('OE - Option Exercise')) {
        transactionType = 'Option Exercise';
      } else {
        transactionType = rawType;
      }

      let priceRaw = tds[8].textContent.trim().replace(/[\$,]/g, '');
      const priceUSD = parseFloat(priceRaw) || null;

      let qtyRaw = tds[9].textContent.trim().replace(/[\+,\-]/g, '');
      const sharesTraded = parseInt(qtyRaw, 10) || null;

      let ownedRaw = tds[10].textContent.trim().replace(/[\$,]/g, '');
      const sharesOwned = parseInt(ownedRaw, 10) || null;

      let valueRaw = tds[12].textContent.trim().replace(/[\+,\-\$]/g, '');
      const totalValueUSD = parseFloat(valueRaw) || null;

      const filingDate = tds[1].textContent.trim();

      data.push({
        ticker,
        company,
        insiderName,
        insiderTitle,
        transactionType,
        sharesTraded,
        priceUSD,
        totalValueUSD,
        sharesOwned,
        filingDate,
        sector: null // will fill later
      });
    }
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return [];
  }
}

async function main() {
  console.log("Fetching recent insider purchases...");
  const buys = await fetchOpenInsider('http://openinsider.com/insider-purchases-25k');
  console.log(`Found ${buys.length} buys.`);

  console.log("Fetching recent insider sales...");
  const sells = await fetchOpenInsider('http://openinsider.com/insider-sales-100k');
  console.log(`Found ${sells.length} sells.`);

  // Combine, prioritize buys but also include sells
  let allTransactions = [...buys, ...sells];

  // Try to get unique tickers
  const uniqueTickers = [...new Set(allTransactions.map(t => t.ticker).filter(Boolean))];

  console.log(`Fetching sectors for ${uniqueTickers.length} unique tickers...`);
  const sectorMap = {};

  const batchSize = 10;
  for (let i = 0; i < uniqueTickers.length; i += batchSize) {
    const batch = uniqueTickers.slice(i, i + batchSize);
    await Promise.all(batch.map(async (ticker) => {
      try {
        const quote = await yahooFinance.quoteSummary(ticker, { modules: ['summaryProfile'] });
        if (quote && quote.summaryProfile && quote.summaryProfile.sector) {
          sectorMap[ticker] = quote.summaryProfile.sector;
        } else {
          sectorMap[ticker] = null;
        }
      } catch (err) {
        // console.error(`Error fetching sector for ${ticker}: ${err.message}`);
        sectorMap[ticker] = null;
      }
    }));
    // small delay
    await new Promise(resolve => setTimeout(resolve, 500));
    process.stdout.write(`\rProcessed ${Math.min(i + batchSize, uniqueTickers.length)}/${uniqueTickers.length} tickers...`);
  }
  console.log();

  // Assign sectors
  allTransactions = allTransactions.map(t => ({
    ...t,
    sector: sectorMap[t.ticker] || null
  }));

  // Write to file
  const outPath = path.join(__dirname, '..', 'data', 'insider-trading.json');
  fs.writeFileSync(outPath, JSON.stringify(allTransactions, null, 2), 'utf-8');
  console.log(`Wrote ${allTransactions.length} transactions to ${outPath}`);
}

main().catch(console.error);
