const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');

// Configure YahooFinance
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const DELAY_MS = 500;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchSP500() {
  console.log('Fetching S&P 500 list from Wikipedia...');
  const response = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', {
    headers: { 'User-Agent': 'WestmountResearchBot/1.0 (contact@westmountresearch.com)' }
  });
  const data = await response.text();
  const $ = cheerio.load(data);
  const companies = [];

  $('#constituents tbody tr').each((i, el) => {
    if (i === 0) return; // skip header
    const tds = $(el).find('td');
    const ticker = tds.eq(0).text().trim().replace('.', '-'); // BRK.B -> BRK-B
    const company = tds.eq(1).text().trim();
    const sector = tds.eq(2).text().trim();
    companies.push({ ticker, company, sector });
  });

  return companies;
}

function calculate5YrGrowth(dividends) {
  if (!dividends || dividends.length === 0) return null;

  // Group dividends by year
  const yearlyDivs = {};
  dividends.forEach(d => {
    const year = new Date(d.date).getFullYear();
    yearlyDivs[year] = (yearlyDivs[year] || 0) + d.amount;
  });

  const currentYear = new Date().getFullYear();
  const years = Object.keys(yearlyDivs).map(Number).sort((a, b) => a - b);
  if (years.length < 2) return null;

  const latestYear = years[years.length - 1] === currentYear ? years[years.length - 2] : years[years.length - 1];
  if (!latestYear) return null;

  const oldestYear = years.find(y => y <= latestYear - 5) || years[0];
  if (latestYear <= oldestYear) return null;

  const latestDiv = yearlyDivs[latestYear];
  const oldestDiv = yearlyDivs[oldestYear];

  if (!oldestDiv || oldestDiv <= 0 || !latestDiv) return null;

  const yearDiff = latestYear - oldestYear;
  const cagr = Math.pow(latestDiv / oldestDiv, 1 / yearDiff) - 1;
  return cagr;
}

async function run() {
  try {
    const companies = await fetchSP500();
    console.log(`Found ${companies.length} companies.`);

    // just to make the process reasonably fast but robust, I will map all tickers
    // but the actual run shouldn't crash on individual errors

    const results = [];
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 6);
    const period1 = fiveYearsAgo.toISOString().split('T')[0];
    const period2 = new Date().toISOString().split('T')[0];

    for (let i = 0; i < companies.length; i++) {
      const { ticker, company, sector } = companies[i];
      console.log(`[${i+1}/${companies.length}] Processing ${ticker}...`);

      try {
        const quote = await yahooFinance.quoteSummary(ticker, {
          modules: ['summaryDetail', 'defaultKeyStatistics']
        });

        const summaryDetail = quote.summaryDetail || {};
        const yield = summaryDetail.dividendYield || null;
        const payoutRatio = summaryDetail.payoutRatio || null;
        const marketCap = summaryDetail.marketCap || null;

        let divGrowth5yr = null;
        let consecutiveYears = null;

        if (yield && yield > 0) {
          try {
            const chartData = await yahooFinance.chart(ticker, { period1, period2 });
            const divs = chartData.events?.dividends || [];
            const divArray = Object.values(divs).sort((a, b) => new Date(a.date) - new Date(b.date));
            divGrowth5yr = calculate5YrGrowth(divArray);
          } catch (chartErr) {
             console.log(`  Failed to fetch chart data for ${ticker}: ${chartErr.message}`);
          }
        }

        if (yield !== null) {
          results.push({
            ticker,
            company,
            sector,
            dividendYield: yield,
            divGrowth5yr,
            payoutRatio,
            consecutiveYears,
            marketCapB: marketCap ? marketCap / 1e9 : null
          });
        }

      } catch (err) {
        console.log(`  Error fetching ${ticker}: ${err.message}`);
      }

      await sleep(DELAY_MS);
    }

    const payersWithGrowth = results.filter(r => r.divGrowth5yr !== null);

    const sortedYields = [...results].map(r => r.dividendYield).sort((a, b) => a - b);
    const medianYield = sortedYields[Math.floor(sortedYields.length / 2)] || 0;

    const sortedGrowths = [...payersWithGrowth].map(r => r.divGrowth5yr).sort((a, b) => a - b);
    const medianGrowth = sortedGrowths[Math.floor(sortedGrowths.length / 2)] || 0;

    results.forEach(r => {
      if (r.divGrowth5yr === null) {
        r.quadrant = "Unknown Growth";
      } else {
        const highYield = r.dividendYield > medianYield;
        const highGrowth = r.divGrowth5yr > medianGrowth;

        if (highYield && highGrowth) r.quadrant = "High Yield / High Growth";
        else if (highYield && !highGrowth) r.quadrant = "High Yield / Low Growth";
        else if (!highYield && highGrowth) r.quadrant = "Low Yield / High Growth";
        else r.quadrant = "Low Yield / Low Growth";
      }
    });

    const dataPath = path.join(__dirname, '..', 'data', 'dividend-yield-vs-growth.json');
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify({
      metadata: {
        count: results.length,
        medianYield,
        medianGrowth,
        dateCollected: new Date().toISOString()
      },
      data: results
    }, null, 2));

    console.log(`Finished. Saved ${results.length} dividend payers to ${dataPath}`);

  } catch (err) {
    console.error('Fatal error:', err);
  }
}

run();
