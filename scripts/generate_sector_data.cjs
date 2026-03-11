const fs = require('fs');
const path = require('path');
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

const sectors = [
  { name: "Information Technology", ticker: "XLK", symbol: "^SP500-45" },
  { name: "Health Care", ticker: "XLV", symbol: "^SP500-35" },
  { name: "Financials", ticker: "XLF", symbol: "^SP500-40" },
  { name: "Consumer Discretionary", ticker: "XLY", symbol: "^SP500-25" },
  { name: "Communication Services", ticker: "XLC", symbol: "^SP500-50" },
  { name: "Industrials", ticker: "XLI", symbol: "^SP500-20" },
  { name: "Consumer Staples", ticker: "XLP", symbol: "^SP500-30" },
  { name: "Energy", ticker: "XLE", symbol: "^SP500-10" },
  { name: "Utilities", ticker: "XLU", symbol: "^SP500-55" },
  { name: "Real Estate", ticker: "XLRE", symbol: "^SP500-60" },
  { name: "Materials", ticker: "XLB", symbol: "^SP500-15" }
];

async function run() {
  const results = [];

  for (const sector of sectors) {
    let price = null;
    let change = null;
    let changePercent = null;
    let pe = null;
    let yield = null;
    let ytdReturn = null;

    try {
      // Get ETF quote for basic stats
      const etfQuote = await yahooFinance.quote(sector.ticker);
      price = etfQuote.regularMarketPrice;
      change = etfQuote.regularMarketChange;
      changePercent = etfQuote.regularMarketChangePercent;
      pe = etfQuote.trailingPE || null;
      yield = etfQuote.trailingAnnualDividendYield ? (etfQuote.trailingAnnualDividendYield * 100) : null;

      if (etfQuote.ytdReturn !== undefined) {
         ytdReturn = etfQuote.ytdReturn;
      }

      const now = new Date();
      // Get 1 year historical data for chart
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const chartData = await yahooFinance.chart(sector.ticker, { period1: oneYearAgo, period2: now, interval: "1mo" });
      const history = chartData.quotes.map(d => ({ date: new Date(d.date).toISOString().split('T')[0], close: d.close }));

      // Attempt to get historical data for ETF for YTD if not available
      if (ytdReturn === null || ytdReturn === undefined) {
          try {
              const startOfYear = new Date(now.getFullYear(), 0, 1);
              const hist = await yahooFinance.chart(sector.ticker, { period1: startOfYear, period2: now, interval: "1d" });
              if (hist && hist.quotes && hist.quotes.length > 0) {
                  const startPrice = hist.quotes[0].close;
                  const endPrice = hist.quotes[hist.quotes.length - 1].close;
                  ytdReturn = ((endPrice - startPrice) / startPrice) * 100;
              }
          } catch(e) {
              console.log(`Failed history for ${sector.ticker}: ${e.message}`);
          }
      }

      results.push({
        name: sector.name,
        ticker: sector.ticker,
        price,
        change,
        changePercent,
        pe,
        yield,
        ytdReturn,
        history
      });
      console.log(`Processed ${sector.name}`);
    } catch(e) {
      console.log(`Failed to fetch Yahoo data for ${sector.ticker}: ${e.message}`);
      // Fallback data
      results.push({
         name: sector.name,
         ticker: sector.ticker,
         price: null,
         change: null,
         changePercent: null,
         pe: null,
         yield: null,
         ytdReturn: null,
         history: []
      });
    }
  }

  // Calculate Relative Strength Indicator (RSI) using SPY as benchmark
  let spyHistory = null;
  try {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const spyData = await yahooFinance.chart('SPY', { period1: oneYearAgo, period2: now, interval: "1mo" });
      spyHistory = spyData.quotes.map(d => ({ date: new Date(d.date).toISOString().split('T')[0], close: d.close }));
  } catch(e) {
      console.log('Failed to fetch SPY data for relative strength');
  }

  if (spyHistory) {
      for (const result of results) {
          if (result.history.length > 0) {
              const startPrice = result.history[0].close;
              const endPrice = result.history[result.history.length - 1].close;
              const sectorReturn = ((endPrice - startPrice) / startPrice) * 100;

              const spyStartPrice = spyHistory[0].close;
              const spyEndPrice = spyHistory[spyHistory.length - 1].close;
              const spyReturn = ((spyEndPrice - spyStartPrice) / spyStartPrice) * 100;

              result.relativeStrength = sectorReturn - spyReturn;
          } else {
              result.relativeStrength = 0;
          }
      }
  }

  fs.writeFileSync(path.join(process.cwd(), 'public', 'sector-data.json'), JSON.stringify(results, null, 2));
  console.log("Done generating sector data");
}

run().catch(console.error);
