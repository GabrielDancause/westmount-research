const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');

const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

function calculateVolatility(quotes) {
  if (!quotes || quotes.length < 2) return null;
  const returns = [];
  for (let i = 1; i < quotes.length; i++) {
    const prevClose = quotes[i - 1].close;
    const currentClose = quotes[i].close;
    if (prevClose && currentClose) {
      returns.push((currentClose - prevClose) / prevClose);
    }
  }

  if (returns.length === 0) return null;

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize the daily volatility
  return stdDev * Math.sqrt(252);
}

function calculateYTD(quotes) {
  if (!quotes || quotes.length === 0) return null;
  const firstPrice = quotes[0].close;
  const lastPrice = quotes[quotes.length - 1].close;
  if (!firstPrice || !lastPrice) return null;
  return (lastPrice - firstPrice) / firstPrice;
}

async function main() {
  const tickersPath = path.join(__dirname, '..', 'tickers.json');
  const tickers = JSON.parse(fs.readFileSync(tickersPath, 'utf8'));

  const results = [];
  const currentYear = new Date().getFullYear();
  const ytdStart = `${currentYear}-01-01`;

  // one year ago
  const dateOneYearAgo = new Date();
  dateOneYearAgo.setFullYear(dateOneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = dateOneYearAgo.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const batchSize = 10;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);

    await Promise.all(batch.map(async (ticker) => {
      try {
        const quote = await yahooFinance.quoteSummary(ticker, {
          modules: ['summaryProfile', 'summaryDetail', 'price', 'defaultKeyStatistics']
        });

        // Fetch daily chart data for past year to calculate volatility
        let chartData52wk = [];
        try {
          const chart = await yahooFinance.chart(ticker, { period1: oneYearAgoStr, period2: todayStr, interval: '1d' });
          chartData52wk = chart.quotes || [];
        } catch (err) {
          // ignore
        }

        // Fetch YTD chart data
        let chartDataYTD = [];
        try {
          const chart = await yahooFinance.chart(ticker, { period1: ytdStart, period2: todayStr, interval: '1d' });
          chartDataYTD = chart.quotes || [];
        } catch (err) {
          // ignore
        }

        const company = quote?.price?.shortName || ticker;
        const sector = quote?.summaryProfile?.sector || null;
        const beta = quote?.defaultKeyStatistics?.beta || null;
        const avg_volume = quote?.price?.averageDailyVolume10Day || null;
        const market_cap = quote?.price?.marketCap || null;

        const volatility_52wk = calculateVolatility(chartData52wk);
        const ytd_return = calculateYTD(chartDataYTD);

        results.push({
          ticker,
          company,
          sector,
          beta,
          volatility_52wk,
          avg_volume,
          market_cap,
          ytd_return
        });
      } catch (err) {
        // console.error(`Failed to fetch data for ${ticker}: ${err.message}`);
        results.push({
          ticker,
          company: ticker,
          sector: null,
          beta: null,
          volatility_52wk: null,
          avg_volume: null,
          market_cap: null,
          ytd_return: null
        });
      }
    }));

    // small delay
    await new Promise(resolve => setTimeout(resolve, 300));
    process.stdout.write(`\rProcessed ${Math.min(i + batchSize, tickers.length)}/${tickers.length} tickers...`);
  }

  console.log();
  const outPath = path.join(__dirname, '..', 'data', 'beta-volatility.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Saved results to ${outPath}`);
}

main().catch(console.error);
