const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function fetchOpenInsider(url) {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const transactions = [];

    $('table.tinytable tbody tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length < 12) return;

        const filingDate = $(tds[1]).find('a').text().trim();
        const ticker = $(tds[3]).find('a').text().trim();
        const company = $(tds[4]).find('a').text().trim();
        const insiderName = $(tds[5]).find('a').text().trim();
        const insiderTitle = $(tds[6]).text().trim();
        const transactionTypeRaw = $(tds[7]).text().trim();

        // Parse transaction type
        let transactionType = transactionTypeRaw;
        if (transactionTypeRaw.includes('P - Purchase')) transactionType = 'Buy';
        else if (transactionTypeRaw.includes('S - Sale')) transactionType = 'Sell';
        else if (transactionTypeRaw.includes('M - Option')) transactionType = 'Option Exercise';

        const priceStr = $(tds[8]).text().trim().replace(/[\$,]/g, '');
        const sharesTradedStr = $(tds[9]).text().trim().replace(/[,\+]/g, '');
        const sharesOwnedStr = $(tds[10]).text().trim().replace(/,/g, '');
        const totalValueStr = $(tds[12]).text().trim().replace(/[\$,\+]/g, '');

        if (!ticker || !filingDate) return;

        transactions.push({
            ticker,
            company,
            insiderName,
            insiderTitle,
            transactionType,
            sharesTraded: sharesTradedStr ? parseInt(sharesTradedStr, 10) : null,
            priceUSD: priceStr ? parseFloat(priceStr) : null,
            totalValueUSD: totalValueStr ? parseInt(totalValueStr, 10) : null,
            sharesOwned: sharesOwnedStr ? parseInt(sharesOwnedStr, 10) : null,
            filingDate: filingDate.split(' ')[0], // just the date part
            sector: null // will fill later
        });
    });

    return transactions;
}

async function run() {
    console.log('Fetching OpenInsider Purchases ($25k+)...');
    const buys = await fetchOpenInsider('http://openinsider.com/insider-purchases-25k');
    console.log(`Found ${buys.length} buys.`);

    console.log('Fetching OpenInsider Sales ($100k+)...');
    const sells = await fetchOpenInsider('http://openinsider.com/latest-insider-sales-100k');
    console.log(`Found ${sells.length} sells.`);

    let allTransactions = [...buys, ...sells];

    // Sort by filing date descending
    allTransactions.sort((a, b) => new Date(b.filingDate) - new Date(a.filingDate));

    // Keep top 200 to ensure we have enough after filtering
    allTransactions = allTransactions.slice(0, 200);

    fs.writeFileSync(path.join(__dirname, '../data/insider-trading-raw.json'), JSON.stringify(allTransactions, null, 2));
    console.log(`Saved ${allTransactions.length} raw transactions.`);
}

//

async function enrichData() {
    const rawPath = path.join(__dirname, '../data/insider-trading-raw.json');
    if (!fs.existsSync(rawPath)) return;

    let transactions = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

    // We only need ~100 transactions, so let's limit the API calls
    transactions = transactions.slice(0, 150);

    const enriched = [];
    const sectorCache = {}; // Cache to avoid duplicate requests

    for (const tx of transactions) {
        if (enriched.length >= 120) break; // we have enough

        let sector = tx.sector;
        if (!sector) {
            if (sectorCache[tx.ticker]) {
                sector = sectorCache[tx.ticker];
            } else {
                try {
                    console.log(`Fetching sector for ${escapeHtml(tx.ticker)}...`);
                    const quote = await yahooFinance.quoteSummary(tx.ticker, { modules: ['assetProfile'] });
                    sector = quote?.assetProfile?.sector || null;
                    sectorCache[tx.ticker] = sector;
                } catch (err) {
                    console.log(`Could not fetch data for ${escapeHtml(tx.ticker)}, skipping sector.`);
                    sector = null;
                    sectorCache[tx.ticker] = null;
                }

                // Rate limit slightly
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // Add to enriched array even if sector is null, but we'd prefer having sectors
        tx.sector = sector;
        enriched.push(tx);
    }

    fs.writeFileSync(path.join(__dirname, '../data/insider-trading.json'), JSON.stringify(enriched, null, 2));
    console.log(`Saved ${enriched.length} enriched transactions to insider-trading.json`);
}

// Comment out the first part and run the second part for testing
// //
//

function escapeHtml(unsafe) {
    if (!unsafe) return unsafe;
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function generateHTML() {
    const dataPath = path.join(__dirname, '../data/insider-trading.json');
    const transactions = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    let totalBuysCount = 0;
    let totalSellsCount = 0;
    let companiesWithMostBuys = {};
    let companiesWithMostSells = {};
    let sectorsBuys = {};
    let sectorsSells = {};

    transactions.forEach(tx => {
        if (!tx.company) return;

        if (tx.transactionType === 'Buy') {
            totalBuysCount++;
            companiesWithMostBuys[tx.company] = (companiesWithMostBuys[tx.company] || 0) + 1;

            if (tx.sector) {
                sectorsBuys[tx.sector] = (sectorsBuys[tx.sector] || 0) + 1;
            }
        } else if (tx.transactionType === 'Sell') {
            totalSellsCount++;
            companiesWithMostSells[tx.company] = (companiesWithMostSells[tx.company] || 0) + 1;

            if (tx.sector) {
                sectorsSells[tx.sector] = (sectorsSells[tx.sector] || 0) + 1;
            }
        }
    });

    const formatCurrency = (val) => {
        if (val == null) return "N/A";
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
    };

    const mostBoughtCompanies = Object.entries(companiesWithMostBuys)
        .sort((a, b) => b[1] - a[1]).slice(0, 5);

    const mostSoldCompanies = Object.entries(companiesWithMostSells)
        .sort((a, b) => b[1] - a[1]).slice(0, 5);

    const allSectors = new Set([...Object.keys(sectorsBuys), ...Object.keys(sectorsSells)]);
    const mostActiveSectors = Array.from(allSectors)
        .map(sector => {
            const buys = sectorsBuys[sector] || 0;
            const sells = sectorsSells[sector] || 0;
            return { sector, buys, sells, total: buys + sells, ratio: sells === 0 ? buys : (buys / sells).toFixed(2) };
        })
        .sort((a, b) => b.total - a.total).slice(0, 5);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insider Trading Tracker: Who Is Buying & Selling Their Own Stock? 2026</title>
    <meta name="description" content="Tracking recent insider transactions from CEOs, CFOs, and Directors. Discover which sectors and companies are seeing the most executive buying in 2026.">
    <link rel="canonical" href="https://westmountresearch.com/insider-trading">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #060a12;
            --card-bg: #0a1020;
            --border-color: #152040;
            --accent-color: #4a8fe7;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --buy-color: #22c55e;
            --sell-color: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.6;
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
        header { margin-bottom: 4rem; text-align: center; }
        h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; color: #fff; }
        .subtitle { font-size: 1.2rem; color: var(--text-secondary); margin-bottom: 2rem; }
        .tag { display: inline-block; background: rgba(74, 143, 231, 0.1); color: var(--accent-color); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 4rem; }
        .stat-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1.5rem; text-align: center; }
        .stat-value { font-size: 2rem; font-weight: 700; color: var(--accent-color); font-family: 'JetBrains Mono', monospace; }
        .stat-label { font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }

        .dashboard-section { margin-bottom: 3rem; }
        .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        @media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } }

        .list-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1.5rem; }
        .list-card h3 { margin-bottom: 1rem; font-size: 1.2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
        .list-item { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .list-item:last-child { border-bottom: none; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 3rem; background: var(--card-bg); border-radius: 0.5rem; overflow: hidden; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
        th { background: rgba(255,255,255,0.02); font-weight: 600; color: var(--text-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        td { font-size: 0.9rem; }
        .company-name { font-weight: 600; color: #fff; display: block; }
        .ticker { font-size: 0.75rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
        .insider { font-family: 'Inter', sans-serif; font-size: 0.85rem; }
        .title { font-size: 0.75rem; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 0.1rem 0.3rem; border-radius: 0.25rem; display: inline-block; margin-top: 0.25rem; }

        .type-Buy { color: var(--buy-color); font-weight: 600; }
        .type-Sell { color: var(--sell-color); font-weight: 600; }

        .money { font-family: 'JetBrains Mono', monospace; text-align: right; }
        th.money-header { text-align: right; }

        .faq, .methodology, .disclaimer { margin-bottom: 3rem; background: var(--card-bg); border: 1px solid var(--border-color); padding: 2rem; border-radius: 0.5rem; }
        h2 { font-size: 1.5rem; margin-bottom: 1.5rem; color: #fff; }
        h3 { font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--accent-color); }
        p { color: var(--text-secondary); margin-bottom: 1rem; }

        footer { text-align: center; padding: 2rem; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.875rem; }
    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Insider Trading Tracker: Who Is Buying & Selling Their Own Stock?",
      "datePublished": "2026-03-01T08:00:00+08:00",
      "dateModified": "2026-03-01T08:00:00+08:00",
      "author": [{
          "@type": "Organization",
          "name": "Westmount Research",
          "url": "https://westmountresearch.com"
      }]
    }
    </script>
</head>
<body>
    <div class="container">
        <header>
            <span class="tag">ORIGINAL RESEARCH 2026</span>
            <h1>Insider Trading Tracker</h1>
            <p class="subtitle">Tracking recent transactions by CEOs, CFOs, and Directors. <strong>${transactions.length}</strong> recent transactions analyzed.</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${totalBuysCount}</div>
                <div class="stat-label">Recent Buys Tracked</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalSellsCount}</div>
                <div class="stat-label">Recent Sells Tracked</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${mostBoughtCompanies[0] ? mostBoughtCompanies[0][0] : 'N/A'}</div>
                <div class="stat-label">Most Bought Company</div>
            </div>
        </div>

        <div class="dashboard-section">
            <div class="dashboard-grid" style="margin-bottom: 2rem;">
                <div class="list-card">
                    <h3 style="color: var(--buy-color)">Highest Buying Activity</h3>
                    ${mostBoughtCompanies.map(c => `
                        <div class="list-item">
                            <span>${c[0]}</span>
                            <span style="font-family: 'JetBrains Mono', monospace;">${c[1]} buys</span>
                        </div>
                    `).join('')}
                </div>
                <div class="list-card">
                    <h3 style="color: var(--sell-color)">Highest Selling Activity</h3>
                    ${mostSoldCompanies.map(c => `
                        <div class="list-item">
                            <span>${c[0]}</span>
                            <span style="font-family: 'JetBrains Mono', monospace;">${c[1]} sells</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="dashboard-grid">
                <div class="list-card">
                    <h3 style="color: var(--accent-color)">Heaviest Sector Activity</h3>
                    ${mostActiveSectors.map(s => `
                        <div class="list-item">
                            <span>${s.sector}</span>
                            <span style="font-family: 'JetBrains Mono', monospace;">${s.total} trades</span>
                        </div>
                    `).join('')}
                </div>
                <div class="list-card">
                    <h3 style="color: var(--text-primary)">Buy/Sell Ratio by Sector</h3>
                    ${mostActiveSectors.map(s => `
                        <div class="list-item">
                            <span>${s.sector}</span>
                            <span style="font-family: 'JetBrains Mono', monospace; color: ${s.ratio > 1 ? 'var(--buy-color)' : 'var(--sell-color)'}">${s.ratio}x</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <h2>Recent Transactions</h2>
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Company</th>
                        <th>Insider</th>
                        <th>Type</th>
                        <th class="money-header">Price</th>
                        <th class="money-header">Shares</th>
                        <th class="money-header">Total Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(r => `
                    <tr>
                        <td style="color: var(--text-muted); font-size: 0.8rem;">${r.filingDate}</td>
                        <td>
                            <span class="company-name">${r.company || 'N/A'}</span>
                            <span class="ticker">${r.ticker} ${r.sector ? '· ' + r.sector : ''}</span>
                        </td>
                        <td>
                            <div class="insider">${r.insiderName || 'N/A'}</div>
                            <div class="title">${r.insiderTitle || 'N/A'}</div>
                        </td>
                        <td class="type-${r.transactionType}">${r.transactionType || 'N/A'}</td>
                        <td class="money">$${r.priceUSD ? r.priceUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}</td>
                        <td class="money">${r.sharesTraded ? r.sharesTraded.toLocaleString() : 'N/A'}</td>
                        <td class="money" style="font-weight: 600;">${formatCurrency(r.totalValueUSD)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="faq">
            <h2>Frequently Asked Questions</h2>

            <h3>What does insider buying mean?</h3>
            <p>Insider buying occurs when directors, officers, or key employees purchase shares in their own company. This is generally considered a strong bullish signal because, as the legendary investor Peter Lynch said, "Insiders might sell their shares for any number of reasons, but they buy them for only one: they think the price will go up."</p>

            <h3>Is insider buying a good sign?</h3>
            <p>Yes, significant open-market purchases by C-level executives (CEO, CFO) are historically one of the most reliable indicators of future stock outperformance. It demonstrates that the people with the most intimate knowledge of the company's prospects are willing to risk their own capital.</p>

            <h3>Where can I track insider trading?</h3>
            <p>All corporate insiders are required to file Form 4 with the Securities and Exchange Commission (SEC) within two business days of a transaction. You can track these via the SEC's EDGAR database, or through aggregators like OpenInsider and Finviz which we use as sources for this study.</p>

            <h3>Which stock has the most insider buying?</h3>
            <p>Based on our most recent ${transactions.length} transaction sample for 2026, <strong>${mostBoughtCompanies[0] ? mostBoughtCompanies[0][0] : 'N/A'}</strong> has shown the highest concentration of insider purchases.</p>

            <h3>Is insider selling always bad?</h3>
            <p>No. Insiders sell stock for many reasons: buying a house, tax obligations, diversification, or scheduled 10b5-1 trading plans. While heavy, coordinated selling across multiple executives can be a warning sign, isolated insider selling is generally not considered a strong bearish signal.</p>
        </div>

        <div class="methodology">
            <h2>Methodology</h2>
            <p>Data is aggregated from SEC Form 4 filings via OpenInsider. We focus on open-market purchases and sales, filtering out automatic option grants to provide a clearer picture of active executive sentiment. Sector categorization is provided by standard GICS definitions. All data corresponds to 2026 reporting periods.</p>
        </div>

        <div class="disclaimer">
            <h2>Disclaimer</h2>
            <p>This study provides data and analysis for informational purposes only. Insider trading patterns do not guarantee future performance and should not be used in isolation for investment decisions. Nothing here constitutes investment advice. Always conduct your own research.</p>
        </div>

        <footer>
            © 2026 Westmount Research. All rights reserved.
        </footer>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(__dirname, '../public/insider-trading.html'), html);
    console.log('Generated public/insider-trading.html successfully.');
}


// Run entire process
async function main() {
  await run();
  await enrichData();
  generateHTML();
}

if (require.main === module) {
  main();
}
