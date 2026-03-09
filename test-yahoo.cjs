const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });
yahooFinance.quoteSummary('AAPL', { modules: ['assetProfile'] }).then(res => console.log(res.assetProfile.sector)).catch(console.error);
