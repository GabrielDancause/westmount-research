const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/share-dilution.json', 'utf8'));
const validData = data.filter(d => d.market_cap && d.shares_5yr_ago && d.shares_current);
validData.sort((a,b) => b.change_pct - a.change_pct);
const worstDiluter = validData[0];
const itemsCount = validData.length;

const newStudyStr = `  {
    title: "Share Dilution Rankings 2026: The Worst Diluters vs. Best Reducers",
    subtitle: "${itemsCount} items · share count changes",
    slug: "share-dilution",
    stat: "+${worstDiluter.change_pct.toFixed(1)}%",
    statLabel: "highest dilution (${worstDiluter.ticker})",
    desc: "Tracking 5-year share count changes for S&P 500 companies. ${worstDiluter.company.replace(/"/g, '\\"')} leads with a +${worstDiluter.change_pct.toFixed(1)}% increase in shares outstanding.",
    tag: "ORIGINAL RESEARCH",
  },`;

const indexFile = 'src/pages/index.astro';
let content = fs.readFileSync(indexFile, 'utf8');

// revert the previous bad string replacement
content = content.replace(/  \{\n    title: "Share Dilution Rankings 2026[\s\S]*?ORIGINAL RESEARCH",\n  \},\n/, '');

// apply the new one, prepend to TOP of array as requested by memory
content = content.replace(/const studies = \[/, `const studies = [\n${newStudyStr}`);

fs.writeFileSync(indexFile, content);
console.log('Successfully updated src/pages/index.astro');
