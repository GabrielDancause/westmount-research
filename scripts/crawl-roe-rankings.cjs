const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  const tickersPath = path.join(__dirname, '../tickers.json');
  const tickers = JSON.parse(fs.readFileSync(tickersPath, 'utf8'));

  const results = [];

  console.log(`Starting to fetch data for ${tickers.length} tickers...`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];

    try {
      const data = await yahooFinance.quoteSummary(ticker, {
        modules: ['summaryProfile', 'financialData', 'price', 'defaultKeyStatistics', 'summaryDetail']
      });

      const company = data.price?.shortName || data.price?.longName;
      const sector = data.summaryProfile?.sector;
      const roe = data.financialData?.returnOnEquity;
      const net_income = data.defaultKeyStatistics?.netIncomeToCommon;
      const market_cap = data.price?.marketCap;
      const pe_ratio = data.summaryDetail?.trailingPE || data.summaryDetail?.forwardPE;

      if (!company || !sector || roe == null || net_income == null || market_cap == null) {
        continue;
      }

      // Calculate implied equity based on ROE = Net Income / Equity
      // Equity = Net Income / ROE
      const equity = (roe !== 0) ? net_income / roe : null;

      results.push({
        ticker,
        company,
        sector,
        roe,
        net_income,
        equity,
        market_cap,
        pe_ratio: pe_ratio || null
      });

      console.log(`[${results.length}] Processed ${ticker} - ROE: ${(roe * 100).toFixed(2)}%`);

    } catch (e) {
      console.error(`Error processing ${ticker}: ${e.message}`);
    }
  }

  // Sort descending by ROE
  results.sort((a, b) => b.roe - a.roe);

  console.log(`Finished processing. Saving ${results.length} valid records.`);
  const outPath = path.join(__dirname, '../data/roe-rankings.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
}

run();
