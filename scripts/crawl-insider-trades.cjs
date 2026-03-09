const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function parseValue(valStr) {
  if (!valStr) return null;
  valStr = valStr.replace(/[^0-9.-]/g, '');
  if (!valStr) return null;
  return parseFloat(valStr);
}

async function fetchTable(url, expectedType) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });
  const $ = cheerio.load(data);
  const rows = $('table.tinytable tbody tr');
  const results = [];
  rows.each((i, row) => {
    const tds = $(row).find('td');
    if (tds.length < 13) return;

    const ticker = $(tds[3]).text().trim();
    if (!ticker) return;

    let transactionTypeRaw = $(tds[7]).text().trim();
    let transactionType = expectedType;
    if (transactionTypeRaw.includes('Sale+OE') || transactionTypeRaw.includes('Sale')) {
      transactionType = 'Sell';
    } else if (transactionTypeRaw.includes('Option Execute')) {
      transactionType = 'Option Exercise';
    } else if (transactionTypeRaw.includes('Purchase')) {
      transactionType = 'Buy';
    }

    results.push({
      ticker,
      company: $(tds[4]).text().trim() || null,
      insiderName: $(tds[5]).text().trim() || null,
      insiderTitle: $(tds[6]).text().trim() || null,
      transactionType,
      priceUSD: parseValue($(tds[8]).text().trim()),
      sharesTraded: parseValue($(tds[9]).text().trim()),
      sharesOwned: parseValue($(tds[10]).text().trim()),
      totalValueUSD: parseValue($(tds[12]).text().trim()),
      filingDate: $(tds[1]).text().trim() || null,
      sector: null // to be filled later
    });
  });
  return results;
}

async function getSector(ticker) {
  try {
    const result = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile'] });
    return result?.assetProfile?.sector || null;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('Fetching insider purchases...');
  const buys = await fetchTable('http://openinsider.com/insider-purchases-25k', 'Buy');
  console.log('Fetching insider sales...');
  const sells = await fetchTable('http://openinsider.com/insider-sales-100k', 'Sell');

  let allTransactions = [...buys, ...sells];
  const selectedBuys = buys.slice(0, 80);
  const selectedSells = sells.slice(0, 80);
  allTransactions = [...selectedBuys, ...selectedSells];

  console.log(`Gathered ${allTransactions.length} transactions. Fetching sectors...`);

  // Group by ticker to minimize Yahoo Finance calls
  const tickers = [...new Set(allTransactions.map(t => t.ticker))];
  const sectorMap = {};

  // Batch requests to Yahoo Finance to avoid rate limits, 5 at a time
  for (let i = 0; i < tickers.length; i += 5) {
    const batch = tickers.slice(i, i + 5);
    await Promise.all(batch.map(async (ticker) => {
      sectorMap[ticker] = await getSector(ticker);
    }));
    console.log(`Fetched sectors for ${Math.min(i + batch.length, tickers.length)}/${tickers.length} tickers`);
  }

  allTransactions.forEach(t => {
    t.sector = sectorMap[t.ticker];
    if (t.sharesTraded !== null) t.sharesTraded = Math.abs(t.sharesTraded);
    if (t.totalValueUSD !== null) t.totalValueUSD = Math.abs(t.totalValueUSD);
  });

  // Aggregations
  // Companies with most insider buying (value)
  const buyValueByCompany = {};
  selectedBuys.forEach(t => {
    if (t.totalValueUSD !== null) {
      buyValueByCompany[t.company] = (buyValueByCompany[t.company] || 0) + t.totalValueUSD;
    }
  });
  const topBuyCompanies = Object.entries(buyValueByCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([company, value]) => ({ company, value }));

  // Companies with most insider selling (value)
  const sellValueByCompany = {};
  selectedSells.forEach(t => {
    if (t.totalValueUSD !== null) {
      sellValueByCompany[t.company] = (sellValueByCompany[t.company] || 0) + t.totalValueUSD;
    }
  });
  const topSellCompanies = Object.entries(sellValueByCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([company, value]) => ({ company, value }));

  // Sectors with heaviest insider activity (total value)
  const activityBySector = {};
  allTransactions.forEach(t => {
    if (t.sector && t.totalValueUSD !== null) {
      activityBySector[t.sector] = (activityBySector[t.sector] || 0) + t.totalValueUSD;
    }
  });
  const topSectors = Object.entries(activityBySector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, value]) => ({ sector, value }));

  // Buy/sell ratio by sector
  const sectorBuySell = {};
  allTransactions.forEach(t => {
    if (t.sector && t.totalValueUSD !== null) {
      if (!sectorBuySell[t.sector]) sectorBuySell[t.sector] = { buy: 0, sell: 0 };
      if (t.transactionType === 'Buy') {
        sectorBuySell[t.sector].buy += t.totalValueUSD;
      } else {
        sectorBuySell[t.sector].sell += t.totalValueUSD;
      }
    }
  });
  const buySellRatioBySector = Object.entries(sectorBuySell).map(([sector, data]) => {
    const ratio = data.sell === 0 ? null : data.buy / data.sell;
    return { sector, buyValue: data.buy, sellValue: data.sell, ratio };
  }).filter(s => s.ratio !== null).sort((a, b) => b.ratio - a.ratio);

  const output = {
    transactions: allTransactions,
    aggregates: {
      topBuyCompanies,
      topSellCompanies,
      topSectorsActivity: topSectors,
      buySellRatioBySector
    },
    generatedAt: new Date().toISOString()
  };

  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../data/insider-trading.json'), JSON.stringify(output, null, 2));
  console.log(`Saved ${allTransactions.length} transactions to data/insider-trading.json`);
}

main().catch(console.error);
