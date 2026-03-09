const axios = require('axios');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  try {
    const { data } = await axios.get('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies');
    const $ = cheerio.load(data);
    const tickers = [];
    $('#constituents tbody tr').each((i, el) => {
      if (i === 0) return;
      const ticker = $(el).find('td').eq(0).text().trim().replace('.', '-');
      const company = $(el).find('td').eq(1).text().trim();
      const sector = $(el).find('td').eq(2).text().trim();
      tickers.push({ ticker, company, sector });
    });
    console.log(`Found ${tickers.length} S&P 500 companies. Sample:`, tickers.slice(0, 3));

    // Let's test yahoo finance for AAPL
    const quote = await yahooFinance.quoteSummary('AAPL', { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'] });
    console.log(Object.keys(quote));
    console.log(quote.summaryDetail?.dividendYield, quote.summaryDetail?.payoutRatio, quote.summaryDetail?.fiveYearAvgDividendYield);
  } catch (err) {
    console.error(err);
  }
}
run();
