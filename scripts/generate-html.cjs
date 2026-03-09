const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/insider-trading.json');
const htmlPath = path.join(__dirname, '../public/insider-trading.html');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const formatCurrency = (val) => {
  if (val === null) return 'N/A';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString()}`;
};

const formatShares = (val) => {
  if (val === null) return 'N/A';
  return val.toLocaleString();
};

const renderTransactions = (transactions) => {
  return transactions.map(t => {
    const isBuy = t.transactionType === 'Buy';
    const typeColor = isBuy ? '#4caf50' : '#f44336';
    return `
      <tr style="border-bottom: 1px solid #152040;">
        <td style="padding: 12px; font-weight: bold;">${t.ticker}</td>
        <td style="padding: 12px; color: #a0aabf;">${t.company || 'N/A'}</td>
        <td style="padding: 12px;">${t.insiderName || 'N/A'}<br><span style="font-size: 0.8em; color: #5a6a80;">${t.insiderTitle || 'N/A'}</span></td>
        <td style="padding: 12px; color: ${typeColor}; font-weight: bold;">${t.transactionType}</td>
        <td style="padding: 12px; text-align: right;">${formatShares(t.sharesTraded)}</td>
        <td style="padding: 12px; text-align: right;">${t.priceUSD ? '$' + t.priceUSD.toFixed(2) : 'N/A'}</td>
        <td style="padding: 12px; text-align: right;">${formatCurrency(t.totalValueUSD)}</td>
        <td style="padding: 12px; text-align: right;">${formatShares(t.sharesOwned)}</td>
        <td style="padding: 12px;">${t.sector || 'N/A'}</td>
        <td style="padding: 12px; font-size: 0.85em; color: #5a6a80;">${t.filingDate || 'N/A'}</td>
      </tr>
    `;
  }).join('');
};

const renderAggregates = (aggregates) => {
  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px;">
      <div style="background: #0a1020; border: 1px solid #152040; padding: 20px; border-radius: 8px;">
        <h3 style="color: #4a8fe7; margin-bottom: 15px; font-size: 1.1rem;">Top Insider Buying</h3>
        <ul style="list-style: none; padding: 0;">
          ${aggregates.topBuyCompanies.map(c => `<li style="margin-bottom: 8px; display: flex; justify-content: space-between;"><span>${c.company}</span> <span style="color: #4caf50;">${formatCurrency(c.value)}</span></li>`).join('')}
        </ul>
      </div>
      <div style="background: #0a1020; border: 1px solid #152040; padding: 20px; border-radius: 8px;">
        <h3 style="color: #4a8fe7; margin-bottom: 15px; font-size: 1.1rem;">Top Insider Selling</h3>
        <ul style="list-style: none; padding: 0;">
          ${aggregates.topSellCompanies.map(c => `<li style="margin-bottom: 8px; display: flex; justify-content: space-between;"><span>${c.company}</span> <span style="color: #f44336;">${formatCurrency(c.value)}</span></li>`).join('')}
        </ul>
      </div>
      <div style="background: #0a1020; border: 1px solid #152040; padding: 20px; border-radius: 8px;">
        <h3 style="color: #4a8fe7; margin-bottom: 15px; font-size: 1.1rem;">Heaviest Activity (Sectors)</h3>
        <ul style="list-style: none; padding: 0;">
          ${aggregates.topSectorsActivity.map(s => `<li style="margin-bottom: 8px; display: flex; justify-content: space-between;"><span>${s.sector}</span> <span>${formatCurrency(s.value)}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  `;
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Insider Trading Tracker: Who Is Buying & Selling Their Own Stock?",
  "description": "Track recent insider transactions. Which executives are buying and selling their own stock?",
  "datePublished": "2026-01-01T00:00:00+00:00",
  "dateModified": new Date().toISOString(),
  "author": {
    "@type": "Organization",
    "name": "Westmount Research"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Westmount Research",
    "logo": {
      "@type": "ImageObject",
      "url": "https://westmountresearch.com/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://westmountresearch.com/insider-trading"
  }
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Insider Trading Tracker: Who Is Buying & Selling Their Own Stock? | Westmount Research</title>
  <meta name="description" content="Track recent insider transactions. Which executives are buying and selling their own stock?">
  <link rel="canonical" href="https://westmountresearch.com/insider-trading">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #060a12;
      color: #c8d0de;
      line-height: 1.6;
    }
    h1, h2, h3, h4 { color: #fff; font-weight: 800; letter-spacing: -0.5px; }
    a { color: #4a8fe7; text-decoration: none; }
    a:hover { text-decoration: underline; }

    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }

    header { text-align: center; margin-bottom: 50px; }
    header h1 { font-size: 2.8rem; margin-bottom: 16px; color: #fff; }
    header p { font-size: 1.1rem; color: #5a6a80; max-width: 700px; margin: 0 auto; }

    .card {
      background: #0a1020;
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 40px;
      overflow-x: auto;
    }

    table { width: 100%; border-collapse: collapse; min-width: 900px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; }
    th { text-align: left; padding: 12px; border-bottom: 2px solid #152040; color: #4a8fe7; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; font-family: 'Inter', sans-serif;}

    .faq-section { margin-top: 50px; margin-bottom: 50px; }
    .faq-item { background: #0a1020; border: 1px solid #152040; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
    .faq-item h3 { color: #4a8fe7; margin-bottom: 10px; font-size: 1.1rem; }
    .faq-item p { color: #a0aabf; font-size: 0.95rem; }

    .methodology, .disclaimer { margin-top: 40px; padding: 20px; border-top: 1px solid #152040; font-size: 0.85rem; color: #5a6a80; }
    .disclaimer { border-top: none; padding-top: 0; }

    footer { text-align: center; margin-top: 60px; padding-top: 30px; border-top: 1px solid #152040; color: #5a6a80; font-size: 0.9rem; }
  </style>
  <script type="application/ld+json">
    ${JSON.stringify(jsonLd)}
  </script>
</head>
<body>
  <div class="container">
    <header>
      <h1>Insider Trading Tracker 2026</h1>
      <p>Tracking the most recent insider transactions. See who is buying and selling their own company's stock.</p>
    </header>

    <h2>Activity Overview</h2>
    ${renderAggregates(data.aggregates)}

    <h2>Recent Insider Transactions</h2>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Company</th>
            <th>Insider</th>
            <th>Type</th>
            <th style="text-align: right;">Shares</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Value</th>
            <th style="text-align: right;">Owned After</th>
            <th>Sector</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${renderTransactions(data.transactions)}
        </tbody>
      </table>
    </div>

    <div class="faq-section">
      <h2>Frequently Asked Questions</h2>

      <div class="faq-item">
        <h3>What does insider buying mean?</h3>
        <p>Insider buying occurs when a company executive, director, or significant shareholder purchases shares of their own company's stock using their own money. It indicates they have confidence in the company's future prospects.</p>
      </div>

      <div class="faq-item">
        <h3>Is insider buying a good sign?</h3>
        <p>Yes, insider buying is generally considered one of the strongest bullish signals in the market. As legendary investor Peter Lynch famously said, "Insiders might sell their shares for any number of reasons, but they buy them for only one: they think the price will go up."</p>
      </div>

      <div class="faq-item">
        <h3>Where can I track insider trading?</h3>
        <p>Insider trading is publicly reported to the SEC via Form 4 filings. You can track these filings directly on the SEC's EDGAR database, or use trackers like this page, OpenInsider, or financial news portals.</p>
      </div>

      <div class="faq-item">
        <h3>Which stock has the most insider buying?</h3>
        <p>According to our recent data scrape, the top companies experiencing insider buying are currently ${data.aggregates.topBuyCompanies.map(c => c.company).join(', ')}. This can change rapidly as new filings are published.</p>
      </div>

      <div class="faq-item">
        <h3>Is insider selling always bad?</h3>
        <p>No. Executives sell stock for many reasons that have nothing to do with the company's fundamentals. They might sell to buy a house, pay taxes, diversify their portfolio, or cover costs of exercising options. However, massive, uncharacteristic selling by multiple executives at once can be a red flag.</p>
      </div>
    </div>

    <div class="methodology">
      <strong>Methodology:</strong> Data is sourced from recent SEC Form 4 filings representing top purchases over $25k and significant sales over $100k. Sectors are matched via GICS mappings. Transactions labeled 'Option Execute' or related to compensation are included where relevant. Data reflects snapshots in time and may not be exhaustive.
    </div>

    <div class="disclaimer">
      <strong>Disclaimer:</strong> This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research before making any investment decisions based on insider trading activity.
    </div>

    <footer>
      &copy; 2026 Westmount Research. All rights reserved.
    </footer>
  </div>
</body>
</html>`;

fs.writeFileSync(htmlPath, html);
console.log('HTML generated at public/insider-trading.html');
