const fs = require('fs');
const path = require('path');

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(val) {
  if (val == null) return 'N/A';
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
  return '$' + val.toFixed(2);
}

function formatNumber(val) {
  if (val == null) return 'N/A';
  return new Intl.NumberFormat('en-US').format(val);
}

const dataPath = path.join(__dirname, '..', 'data', 'insider-trading.json');
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Deduplicate transactions just in case (e.g. same ticker, name, date, qty, type)
const seen = new Set();
const data = [];
for (const row of rawData) {
  const key = `${row.ticker}-${row.insiderName}-${row.filingDate}-${row.sharesTraded}-${row.transactionType}`;
  if (!seen.has(key)) {
    seen.add(key);
    data.push(row);
  }
}

// Compute Aggregates
const companyBuys = {};
const companySells = {};
const sectorBuys = {};
const sectorSells = {};
let totalBuysCount = 0;
let totalSellsCount = 0;

data.forEach(t => {
  const company = t.company || t.ticker;
  const sector = t.sector || 'Unknown';

  if (t.transactionType === 'Buy') {
    totalBuysCount++;
    if (!companyBuys[company]) companyBuys[company] = { totalValue: 0, count: 0, ticker: t.ticker };
    companyBuys[company].totalValue += t.totalValueUSD || 0;
    companyBuys[company].count += 1;

    if (!sectorBuys[sector]) sectorBuys[sector] = { totalValue: 0, count: 0 };
    sectorBuys[sector].totalValue += t.totalValueUSD || 0;
    sectorBuys[sector].count += 1;
  } else if (t.transactionType === 'Sell') {
    totalSellsCount++;
    if (!companySells[company]) companySells[company] = { totalValue: 0, count: 0, ticker: t.ticker };
    companySells[company].totalValue += t.totalValueUSD || 0;
    companySells[company].count += 1;

    if (!sectorSells[sector]) sectorSells[sector] = { totalValue: 0, count: 0 };
    sectorSells[sector].totalValue += t.totalValueUSD || 0;
    sectorSells[sector].count += 1;
  }
});

const topCompaniesBuys = Object.entries(companyBuys)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 5);

const topCompaniesSells = Object.entries(companySells)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 5);

const allSectors = new Set([...Object.keys(sectorBuys), ...Object.keys(sectorSells)]);
const sectorStats = Array.from(allSectors).map(sector => {
  const buys = sectorBuys[sector] || { totalValue: 0, count: 0 };
  const sells = sectorSells[sector] || { totalValue: 0, count: 0 };
  const totalValue = buys.totalValue + sells.totalValue;
  const buyRatio = sells.totalValue > 0 ? (buys.totalValue / sells.totalValue) : (buys.totalValue > 0 ? 100 : 0);
  return { sector, buys, sells, totalValue, buyRatio };
}).sort((a, b) => b.totalValue - a.totalValue);

const topBuyCompanyText = topCompaniesBuys.length > 0 ? topCompaniesBuys[0][0] : "N/A";
const topBuyCompanyValue = topCompaniesBuys.length > 0 ? formatCurrency(topCompaniesBuys[0][1].totalValue) : "$0";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Insider Trading Tracker: Who Is Buying & Selling Their Own Stock?",
  "description": `Tracking ${data.length} recent insider transactions. Discover which executives are buying their own stock.`,
  "author": {
    "@type": "Organization",
    "name": "Westmount Research",
    "url": "https://westmountresearch.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Westmount Research",
    "logo": {
      "@type": "ImageObject",
      "url": "https://westmountresearch.com/logo.png"
    }
  },
  "datePublished": "2026-03-09",
  "dateModified": "2026-03-09"
};

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insider Trading Tracker: Who Is Buying & Selling Their Own Stock? 2026</title>
    <meta name="description" content="Track recent insider transactions (CEO/CFO/Director buys and sells). Discover which companies have the most insider buying.">
    <link rel="canonical" href="https://westmountresearch.com/insider-trading">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

    <script type="application/ld+json">
    ${JSON.stringify(jsonLd)}
    </script>

    <style>
        :root {
            --bg: #060a12;
            --card-bg: #0a1020;
            --border: #152040;
            --accent: #4a8fe7;
            --text-main: #c8d0de;
            --text-muted: #5a6a80;
            --buy: #22c55e;
            --sell: #ef4444;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 24px;
        }

        header {
            text-align: center;
            margin-bottom: 60px;
            padding-bottom: 40px;
            border-bottom: 1px solid var(--border);
        }

        h1 {
            font-size: 2.8rem;
            font-weight: 900;
            color: #fff;
            margin-bottom: 16px;
            letter-spacing: -1px;
        }

        .subtitle {
            font-size: 1.1rem;
            color: var(--text-muted);
            max-width: 600px;
            margin: 0 auto;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            margin-bottom: 60px;
        }

        .stat-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
        }

        .stat-card h3 {
            font-size: 0.9rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .stat-card .value {
            font-size: 2rem;
            font-weight: 800;
            color: var(--accent);
            margin-bottom: 8px;
        }

        .stat-card .desc {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .list-section {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }

        .list-section h2 {
            font-size: 1.5rem;
            color: #fff;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
        }

        .flex-lists {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin-bottom: 60px;
        }

        .list-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid rgba(21, 32, 64, 0.5);
        }

        .list-item:last-child {
            border-bottom: none;
        }

        .list-item-name { font-weight: 600; color: #fff; }
        .list-item-val { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; }

        .table-container {
            overflow-x: auto;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            margin-bottom: 60px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th, td {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border);
        }

        th {
            background: rgba(10, 16, 32, 0.8);
            color: var(--text-muted);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            white-space: nowrap;
        }

        td {
            font-size: 0.95rem;
            color: #fff;
            white-space: nowrap;
        }

        td.mono {
            font-family: 'JetBrains Mono', monospace;
        }

        tr:hover {
            background: rgba(21, 32, 64, 0.3);
        }

        .type-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 700;
        }

        .type-buy {
            background: rgba(34, 197, 94, 0.1);
            color: var(--buy);
        }

        .type-sell {
            background: rgba(239, 68, 68, 0.1);
            color: var(--sell);
        }

        .faq-section, .methodology {
            margin-bottom: 60px;
        }

        .faq-section h2, .methodology h2 {
            font-size: 1.8rem;
            color: #fff;
            margin-bottom: 24px;
        }

        .faq-item {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 16px;
        }

        .faq-item h3 {
            font-size: 1.1rem;
            color: #fff;
            margin-bottom: 12px;
        }

        .faq-item p {
            color: var(--text-muted);
            font-size: 0.95rem;
        }

        .footer {
            text-align: center;
            padding: 40px 24px;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        .footer a {
            color: var(--accent);
            text-decoration: none;
        }

        .disclaimer {
            max-width: 800px;
            margin: 20px auto 0;
            font-size: 0.75rem;
            line-height: 1.5;
            color: #3a4a5a;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <a href="/" style="display:inline-block; color:var(--accent); text-decoration:none; font-weight:700; font-size:0.9rem; margin-bottom:20px; letter-spacing:1px; text-transform:uppercase;">← Back to Research</a>
            <h1>Insider Trading Tracker 2026</h1>
            <p class="subtitle">Tracking recent buys and sells by CEOs, CFOs, and Directors. Discover which executives are betting on their own stock.</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Transactions</h3>
                <div class="value">${data.length}</div>
                <div class="desc">${totalBuysCount} Buys, ${totalSellsCount} Sells</div>
            </div>
            <div class="stat-card">
                <h3>Top Buying Company</h3>
                <div class="value">${escapeHtml(topBuyCompanyText)}</div>
                <div class="desc">${topBuyCompanyValue} in insider buys (Last 3 months)</div>
            </div>
            <div class="stat-card">
                <h3>Most Active Sector</h3>
                <div class="value">${escapeHtml(sectorStats.length > 0 ? sectorStats[0].sector : "N/A")}</div>
                <div class="desc">${sectorStats.length > 0 ? formatCurrency(sectorStats[0].totalValue) : "$0"} total activity</div>
            </div>
        </div>

        <div class="flex-lists">
            <div class="list-section">
                <h2>Most Insider Buying (Value)</h2>
                ${topCompaniesBuys.map(c => `
                <div class="list-item">
                    <span class="list-item-name">${escapeHtml(c[0])}</span>
                    <span class="list-item-val" style="color:var(--buy)">${formatCurrency(c[1].totalValue)}</span>
                </div>`).join('')}
            </div>
            <div class="list-section">
                <h2>Most Insider Selling (Value)</h2>
                ${topCompaniesSells.map(c => `
                <div class="list-item">
                    <span class="list-item-name">${escapeHtml(c[0])}</span>
                    <span class="list-item-val" style="color:var(--sell)">${formatCurrency(c[1].totalValue)}</span>
                </div>`).join('')}
            </div>
        </div>

        <div class="list-section">
            <h2>Activity by Sector</h2>
            <div style="overflow-x:auto;">
                <table style="width:100%; text-align:left; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="background:transparent; padding:12px 0;">Sector</th>
                            <th style="background:transparent; padding:12px 0;">Buy Value</th>
                            <th style="background:transparent; padding:12px 0;">Sell Value</th>
                            <th style="background:transparent; padding:12px 0;">Total Value</th>
                            <th style="background:transparent; padding:12px 0;">Buy/Sell Ratio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sectorStats.map(s => {
                            let ratioText = "N/A";
                            if (s.sells.totalValue > 0) {
                                ratioText = (s.buys.totalValue / s.sells.totalValue).toFixed(2) + "x";
                            } else if (s.buys.totalValue > 0) {
                                ratioText = "All Buys";
                            } else if (s.sells.totalValue > 0) {
                                ratioText = "All Sells";
                            }
                            return `
                        <tr>
                            <td style="padding:12px 0;">${escapeHtml(s.sector)}</td>
                            <td class="mono" style="padding:12px 0; color:var(--buy);">${formatCurrency(s.buys.totalValue)}</td>
                            <td class="mono" style="padding:12px 0; color:var(--sell);">${formatCurrency(s.sells.totalValue)}</td>
                            <td class="mono" style="padding:12px 0;">${formatCurrency(s.totalValue)}</td>
                            <td class="mono" style="padding:12px 0;">${ratioText}</td>
                        </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <h2>Recent Insider Transactions</h2>
        <p style="color:var(--text-muted); margin-bottom:20px; font-size:0.95rem;">Showing ${data.length} recent transactions.</p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Ticker</th>
                        <th>Company</th>
                        <th>Insider</th>
                        <th>Type</th>
                        <th>Shares Traded</th>
                        <th>Price</th>
                        <th>Total Value</th>
                        <th>Sector</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(t => {
                        const isBuy = t.transactionType === 'Buy';
                        const typeClass = isBuy ? 'type-buy' : 'type-sell';
                        const prefix = isBuy ? '+' : '-';
                        return `
                        <tr>
                            <td class="mono">${escapeHtml(t.filingDate.split(' ')[0])}</td>
                            <td class="mono" style="color:var(--accent); font-weight:700;">${escapeHtml(t.ticker)}</td>
                            <td>${escapeHtml(t.company)}</td>
                            <td>
                                <div style="font-weight:600;">${escapeHtml(t.insiderName)}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(t.insiderTitle)}</div>
                            </td>
                            <td><span class="type-badge ${typeClass}">${escapeHtml(t.transactionType)}</span></td>
                            <td class="mono">${prefix}${formatNumber(t.sharesTraded)}</td>
                            <td class="mono">${t.priceUSD ? '$' + t.priceUSD.toFixed(2) : 'N/A'}</td>
                            <td class="mono">${prefix}${formatCurrency(t.totalValueUSD)}</td>
                            <td>${escapeHtml(t.sector)}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div class="faq-item">
                <h3>What does insider buying mean?</h3>
                <p>Insider buying occurs when officers, directors, or key executives of a company purchase shares of their own company's stock. It generally indicates that management is confident in the company's future prospects and believes the stock is undervalued.</p>
            </div>
            <div class="faq-item">
                <h3>Is insider buying a good sign?</h3>
                <p>Yes, insider buying is widely considered one of the strongest bullish signals. As legendary investor Peter Lynch said, "Insiders might sell their shares for any number of reasons, but they buy them for only one: they think the price will go up."</p>
            </div>
            <div class="faq-item">
                <h3>Where can I track insider trading?</h3>
                <p>Insider trading is publicly reported via SEC Form 4 filings. You can track this data directly on the SEC website (EDGAR), or use aggregated platforms like OpenInsider, Finviz, and specialized research sites like Westmount Research.</p>
            </div>
            <div class="faq-item">
                <h3>Which stock has the most insider buying?</h3>
                <p>As of our most recent data analysis in 2026, <strong>${escapeHtml(topBuyCompanyText)}</strong> leads with ${topBuyCompanyValue} in recent insider purchases. This ranking frequently changes based on market conditions and corporate events.</p>
            </div>
            <div class="faq-item">
                <h3>Is insider selling always bad?</h3>
                <p>Not always. Insiders frequently sell stock for personal financial reasons—such as buying a house, paying taxes, or diversifying their portfolio—rather than due to a lack of confidence in the company. However, "cluster selling" by multiple executives at the same time can sometimes be a red flag.</p>
            </div>
        </div>

        <div class="methodology">
            <h2>Methodology</h2>
            <p style="color:var(--text-muted); font-size:0.95rem;">
                This study tracks recent Form 4 filings submitted to the SEC by corporate insiders. We focus exclusively on "open market" or "private" purchases and sales, filtering out option grants or automatic tax-withholding sales to capture genuine directional intent. The data captures transactions generally larger than $25,000 for buys and $100,000 for sells to filter out noise. Data is sourced from public SEC filings, aggregated via openinsider.com, and mapped to GICS sectors using Yahoo Finance.
            </p>
        </div>

        <footer class="footer">
            <div>© 2026 <a href="/">westmount-research</a> · A GAB Ventures property</div>
            <div class="disclaimer">
                DISCLAIMER: This site provides data and analysis for informational purposes only. Insider trading data is delayed and historically collected. Nothing here constitutes investment advice, financial guidance, or a recommendation to buy or sell securities. Do your own research or consult a licensed financial advisor before making any investment decisions.
            </div>
        </footer>
    </div>
</body>
</html>
`;

const outPath = path.join(__dirname, '..', 'public', 'insider-trading.html');
fs.writeFileSync(outPath, htmlContent, 'utf-8');
console.log(`Successfully generated HTML at ${outPath}`);
