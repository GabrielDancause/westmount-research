const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const manualSplits = [
    { date: 'Jun 10, 2024', symbol: 'NVDA', company: 'NVIDIA Corp', ratio: '10 to 1' },
    { date: 'Feb 19, 2024', symbol: 'WMT', company: 'Walmart Inc', ratio: '3 to 1' }
  ];

  for (const split of manualSplits) {
      const ratioParts = split.ratio.split(' to ');
      const splitMultiplier = parseInt(ratioParts[0]) / parseInt(ratioParts[1]);

      const splitDate = new Date(split.date);

      const preDateStart = new Date(splitDate); preDateStart.setDate(preDateStart.getDate() - 10);
      const preDateEnd = new Date(splitDate);

      const postDateStart = new Date(splitDate);
      const postDateEnd = new Date(splitDate); postDateEnd.setDate(postDateEnd.getDate() + 10);

      const oneYearDateStart = new Date(splitDate); oneYearDateStart.setFullYear(oneYearDateStart.getFullYear() + 1);
      const oneYearDateEnd = new Date(oneYearDateStart); oneYearDateEnd.setDate(oneYearDateEnd.getDate() + 10);

      try {
          const preData = await yahooFinance.historical(split.symbol, { period1: preDateStart.toISOString().split('T')[0], period2: preDateEnd.toISOString().split('T')[0] });
          const postData = await yahooFinance.historical(split.symbol, { period1: postDateStart.toISOString().split('T')[0], period2: postDateEnd.toISOString().split('T')[0] });

          let oneYearData = null;
          if (oneYearDateStart < new Date()) {
              oneYearData = await yahooFinance.historical(split.symbol, { period1: oneYearDateStart.toISOString().split('T')[0], period2: oneYearDateEnd.toISOString().split('T')[0] });
          }

          if (preData.length > 0 && postData.length > 0) {
              const preCloseAdj = preData[preData.length - 1].close; // Yahoo already adjusts past prices for splits
              const preCloseUnadj = preCloseAdj * splitMultiplier; // Reverse the split to get true pre-split price

              const postClose = postData[0].close;

              let ret1yr = null;
              if (oneYearData && oneYearData.length > 0) {
                  ret1yr = (oneYearData[0].close / postClose - 1) * 100;
              }

              console.log(`${split.symbol} ${split.date}: ratio=${split.ratio}, pre=${preCloseUnadj.toFixed(2)}, post=${postClose.toFixed(2)}, 1yr=${ret1yr?.toFixed(2)}%`);
          }
      } catch(e) {
          console.log(e);
      }
      await sleep(100);
  }
}
run();
