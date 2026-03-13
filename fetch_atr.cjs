const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
const fs = require('fs');

const tickers = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'TSLA', 'JPM', 'JNJ', 'V',
  'PG', 'MA', 'HD', 'CVX', 'ABBV', 'LLY', 'BAC', 'PEP', 'COST', 'WMT',
  'XOM', 'NFLX', 'DIS', 'ADBE', 'CRM', 'AMD', 'INTC', 'CSCO', 'PFE', 'T'
];

async function run() {
  const data = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  for (const ticker of new Set(tickers)) {
    try {
      const quote = await yahooFinance.quote(ticker);
      const hist = await yahooFinance.historical(ticker, {
        period1: startDate.toISOString().split('T')[0],
        period2: endDate.toISOString().split('T')[0],
        interval: '1d'
      });

      if (hist.length >= 15) {
        const trs = [];
        for (let i = hist.length - 14; i < hist.length; i++) {
          const high = hist[i].high;
          const low = hist[i].low;
          const prevClose = hist[i-1].close;
          const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
          trs.push(tr);
        }
        const atr = trs.reduce((sum, val) => sum + val, 0) / 14;

        data.push({
          ticker: ticker,
          name: quote.shortName || ticker,
          price: quote.regularMarketPrice,
          beta: quote.beta || null,
          atr: parseFloat(atr.toFixed(2)),
          atrPercent: parseFloat(((atr / quote.regularMarketPrice) * 100).toFixed(2))
        });
      }
    } catch (e) {
      console.error(`Error fetching ${ticker}`, e);
    }
  }

  fs.writeFileSync('atr_data.json', JSON.stringify(data, null, 2));
  console.log('Done! Fetched ' + data.length + ' stocks.');
}
run();
