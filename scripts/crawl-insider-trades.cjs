const fs = require('fs');
const { JSDOM } = require('jsdom');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

// Helper to escape HTML entities
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function parseNumber(str) {
    if (!str || str === '') return null;
    const clean = str.replace(/[^\d.-]/g, '');
    if (clean === '' || clean === '-' || clean === '.') return null;
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
}

async function scrapeOpenInsider(url, type) {
    console.log(`Scraping ${url}...`);
    try {
        const res = await fetch(url);
        const html = await res.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const rows = doc.querySelectorAll('table.tinytable tbody tr');

        const transactions = [];
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 12) {
                // OpenInsider columns:
                // 0: X
                // 1: Filing Date
                // 2: Trade Date
                // 3: Ticker
                // 4: Company Name
                // 5: Insider Name
                // 6: Title
                // 7: Trade Type
                // 8: Price
                // 9: Qty
                // 10: Owned
                // 11: ΔOwn
                // 12: Value

                const filingDateStr = cells[1] ? cells[1].textContent.trim() : null;
                const ticker = cells[3] ? cells[3].textContent.trim() : null;
                const company = cells[4] ? cells[4].textContent.trim() : null;
                const insiderName = cells[5] ? cells[5].textContent.trim() : null;
                const insiderTitle = cells[6] ? cells[6].textContent.trim() : null;
                const tradeTypeRaw = cells[7] ? cells[7].textContent.trim() : null;
                const priceUSDStr = cells[8] ? cells[8].textContent.trim() : null;
                const qtyStr = cells[9] ? cells[9].textContent.trim() : null;
                const ownedStr = cells[10] ? cells[10].textContent.trim() : null;
                const valueUSDStr = cells[12] ? cells[12].textContent.trim() : null;

                if (!ticker) return;

                let transactionType = type; // Default to the passed type
                if (tradeTypeRaw) {
                    if (tradeTypeRaw.includes('Purchase')) transactionType = 'Buy';
                    else if (tradeTypeRaw.includes('Sale+OE')) transactionType = 'Option Exercise';
                    else if (tradeTypeRaw.includes('Sale')) transactionType = 'Sell';
                }

                // Clean and parse numbers
                const sharesTraded = parseNumber(qtyStr);
                const priceUSD = parseNumber(priceUSDStr);
                const totalValueUSD = parseNumber(valueUSDStr);
                const sharesOwned = parseNumber(ownedStr);
                const filingDate = filingDateStr ? filingDateStr.split(' ')[0] : null;

                transactions.push({
                    ticker,
                    company,
                    insiderName,
                    insiderTitle,
                    transactionType,
                    sharesTraded: sharesTraded ? Math.abs(sharesTraded) : null, // keep positive
                    priceUSD,
                    totalValueUSD: totalValueUSD ? Math.abs(totalValueUSD) : null,
                    sharesOwned,
                    filingDate
                });
            }
        });
        console.log(`Found ${transactions.length} transactions for ${type}`);
        return transactions;
    } catch (e) {
        console.error(`Error scraping ${url}:`, e);
        return [];
    }
}

// The following is appended to the script

async function enrichWithSectors(transactions) {
    console.log("Enriching with sectors...");
    const uniqueTickers = [...new Set(transactions.map(t => t.ticker))];
    const sectorMap = {};

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < uniqueTickers.length; i += batchSize) {
        const batch = uniqueTickers.slice(i, i + batchSize);
        await Promise.all(batch.map(async (ticker) => {
            try {
                // Remove ticker suffix if present (e.g. ABC.U -> ABC) for better match,
                // but let's try raw first
                const quote = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile'] });
                if (quote && quote.assetProfile && quote.assetProfile.sector) {
                    sectorMap[ticker] = quote.assetProfile.sector;
                } else {
                    sectorMap[ticker] = null;
                }
            } catch (e) {
                // Fallback to null
                sectorMap[ticker] = null;
            }
        }));
        // Small delay to prevent rate limits
        await new Promise(res => setTimeout(res, 500));
        console.log(`Enriched ${Math.min(i + batchSize, uniqueTickers.length)} / ${uniqueTickers.length} tickers`);
    }

    transactions.forEach(t => {
        t.sector = sectorMap[t.ticker] || 'Unknown';
    });
    return transactions;
}

function calculateAggregations(transactions) {
    console.log("Calculating aggregations...");

    // By Company
    const companyAgg = {};
    transactions.forEach(t => {
        if (!companyAgg[t.company]) {
            companyAgg[t.company] = {
                ticker: t.ticker,
                company: t.company,
                sector: t.sector,
                totalBuyUSD: 0,
                totalSellUSD: 0,
                netUSD: 0,
                buyCount: 0,
                sellCount: 0
            };
        }
        if (t.transactionType === 'Buy') {
            companyAgg[t.company].totalBuyUSD += (t.totalValueUSD || 0);
            companyAgg[t.company].buyCount++;
        } else if (t.transactionType === 'Sell' || t.transactionType === 'Option Exercise') {
            companyAgg[t.company].totalSellUSD += (t.totalValueUSD || 0);
            companyAgg[t.company].sellCount++;
        }
        companyAgg[t.company].netUSD = companyAgg[t.company].totalBuyUSD - companyAgg[t.company].totalSellUSD;
    });

    const companyList = Object.values(companyAgg);

    const topBuyCompanies = [...companyList]
        .filter(c => c.totalBuyUSD > 0)
        .sort((a, b) => b.totalBuyUSD - a.totalBuyUSD)
        .slice(0, 10);

    const topSellCompanies = [...companyList]
        .filter(c => c.totalSellUSD > 0)
        .sort((a, b) => b.totalSellUSD - a.totalSellUSD)
        .slice(0, 10);

    // By Sector
    const sectorAgg = {};
    transactions.forEach(t => {
        if (!sectorAgg[t.sector]) {
            sectorAgg[t.sector] = {
                sector: t.sector,
                totalBuyUSD: 0,
                totalSellUSD: 0,
                totalActivityUSD: 0,
                buySellRatio: 0
            };
        }
        if (t.transactionType === 'Buy') {
            sectorAgg[t.sector].totalBuyUSD += (t.totalValueUSD || 0);
        } else {
            sectorAgg[t.sector].totalSellUSD += (t.totalValueUSD || 0);
        }
        sectorAgg[t.sector].totalActivityUSD = sectorAgg[t.sector].totalBuyUSD + sectorAgg[t.sector].totalSellUSD;
    });

    const sectorList = Object.values(sectorAgg).map(s => {
        s.buySellRatio = s.totalSellUSD > 0 ? (s.totalBuyUSD / s.totalSellUSD) : (s.totalBuyUSD > 0 ? 999 : 0);
        return s;
    }).sort((a, b) => b.totalActivityUSD - a.totalActivityUSD);

    return {
        topBuyCompanies,
        topSellCompanies,
        sectorActivity: sectorList
    };
}

function generateHtml(data) {
    const formatUSD = (val) => val ? '$' + val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'N/A';
    const formatDate = (date) => date ? date.split(' ')[0] : 'N/A';

    // Top Stats
    let maxBuyUSD = 0;
    if (data.aggregations.topBuyCompanies.length > 0) {
        maxBuyUSD = data.aggregations.topBuyCompanies[0].totalBuyUSD;
    }
    const maxBuyCompany = data.aggregations.topBuyCompanies.length > 0 ? data.aggregations.topBuyCompanies[0].company : "N/A";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insider Trading Tracker: Who Is Buying & Selling Their Own Stock? (2026) | Westmount Research</title>
    <meta name="description" content="Track recent insider transactions, including CEO, CFO, and Director buys and sells. See which companies and sectors have the heaviest insider activity.">
    <link rel="canonical" href="https://westmountresearch.com/insider-trading">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #060a12;
            color: #c8d0de;
            line-height: 1.6;
        }
        header {
            background: linear-gradient(180deg, #0a1628 0%, #060a12 100%);
            padding: 60px 24px 40px;
            text-align: center;
            border-bottom: 1px solid #152040;
        }
        .tag {
            color: #4a8fe7;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 16px;
            display: inline-block;
            background: rgba(74, 143, 231, 0.1);
            padding: 6px 12px;
            border-radius: 4px;
        }
        h1 {
            font-size: 2.8rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 20px;
            line-height: 1.2;
        }
        .subtitle {
            color: #5a6a80;
            font-size: 1.1rem;
            max-width: 600px;
            margin: 0 auto;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 24px;
        }
        .grid-3 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .card {
            background: #0a1020;
            border: 1px solid #152040;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
        }
        .card-title {
            color: #5a6a80;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .card-value {
            font-size: 2.2rem;
            font-weight: 800;
            color: #4a8fe7;
            font-family: 'JetBrains Mono', monospace;
        }
        .card-value.buy { color: #4caf50; }
        .card-value.sell { color: #f44336; }
        h2 {
            font-size: 2rem;
            color: #fff;
            margin: 40px 0 20px;
            border-bottom: 1px solid #152040;
            padding-bottom: 10px;
        }
        .table-container {
            overflow-x: auto;
            margin-bottom: 40px;
            background: #0a1020;
            border-radius: 8px;
            border: 1px solid #152040;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 14px 20px;
            text-align: left;
            border-bottom: 1px solid #152040;
            font-size: 0.95rem;
        }
        th {
            background: #0d1428;
            color: #fff;
            font-weight: 600;
            font-size: 0.9rem;
            text-transform: uppercase;
            white-space: nowrap;
        }
        td.mono {
            font-family: 'JetBrains Mono', monospace;
        }
        .type-buy { color: #4caf50; font-weight: 600; }
        .type-sell { color: #f44336; font-weight: 600; }
        .type-opt { color: #ffeb3b; font-weight: 600; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(74, 143, 231, 0.05); }
        .faq {
            margin-bottom: 40px;
        }
        .faq-item {
            margin-bottom: 24px;
            background: #0a1020;
            padding: 24px;
            border-radius: 8px;
            border: 1px solid #152040;
        }
        .faq-q {
            font-weight: 600;
            color: #fff;
            font-size: 1.1rem;
            margin-bottom: 12px;
        }
        .faq-a {
            color: #a0aec0;
        }
        .methodology {
            background: #0a1020;
            padding: 24px;
            border-radius: 8px;
            border: 1px solid #152040;
            font-size: 0.9rem;
            color: #5a6a80;
            margin-bottom: 40px;
        }
        footer {
            text-align: center;
            padding: 40px 24px;
            border-top: 1px solid #152040;
            font-size: 0.85rem;
            color: #5a6a80;
        }
        a { color: #4a8fe7; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Insider Trading Tracker: Who Is Buying & Selling Their Own Stock?",
      "author": {
        "@type": "Organization",
        "name": "Westmount Research"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Westmount Research"
      },
      "datePublished": "2026-03-09"
    }
    </script>
</head>
<body>
    <header>
        <div class="tag">Original Research 2026</div>
        <h1>Insider Trading Tracker</h1>
        <p class="subtitle">Track recent executive transactions. Discover who is buying their own stock, who is dumping shares, and which sectors have the highest activity.</p>
    </header>

    <div class="container">
        <div class="grid-3">
            <div class="card">
                <div class="card-title">Total Transactions Tracked</div>
                <div class="card-value">${data.transactions.length}</div>
                <div style="font-size: 0.8rem; color: #5a6a80; margin-top: 8px;">Recent high conviction buys and sells</div>
            </div>
            <div class="card">
                <div class="card-title">Top Buy Activity</div>
                <div class="card-value buy">${formatUSD(maxBuyUSD)}</div>
                <div style="font-size: 0.8rem; color: #5a6a80; margin-top: 8px;">by ${escapeHtml(maxBuyCompany)}</div>
            </div>
            <div class="card">
                <div class="card-title">Top Sell Activity</div>
                <div class="card-value sell">${data.aggregations.topSellCompanies.length > 0 ? formatUSD(data.aggregations.topSellCompanies[0].totalSellUSD) : '$0'}</div>
                <div style="font-size: 0.8rem; color: #5a6a80; margin-top: 8px;">by ${data.aggregations.topSellCompanies.length > 0 ? escapeHtml(data.aggregations.topSellCompanies[0].company) : 'N/A'}</div>
            </div>
        </div>

        <h2>Companies with Most Insider Buying</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Ticker</th>
                        <th>Sector</th>
                        <th>Total Bought (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.aggregations.topBuyCompanies.map(c => `
                    <tr>
                        <td><strong>${escapeHtml(c.company)}</strong></td>
                        <td class="mono">${escapeHtml(c.ticker)}</td>
                        <td>${escapeHtml(c.sector)}</td>
                        <td class="mono type-buy">${formatUSD(c.totalBuyUSD)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>

        <h2>Companies with Most Insider Selling</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Ticker</th>
                        <th>Sector</th>
                        <th>Total Sold (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.aggregations.topSellCompanies.map(c => `
                    <tr>
                        <td><strong>${escapeHtml(c.company)}</strong></td>
                        <td class="mono">${escapeHtml(c.ticker)}</td>
                        <td>${escapeHtml(c.sector)}</td>
                        <td class="mono type-sell">${formatUSD(c.totalSellUSD)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>

        <h2>Sector Activity Breakdown</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Sector</th>
                        <th>Total Buy Volume</th>
                        <th>Total Sell Volume</th>
                        <th>Buy/Sell Ratio</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.aggregations.sectorActivity.map(s => `
                    <tr>
                        <td><strong>${escapeHtml(s.sector)}</strong></td>
                        <td class="mono type-buy">${formatUSD(s.totalBuyUSD)}</td>
                        <td class="mono type-sell">${formatUSD(s.totalSellUSD)}</td>
                        <td class="mono">${s.buySellRatio === 999 ? 'High' : (s.buySellRatio ? s.buySellRatio.toFixed(2) : '0.00')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>

        <h2>Recent Transactions Directory</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Ticker</th>
                        <th>Company</th>
                        <th>Insider</th>
                        <th>Type</th>
                        <th>Shares</th>
                        <th>Price</th>
                        <th>Total Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.transactions.map(t => {
                        let typeClass = '';
                        if (t.transactionType === 'Buy') typeClass = 'type-buy';
                        else if (t.transactionType === 'Sell') typeClass = 'type-sell';
                        else typeClass = 'type-opt';
                        return `
                        <tr>
                            <td class="mono" style="font-size:0.85rem;">${formatDate(t.filingDate)}</td>
                            <td class="mono"><strong>${escapeHtml(t.ticker)}</strong></td>
                            <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(t.company)}">${escapeHtml(t.company)}</td>
                            <td>
                                <div style="font-size:0.9rem; font-weight:600;">${escapeHtml(t.insiderName)}</div>
                                <div style="font-size:0.75rem; color:#6a7a90;">${escapeHtml(t.insiderTitle)}</div>
                            </td>
                            <td class="${typeClass}">${escapeHtml(t.transactionType)}</td>
                            <td class="mono">${t.sharesTraded ? t.sharesTraded.toLocaleString() : 'N/A'}</td>
                            <td class="mono">${t.priceUSD ? '$' + t.priceUSD.toFixed(2) : 'N/A'}</td>
                            <td class="mono" style="font-weight:600;">${formatUSD(t.totalValueUSD)}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <h2>Frequently Asked Questions</h2>
        <div class="faq">
            <div class="faq-item">
                <div class="faq-q">What does insider buying mean?</div>
                <div class="faq-a">Insider buying occurs when a company's executives (like the CEO or CFO) or board members purchase shares of their own company's stock on the open market. This requires them to file a Form 4 with the SEC. Because they are using their own personal capital, it represents skin in the game.</div>
            </div>
            <div class="faq-item">
                <div class="faq-q">Is insider buying a good sign?</div>
                <div class="faq-a">Yes. Peter Lynch famously said, "Insiders might sell their shares for any number of reasons, but they buy them for only one: they think the price will rise." Large, open-market purchases by multiple executives (cluster buying) are widely considered one of the strongest bullish signals in the stock market.</div>
            </div>
            <div class="faq-item">
                <div class="faq-q">Where can I track insider trading?</div>
                <div class="faq-a">All legal insider trading must be disclosed to the U.S. Securities and Exchange Commission (SEC) via a Form 4 filing within two business days. You can track these on the SEC's EDGAR database, or through aggregators like OpenInsider and Finviz which parse these filings automatically.</div>
            </div>
            <div class="faq-item">
                <div class="faq-q">Which stock has the most insider buying?</div>
                <div class="faq-a">Based on our latest data crawl in 2026, <strong>${escapeHtml(maxBuyCompany)}</strong> leads recent insider buying activity with <strong>${formatUSD(maxBuyUSD)}</strong> in executive purchases. Refer to the "Most Insider Buying" table above for the current top 10 list.</div>
            </div>
            <div class="faq-item">
                <div class="faq-q">Is insider selling always bad?</div>
                <div class="faq-a">No. While insider buying is almost exclusively bullish, insider selling can happen for many reasons that have nothing to do with the company's outlook. Executives may sell to pay taxes, diversify their portfolios, buy a house, or cover personal expenses. However, if multiple top executives dump large percentages of their holdings simultaneously, it can be a warning sign.</div>
            </div>
        </div>

        <div class="methodology">
            <strong>Methodology:</strong> We aggregate recent Form 4 SEC filings of high-value insider transactions (typically $100k+ in value) from OpenInsider. We exclude non-open market transactions such as automatic stock grants to focus purely on active, discretionary buys and sells by C-level executives and directors. Sectors are matched to tickers dynamically using Yahoo Finance data. Output metrics represent the latest captured filings and are not an exhaustive historical database.
        </div>
    </div>

    <footer>
        <p>© 2026 <a href="/">westmount-research</a></p>
        <p style="margin-top: 10px; font-size: 0.75rem; max-width: 600px; margin-left: auto; margin-right: auto;">Disclaimer: This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research.</p>
    </footer>
</body>
</html>`;

    fs.writeFileSync('public/insider-trading.html', html);
    console.log('Saved to public/insider-trading.html');
}

// Rewrite main to replace the old one
async function main() {
    console.log("Starting OpenInsider Scraper...");

    // Scrape buys and sells
    const buys = await scrapeOpenInsider('http://openinsider.com/latest-insider-purchases-100k', 'Buy');
    const sells = await scrapeOpenInsider('http://openinsider.com/latest-insider-sales-100k', 'Sell');

    let transactions = [...buys, ...sells];
    transactions.sort((a, b) => {
        if (!a.filingDate) return 1;
        if (!b.filingDate) return -1;
        return new Date(b.filingDate) - new Date(a.filingDate);
    });

    console.log(`Total transactions collected: ${transactions.length}`);

    transactions = await enrichWithSectors(transactions);
    const aggregations = calculateAggregations(transactions);

    const output = {
        crawlDate: '2026-03-09',
        totalTransactions: transactions.length,
        aggregations,
        transactions
    };

    fs.writeFileSync('data/insider-trading.json', JSON.stringify(output, null, 2));
    console.log('Saved to data/insider-trading.json');

    generateHtml(output);
}

// execute
main();
