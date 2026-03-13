const fs = require('fs');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const BATCH_SIZE = 10;
const DELAY_MS = 1000;

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchTickers() {
  console.log("Fetching S&P 500 tickers from Wikipedia...");
  const res = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies');
  const html = await res.text();
  const $ = cheerio.load(html);
  const tickers = [];
  $('#constituents tbody tr').each((i, row) => {
    if (i === 0) return;
    const ticker = $(row).find('td:nth-child(1)').text().trim().replace('.', '-');
    if (ticker) tickers.push(ticker);
  });
  console.log(`Found ${tickers.length} tickers.`);
  return tickers;
}

async function run() {
  const tickers = await fetchTickers();
  const results = [];
  const errors = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(tickers.length / BATCH_SIZE)}: ${batch.join(', ')}`);

    const promises = batch.map(async (ticker) => {
      try {
        const data = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile', 'financialData', 'earningsTrend'] });
        if (!data.assetProfile || !data.financialData) {
            console.log(`Missing required modules for ${ticker}`);
            return null;
        }

        const industry = data.assetProfile.industry || 'Unknown';
        const sector = data.assetProfile.sector || 'Unknown';

        // Ensure values exist and handle cases where margin could be missing
        const opMargin = typeof data.financialData.operatingMargins === 'number' ? data.financialData.operatingMargins : null;
        const profitMargin = typeof data.financialData.profitMargins === 'number' ? data.financialData.profitMargins : null;
        const grossMargin = typeof data.financialData.grossMargins === 'number' ? data.financialData.grossMargins : null;

        // Try to get 5Y trend from earningsTrend
        let fiveYearGrowth = null;
        if (data.earningsTrend && data.earningsTrend.trend) {
            const fvy = data.earningsTrend.trend.find(t => t.period === '+5y');
            if (fvy && typeof fvy.growth === 'number') {
                fiveYearGrowth = fvy.growth;
            }
        }

        return {
            ticker,
            industry,
            sector,
            operatingMargin: opMargin,
            netMargin: profitMargin,
            grossMargin: grossMargin,
            fiveYearGrowth: fiveYearGrowth
        };
      } catch (err) {
         console.log(`Error fetching ${ticker}: ${err.message}`);
         errors.push(ticker);
         return null;
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter(r => r !== null));
    await delay(DELAY_MS);
  }

  // Calculate industry averages
  const industryStats = {};

  results.forEach(company => {
      const ind = company.industry;
      if (!industryStats[ind]) {
          industryStats[ind] = {
              industry: ind,
              sector: company.sector,
              companies: 0,
              totalOpMargin: 0,
              validOpMargins: 0,
              totalNetMargin: 0,
              validNetMargins: 0,
              totalGrossMargin: 0,
              validGrossMargins: 0,
              totalFiveYearGrowth: 0,
              validFiveYearGrowths: 0,
              topCompanies: []
          };
      }

      const stats = industryStats[ind];
      stats.companies++;
      stats.topCompanies.push(company);

      if (company.operatingMargin !== null) {
          stats.totalOpMargin += company.operatingMargin;
          stats.validOpMargins++;
      }
      if (company.netMargin !== null) {
          stats.totalNetMargin += company.netMargin;
          stats.validNetMargins++;
      }
      if (company.grossMargin !== null) {
          stats.totalGrossMargin += company.grossMargin;
          stats.validGrossMargins++;
      }
      if (company.fiveYearGrowth !== null) {
          stats.totalFiveYearGrowth += company.fiveYearGrowth;
          stats.validFiveYearGrowths++;
      }
  });

  const finalIndustries = Object.values(industryStats).map(stats => {
      // Sort companies by operating margin
      stats.topCompanies.sort((a, b) => (b.operatingMargin || -100) - (a.operatingMargin || -100));
      const top3 = stats.topCompanies.slice(0, 3).map(c => c.ticker).join(', ');

      return {
          industry: stats.industry,
          sector: stats.sector,
          companiesCount: stats.companies,
          avgOperatingMargin: stats.validOpMargins > 0 ? stats.totalOpMargin / stats.validOpMargins : null,
          avgNetMargin: stats.validNetMargins > 0 ? stats.totalNetMargin / stats.validNetMargins : null,
          avgGrossMargin: stats.validGrossMargins > 0 ? stats.totalGrossMargin / stats.validGrossMargins : null,
          avgFiveYearGrowth: stats.validFiveYearGrowths > 0 ? stats.totalFiveYearGrowth / stats.validFiveYearGrowths : null,
          topCompaniesStr: top3
      };
  });

  // Filter out industries with 0 companies or unknown
  const cleanIndustries = finalIndustries.filter(ind => ind.industry !== 'Unknown' && ind.companiesCount >= 1);

  // Sort by operating margin descending
  cleanIndustries.sort((a, b) => {
      if (a.avgOperatingMargin === null && b.avgOperatingMargin === null) return 0;
      if (a.avgOperatingMargin === null) return 1;
      if (b.avgOperatingMargin === null) return -1;
      return b.avgOperatingMargin - a.avgOperatingMargin;
  });

  const finalData = {
      generatedAt: new Date().toISOString(),
      industries: cleanIndustries
  };

  fs.writeFileSync('industry_margins.json', JSON.stringify(finalData, null, 2));
  console.log(`Saved ${cleanIndustries.length} industries to industry_margins.json`);
  if (errors.length > 0) {
      console.log(`Errors on tickers: ${errors.join(', ')}`);
  }
}

run();
