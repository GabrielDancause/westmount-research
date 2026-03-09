import fs from 'fs';

async function fetchSP500() {
  const response = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies');
  const text = await response.text();

  // Quick and dirty parsing of the wikipedia table
  const matches = [...text.matchAll(/<a rel="nofollow" class="external text" href="https:\/\/www\.nyse\.com\/quote\/XNYS:([A-Z]+)"/g)];
  const nasdaqMatches = [...text.matchAll(/<a rel="nofollow" class="external text" href="https:\/\/www\.nasdaq\.com\/market-activity\/stocks\/([a-z]+)"/g)];

  const tickers = new Set();
  matches.forEach(m => tickers.add(m[1]));
  nasdaqMatches.forEach(m => tickers.add(m[1].toUpperCase()));

  // also grab the standard list from the table rows
  const rowMatches = [...text.matchAll(/<tr>\s*<td><a[^>]*>(.*?)<\/a><\/td>\s*<td><a[^>]*>(.*?)<\/a><\/td>\s*<td>[^<]*<\/td>\s*<td>(.*?)<\/td>/g)];
  rowMatches.forEach(m => {
     let ticker = m[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
     if (ticker && ticker !== 'Symbol') tickers.add(ticker);
  });

  console.log(`Found ${tickers.size} tickers`);
  fs.writeFileSync('tickers.json', JSON.stringify(Array.from(tickers)));
}

fetchSP500();
