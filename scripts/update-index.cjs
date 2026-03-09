const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/insider-trading.json');
const indexPath = path.join(__dirname, '../src/pages/index.astro');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const indexContent = fs.readFileSync(indexPath, 'utf8');

const numTransactions = data.transactions.length;
// Find most impressive stat
let topCompany = "Multiple companies";
let topValue = 0;
if (data.aggregates.topBuyCompanies.length > 0) {
    topCompany = data.aggregates.topBuyCompanies[0].company;
    topValue = data.aggregates.topBuyCompanies[0].value;
}

const formatCurrency = (val) => {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString()}`;
};

const newStudy = `{
    emoji: "👥",
    name: "Insider Trading Tracker 2026",
    slug: "/insider-trading",
    desc: "Tracked ${numTransactions} recent executive buys & sells. ${topCompany} leads with ${formatCurrency(topValue)} in insider buying.",
    stat: "${numTransactions}",
    statLabel: "recent insider transactions tracked",
    tag: "ORIGINAL RESEARCH"
  }`;

// Find const studies = [
const studiesRegex = /const studies = \[\n/;
if (!studiesRegex.test(indexContent)) {
    console.error("Could not find const studies array in index.astro");
    process.exit(1);
}

const updatedContent = indexContent.replace(studiesRegex, `const studies = [\n  ${newStudy},\n`);

fs.writeFileSync(indexPath, updatedContent);
console.log('Updated src/pages/index.astro successfully');
