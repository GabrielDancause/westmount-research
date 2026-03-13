const fs = require('fs');
let html = fs.readFileSync('public/cost-of-living-by-state-2026.html', 'utf-8');

html = html.replace(/\\n<\/html>\\n \+/g, "'$' +");
html = html.replace(/'\\n<\/html>\\n \+/g, "'$' +");

// More robust: just replace the specific mangled lines
html = html.replace("? '\\n</html>\\n + incomeRank", "? '$' + incomeRank");
html = html.replace("=> val ? '\\n</html>\\n + val", "=> val ? '$' + val");
html = html.replace("Income \\n</html>\\n${d.y", "Income $${d.y");
html = html.replace("=> '\\n</html>\\n + val", "=> '$' + val");

fs.writeFileSync('public/cost-of-living-by-state-2026.html', html);
console.log('Fixed HTML');
