const axios = require('axios');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const ticker = 'AAPL';
    const res = await axios.get(`https://stockanalysis.com/stocks/${ticker}/dividend/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(res.data);

    let yieldStr = $('div:contains("Dividend Yield")').parent().find('.text-2xl').text().trim();
    let divGrowth = $('div:contains("Growth (5Y)")').parent().find('.text-2xl').text().trim();
    let payoutRatio = $('div:contains("Payout Ratio")').parent().find('.text-2xl').text().trim();
    let consecutiveYears = $('div:contains("Consecutive Years")').parent().find('.text-2xl').text().trim();

    console.log({ yieldStr, divGrowth, payoutRatio, consecutiveYears });

    const quote = await yahooFinance.quote(ticker);
    console.log({ quote: quote.shortName, cap: quote.marketCap });

    const quoteSummary = await yahooFinance.quoteSummary(ticker, { modules: ['summaryProfile', 'summaryDetail'] });
    console.log({
      sector: quoteSummary.summaryProfile?.sector,
      dividendYield: quoteSummary.summaryDetail?.dividendYield,
      payoutRatio: quoteSummary.summaryDetail?.payoutRatio
    });
  } catch (err) {
    console.error(err.message);
  }
}
run();
