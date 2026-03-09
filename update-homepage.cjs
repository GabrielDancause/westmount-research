const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/dividend-yield-vs-growth.json', 'utf8'));
const dividendPayers = data.filter(d => d.dividendYield !== null && d.dividendYield > 0);
const medianYield = (() => {
    const yields = dividendPayers.map(d => d.dividendYield).sort((a,b) => a-b);
    return yields[Math.floor(yields.length/2)] * 100;
})();
const medianGrowth = (() => {
    const growths = dividendPayers.filter(d => d.divGrowth5yr !== null).map(d => d.divGrowth5yr).sort((a,b) => a-b);
    return growths[Math.floor(growths.length/2)] * 100;
})();

const sweetSpotCount = dividendPayers.filter(d => d.dividendYield > medianYield/100 && d.divGrowth5yr > medianGrowth/100).length;

const newStudy = `  {
    title: "Dividend Yield vs Growth Rate: S&P 500 Analysis 2026",
    subtitle: "${dividendPayers.length} items analyzed",
    slug: "/dividend-yield-vs-growth.html",
    stat: "${sweetSpotCount}",
    statLabel: "\\"Sweet Spot\\" compounders",
    desc: "Comparing current yield vs 5-year dividend growth to uncover the true compounders vs the yield traps in the S&P 500.",
    tag: "ORIGINAL RESEARCH",
  },`;

const indexFile = 'src/pages/index.astro';
let content = fs.readFileSync(indexFile, 'utf8');

// Insert after `const studies = [`
content = content.replace('const studies = [', `const studies = [\n${newStudy}`);

fs.writeFileSync(indexFile, content);
console.log('Homepage updated.');
