const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });
const fs = require('fs');

async function main() {
  const tickers = JSON.parse(fs.readFileSync('tickers.json', 'utf8'));
  console.log(`Processing ${tickers.length} tickers...`);

  const results = [];
  const start = Date.now();
  for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      if (i % 25 === 0) console.log(`[${i}/${tickers.length}] Fetching ${ticker}...`);
      try {
          // Attempt to fetch quote, and optionally assetProfile via quoteSummary
          const quote = await yahooFinance.quote(ticker);
          const currentShares = quote.sharesOutstanding;
          const marketCap = quote.marketCap;
          const company = quote.longName || quote.shortName || ticker;

          let sector = "Unknown";
          // We can get sector from quoteSummary
          try {
             const summary = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile'] });
             sector = summary.assetProfile?.sector || "Unknown";
          } catch(e) {}

          // Get historical shares outstanding from Yahoo fundamentals-timeseries API
          const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${ticker}?period1=1577836800&period2=1767225600&type=annualBasicAverageShares&merge=false`;
          const res = await fetch(url, { headers: {'User-Agent': 'Mozilla/5.0'} });
          const json = await res.json();
          let shares_5yr_ago = null;

          if (json && json.timeseries && json.timeseries.result && json.timeseries.result.length > 0) {
              const sharesData = json.timeseries.result[0].annualBasicAverageShares;
              if (sharesData && sharesData.length > 0) {
                  // find the earliest year (closest to 5 years ago, typically 2020-2021)
                  const sorted = sharesData.sort((a,b) => new Date(a.asOfDate) - new Date(b.asOfDate));
                  shares_5yr_ago = sorted[0].reportedValue.raw;
              }
          }

          let change_pct = null;
          let type = null;
          if (shares_5yr_ago && currentShares) {
              change_pct = ((currentShares - shares_5yr_ago) / shares_5yr_ago) * 100;
              type = change_pct > 0 ? "Diluter" : "Reducer";
          }

          if (shares_5yr_ago && currentShares) {
              results.push({
                  ticker,
                  company,
                  sector,
                  shares_5yr_ago,
                  shares_current: currentShares,
                  change_pct,
                  market_cap: marketCap,
                  type
              });
          }

      } catch (err) {
          // ignore individual ticker errors
      }

      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
  }

  // Sort by dilution
  results.sort((a,b) => b.change_pct - a.change_pct);

  fs.writeFileSync('data/share-dilution.json', JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} results to data/share-dilution.json in ${(Date.now() - start)/1000}s`);
}

main();
