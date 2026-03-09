const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');

const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function calculateDividendMetrics(ticker) {
  try {
    const summary = await yahooFinance.quoteSummary(ticker, {
      modules: ['summaryDetail', 'assetProfile']
    });

    // Check if it's a dividend payer
    const dividendYield = summary.summaryDetail?.dividendYield || summary.summaryDetail?.trailingAnnualDividendYield || null;
    if (dividendYield === null || dividendYield === 0) {
      return null;
    }

    const quote = await yahooFinance.quote(ticker);

    const payoutRatio = summary.summaryDetail?.payoutRatio || null;
    const marketCap = summary.summaryDetail?.marketCap || quote.marketCap || null;
    const marketCapB = marketCap ? marketCap / 1e9 : null;
    const sector = summary.assetProfile?.sector || null;
    const company = quote.shortName || quote.longName || ticker;

    // Fetch historical dividend data for 5-year growth calculation
    const now = new Date();
    const currentYear = now.getFullYear();
    const period1 = `${currentYear - 6}-01-01`; // Get 6 years of data to compute 5-year growth
    const period2 = `${currentYear}-12-31`;

    let dividends = [];
    try {
      // Note: As yahooFinance.historical events='dividends' is deprecated, we use chart as a fallback if historical fails
      dividends = await yahooFinance.historical(ticker, {
        period1,
        period2,
        events: 'dividends'
      });
    } catch (e) {
      // try to use chart as fallback if historical fails
      try {
        const chartData = await yahooFinance.chart(ticker, { period1, period2, interval: '1mo' });
        if (chartData?.events?.dividends) {
            dividends = Object.values(chartData.events.dividends);
        }
      } catch (e2) {}
    }

    let divGrowth5yr = null;
    let consecutiveYears = 0; // if we don't have historical data, default to 0

    if (dividends && dividends.length > 0) {
      // Group dividends by year
      const yearlyDividends = {};
      for (const d of dividends) {
        if (!d.date || !d.amount && !d.dividends) continue;
        const amount = d.amount || d.dividends;
        // `d.date` might be a Date object or timestamp
        const dateObj = d.date instanceof Date ? d.date : new Date(d.date * 1000); // or string?
        const year = dateObj.getFullYear();
        if (isNaN(year)) continue;

        if (!yearlyDividends[year]) yearlyDividends[year] = 0;
        yearlyDividends[year] += amount;
      }

      const years = Object.keys(yearlyDividends).map(Number).sort((a, b) => a - b);

      // Calculate 5-year growth rate
      // CAGR formula: (Ending Value / Beginning Value) ^ (1 / Number of Years) - 1
      if (years.length >= 6) {
        const startYear = years[years.length - 6];
        const endYear = years[years.length - 1]; // Latest full year (or current year)

        const startDiv = yearlyDividends[startYear];
        const endDiv = yearlyDividends[endYear];

        if (startDiv > 0 && endDiv > 0) {
           divGrowth5yr = Math.pow(endDiv / startDiv, 1 / 5) - 1;
        }
      } else if (years.length >= 2) {
        // Fallback approximation
        const earliestYear = years[0];
        const latestYear = years[years.length - 1];
        const yearDiff = latestYear - earliestYear;
        if (yearDiff > 0 && yearlyDividends[earliestYear] > 0) {
           divGrowth5yr = Math.pow(yearlyDividends[latestYear] / yearlyDividends[earliestYear], 1 / yearDiff) - 1;
        }
      }

      // Calculate consecutive years of growth
      let streak = 0;
      for (let i = years.length - 1; i > 0; i--) {
        const currYear = years[i];
        const prevYear = years[i - 1];
        if (currYear - prevYear === 1 && yearlyDividends[currYear] >= yearlyDividends[prevYear]) {
          // Accepting flat or growing dividend as a consecutive year of maintaining/growing
          // If strictly growing is required, change >= to >
          streak++;
        } else {
          break;
        }
      }
      consecutiveYears = streak;
    }

    return {
      ticker,
      company,
      sector,
      dividendYield,
      divGrowth5yr,
      payoutRatio,
      consecutiveYears,
      marketCapB
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error.message);
    return null;
  }
}

async function main() {
  const rootDir = process.cwd();
  const tickersPath = path.join(rootDir, 'tickers.json');

  if (!fs.existsSync(tickersPath)) {
    console.error('tickers.json not found');
    process.exit(1);
  }

  const tickers = JSON.parse(fs.readFileSync(tickersPath, 'utf8'));
  const dataPath = path.join(rootDir, 'data');
  const outPath = path.join(dataPath, 'dividend-yield-vs-growth.json');

  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath);
  }

  const results = [];
  console.log(`Starting crawl for ${tickers.length} tickers...`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`[${i + 1}/${tickers.length}] Fetching ${ticker}...`);

    const data = await calculateDividendMetrics(ticker);
    if (data) {
      results.push(data);
    }

    // 500ms delay between requests
    await sleep(500);
  }

  // Final sort to make results consistent
  results.sort((a, b) => (b.dividendYield || 0) - (a.dividendYield || 0));

  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Finished! Saved ${results.length} dividend payers to ${outPath}`);
}

main();
