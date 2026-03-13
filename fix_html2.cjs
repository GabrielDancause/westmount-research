const fs = require('fs');
let html = fs.readFileSync('public/cost-of-living-by-state-2026.html', 'utf-8');

// Some formatting strings got mangled during the previous replace operations
html = html.replace(/document\.getElementById\('statIncomeVal'\)\.textContent = incomeRank\.income \? '[\s\S]*?\+ incomeRank\.income\.toLocaleString\(\) : 'N\/A';/, "document.getElementById('statIncomeVal').textContent = incomeRank.income ? '$' + incomeRank.income.toLocaleString() : 'N/A';");
html = html.replace(/const fCurrency = val => val \? '[\s\S]*?\+ val\.toLocaleString\(\) : '--';/, "const fCurrency = val => val ? '$' + val.toLocaleString() : '--';");
html = html.replace(/ticks: \{ color: '#94a3b8', callback: val => '[\s\S]*?\+ val\.toLocaleString\(\) \}/, "ticks: { color: '#94a3b8', callback: val => '$' + val.toLocaleString() }");

fs.writeFileSync('public/cost-of-living-by-state-2026.html', html);
