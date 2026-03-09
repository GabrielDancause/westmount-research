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
        modules: ['assetProfile', 'financialData', 'price', 'defaultKeyStatistics']
      });

      const company = data.price?.longName || data.price?.shortName;
      const sector = data.assetProfile?.sector;

      const fd = data.financialData || {};
      const ks = data.defaultKeyStatistics || {};

      const totalDebt = fd.totalDebt;
      const totalCash = fd.totalCash;
      const currentRatio = fd.currentRatio;

      const marketCap = data.price?.marketCap;

      if (!company || !sector || totalDebt == null || marketCap == null) {
        continue;
      }

      // We need to handle missing debtToEquity if totalEquity is negative.
      // e.g. DPZ has debtToEquity=undefined, but bookValue=-112.88
      let debtToEquityPct = fd.debtToEquity;
      let totalEquityB = null;

      if (ks.bookValue != null && ks.sharesOutstanding != null) {
        totalEquityB = (ks.bookValue * ks.sharesOutstanding) / 1e9;
      }

      const totalDebtB = totalDebt / 1e9;
      const totalCashB = (totalCash != null) ? (totalCash / 1e9) : null;
      const netDebtB = (totalCash != null) ? ((totalDebt - totalCash) / 1e9) : totalDebtB;
      const marketCapB = marketCap / 1e9;

      let debtToEquity = null;
      if (debtToEquityPct != null) {
        debtToEquity = debtToEquityPct / 100;
        if (totalEquityB == null && debtToEquity !== 0) {
          totalEquityB = totalDebtB / debtToEquity;
        }
      } else if (totalEquityB != null && totalEquityB !== 0) {
        debtToEquity = totalDebtB / totalEquityB;
      }

      if (debtToEquity == null) continue;

      // Filter limits based on instructions:
      // debtToEquity: -10 to 100
      if (debtToEquity < -10 || debtToEquity > 100) continue;

      results.push({
        ticker,
        company,
        sector,
        debtToEquity,
        totalDebtB,
        totalEquityB,
        interestCoverageRatio: null,
        netDebtB,
        cashB: totalCashB,
        currentRatio: currentRatio != null ? currentRatio : null,
        marketCapB,
        creditRating: null
      });

      console.log(`[${results.length}] Processed ${ticker} - D/E: ${debtToEquity.toFixed(2)}`);

    } catch (e) {
      console.error(`Error processing ${ticker}: ${e.message}`);
    }
  }

  // Sort descending by debtToEquity
  results.sort((a, b) => b.debtToEquity - a.debtToEquity);

  console.log(`Finished processing. Saving ${results.length} valid records.`);
  const outPath = path.join(__dirname, '../data/debt-to-equity.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
}

run();
