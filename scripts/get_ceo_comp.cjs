const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const tickersPath = path.join(__dirname, '..', 'tickers.json');
  const tickers = JSON.parse(fs.readFileSync(tickersPath, 'utf8'));

  const results = [];
  const dateEnd = new Date('2026-03-09');
  const dateStart = new Date(dateEnd.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
  const period1 = dateStart.toISOString().split('T')[0];
  const period2 = dateEnd.toISOString().split('T')[0];

  console.log(`Fetching data for ${tickers.length} tickers...`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`[${i+1}/${tickers.length}] Processing ${ticker}...`);
    try {
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ['assetProfile', 'price', 'summaryDetail']
      });

      if (!summary || !summary.assetProfile || !summary.assetProfile.companyOfficers) continue;

      const officers = summary.assetProfile.companyOfficers;
      const ceo = officers.find(o => o.title && o.title.toLowerCase().includes('ceo'));
      if (!ceo || !ceo.totalPay) continue;

      const total_comp = ceo.totalPay;
      const salary = ceo.salary || null;
      const stock_awards = total_comp - (salary || 0); // rough estimation for missing fields

      const priceInfo = summary.price;
      const company = priceInfo?.shortName || ticker;
      const market_cap = priceInfo?.marketCap || null;
      const sector = summary.assetProfile.sector || 'Unknown';
      const ceo_name = ceo.name;

      const chartData = await yahooFinance.chart(ticker, {
        period1,
        period2,
        interval: '1mo'
      });

      let stock_return_3yr = null;
      if (chartData && chartData.quotes && chartData.quotes.length >= 2) {
        const first = chartData.quotes[0].close;
        const last = chartData.quotes[chartData.quotes.length - 1].close;
        if (first && last) {
          stock_return_3yr = ((last - first) / first) * 100;
        }
      }

      if (total_comp !== null && stock_return_3yr !== null) {
        results.push({
          ticker,
          company,
          ceo_name,
          total_comp,
          salary,
          stock_awards,
          stock_return_3yr,
          market_cap,
          sector
        });
      }

    } catch (err) {
      console.log(`Failed to process ${ticker}: ${err.message}`);
    }
    await sleep(200); // rate limiting
  }

  results.sort((a, b) => b.total_comp - a.total_comp);
  const top50 = results.slice(0, 50);

  const outputPath = path.join(__dirname, '..', 'data', 'ceo_comp.json');
  fs.writeFileSync(outputPath, JSON.stringify(top50, null, 2));
  console.log(`Saved top 50 CEOs data to ${outputPath}`);
}

main().catch(console.error);
