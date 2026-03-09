const fs = require('fs');
let file = fs.readFileSync('scripts/crawl-dividend-yield-vs-growth.cjs', 'utf8');
file = file.replace(
  "const { data } = await axios.get('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies');",
  "const { data } = await axios.get('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', { headers: { 'User-Agent': 'WestmountResearch/1.0 (contact@westmountresearch.com)' } });"
);
fs.writeFileSync('scripts/crawl-dividend-yield-vs-growth.cjs', file);
