const fs = require('fs');
let file = fs.readFileSync('scripts/crawl-dividend-yield-vs-growth.cjs', 'utf8');
// Fix the fetch to wikipedia - looks like the user agent is still just axios/1.13.6 in the error.
// The headers config is object so it should work but let's just make it very explicit or use pure fetch

const replacement = `
  const response = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', {
    headers: { 'User-Agent': 'WestmountResearchBot/1.0 (contact@westmountresearch.com)' }
  });
  const data = await response.text();
`;

file = file.replace(
  "const { data } = await axios.get('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', { headers: { 'User-Agent': 'WestmountResearch/1.0 (contact@westmountresearch.com)' } });",
  replacement
);
fs.writeFileSync('scripts/crawl-dividend-yield-vs-growth.cjs', file);
