const data = require('./data/dividend-yield-vs-growth.json');
const avgYield = data.reduce((sum, item) => sum + (item.dividendYield || 0), 0) / data.length;
const validGrowth = data.filter(item => item.divGrowth5yr !== null);
const avgGrowth = validGrowth.reduce((sum, item) => sum + item.divGrowth5yr, 0) / validGrowth.length;
const highYieldHighGrowth = data.filter(item => (item.dividendYield || 0) > avgYield && (item.divGrowth5yr || 0) > avgGrowth);

console.log('Total Payers:', data.length);
console.log('Sweet Spot Count:', highYieldHighGrowth.length);
