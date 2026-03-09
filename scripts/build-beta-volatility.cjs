const fs = require('fs');
const path = require('path');

function escapeHTML(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateHTML() {
  const dataPath = path.join(__dirname, '../data/beta-volatility.json');
  let items = [];
  if (fs.existsSync(dataPath)) {
    items = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }

  // Filter out items without beta or return
  const validItems = items.filter(i => i.beta !== null && i.ytd_return !== null);

  // Sort by beta
  validItems.sort((a, b) => (b.beta || 0) - (a.beta || 0));

  const numItems = validItems.length;

  let topBeta = 0;
  let topBetaTicker = '';
  if (numItems > 0) {
    topBeta = validItems[0].beta;
    topBetaTicker = validItems[0].ticker;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  });

  const ratioFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  let tableRows = '';
  validItems.forEach((item, index) => {
    tableRows += `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="company-name">${escapeHTML(item.company)}</div>
          <div class="company-ticker">${escapeHTML(item.ticker)} <span class="sector-tag">${escapeHTML(item.sector || 'Unknown')}</span></div>
        </td>
        <td class="num">${item.beta ? ratioFormatter.format(item.beta) : 'N/A'}</td>
        <td class="num">${item.volatility_52wk ? percentFormatter.format(item.volatility_52wk) : 'N/A'}</td>
        <td class="num ${item.ytd_return >= 0 ? 'positive' : 'negative'}">${item.ytd_return !== null ? percentFormatter.format(item.ytd_return) : 'N/A'}</td>
        <td class="num">${item.market_cap ? '$' + formatter.format(item.market_cap) : 'N/A'}</td>
      </tr>
    `;
  });

  // Generate simple scatter plot SVG points (Beta vs Return)
  let svgPoints = '';
  if (numItems > 0) {
    const minBeta = Math.min(...validItems.map(i => i.beta));
    const maxBeta = Math.max(...validItems.map(i => i.beta));
    const minReturn = Math.min(...validItems.map(i => i.ytd_return));
    const maxReturn = Math.max(...validItems.map(i => i.ytd_return));

    const width = 800;
    const height = 400;
    const padding = 40;

    const scaleX = (val) => padding + ((val - minBeta) / (maxBeta - minBeta)) * (width - 2 * padding);
    const scaleY = (val) => height - padding - ((val - minReturn) / (maxReturn - minReturn)) * (height - 2 * padding);

    // Draw axes
    const zeroY = minReturn < 0 && maxReturn > 0 ? scaleY(0) : height - padding;
    const oneX = minBeta < 1 && maxBeta > 1 ? scaleX(1) : padding;

    svgPoints += `<line x1="${padding}" y1="${zeroY}" x2="${width - padding}" y2="${zeroY}" stroke="#152040" stroke-width="1" />`;
    svgPoints += `<line x1="${oneX}" y1="${padding}" x2="${oneX}" y2="${height - padding}" stroke="#152040" stroke-width="1" stroke-dasharray="4" />`;

    // Axis labels
    svgPoints += `<text x="${width/2}" y="${height - 5}" fill="#94a3b8" font-size="12" text-anchor="middle">Beta (Market Sensitivity)</text>`;
    svgPoints += `<text x="${15}" y="${height/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90, 15, ${height/2})">YTD Return</text>`;

    validItems.forEach(item => {
      const x = scaleX(item.beta);
      const y = scaleY(item.ytd_return);
      svgPoints += `<circle cx="${x}" cy="${y}" r="3" fill="#4a8fe7" opacity="0.6"><title>${escapeHTML(item.ticker)}: Beta ${ratioFormatter.format(item.beta)}, Ret ${percentFormatter.format(item.ytd_return)}</title></circle>`;
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Beta & Volatility Rankings: S&P 500 Risk Analysis (2026)</title>
    <meta name="description" content="Rankings of S&P 500 stocks by beta and volatility. Identify high-beta and low-beta stocks for aggressive and defensive portfolios.">
    <link rel="canonical" href="https://westmountfundamentals.com/beta-volatility">
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
            --positive: #10b981;
            --negative: #ef4444;
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-sans);
            background-color: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }

        a {
            color: var(--accent-color);
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        header {
            padding: 80px 0 40px;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 40px;
        }

        .breadcrumb {
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-bottom: 20px;
        }

        h1 {
            font-size: 3rem;
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 20px;
            letter-spacing: -0.02em;
        }

        .subtitle {
            font-size: 1.25rem;
            color: var(--text-secondary);
            max-width: 800px;
            margin-bottom: 30px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--accent-color);
            margin-bottom: 8px;
            font-family: var(--font-mono);
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .content-section {
            margin-bottom: 60px;
        }

        h2 {
            font-size: 1.875rem;
            font-weight: 700;
            margin-bottom: 24px;
            color: var(--text-primary);
        }

        .chart-container {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
            overflow-x: auto;
        }

        .table-container {
            overflow-x: auto;
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            margin-bottom: 30px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            background-color: rgba(21, 32, 64, 0.5);
            padding: 16px 20px;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            font-weight: 600;
            border-bottom: 1px solid var(--border-color);
            white-space: nowrap;
        }

        td {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .company-name {
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 4px;
        }

        .company-ticker {
            font-size: 0.8rem;
            color: var(--text-muted);
            font-family: var(--font-mono);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sector-tag {
            background-color: rgba(100, 116, 139, 0.1);
            color: var(--text-secondary);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            font-family: var(--font-sans);
        }

        .num {
            font-family: var(--font-mono);
            font-size: 0.9rem;
            white-space: nowrap;
        }

        .positive { color: var(--positive); }
        .negative { color: var(--negative); }

        .faq-item {
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--border-color);
        }

        .faq-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .faq-question {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 12px;
        }

        .faq-answer {
            color: var(--text-secondary);
        }

        .methodology {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 40px;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .methodology h3 {
            color: var(--text-primary);
            margin-bottom: 16px;
            font-size: 1.25rem;
        }

        .methodology ul {
            margin-left: 20px;
            margin-bottom: 16px;
        }

        .methodology li {
            margin-bottom: 8px;
        }

        footer {
            padding: 40px 0;
            border-top: 1px solid var(--border-color);
            text-align: center;
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            h1 { font-size: 2.25rem; }
            .stats-grid { grid-template-columns: 1fr; }
            td, th { padding: 12px 16px; }
        }
    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Beta & Volatility Rankings: S&P 500 Risk Analysis",
      "author": {
        "@type": "Organization",
        "name": "Westmount Research"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Westmount Research",
        "logo": {
          "@type": "ImageObject",
          "url": "https://westmountfundamentals.com/favicon.svg"
        }
      },
      "datePublished": "2026-03-09",
      "dateModified": "2026-03-09"
    }
    </script>
</head>
<body>
    <div class="container">
        <header>
            <div class="breadcrumb">
                <a href="/">Westmount Research</a> &rsaquo; Studies &rsaquo; Beta & Volatility Rankings
            </div>
            <h1>Beta & Volatility Rankings 2026</h1>
            <p class="subtitle">Rankings of S&P 500 stocks by beta (market sensitivity) and historical volatility. Find low-beta defensive stocks and high-beta aggressive names across all sectors.</p>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${numItems}</div>
                    <div class="stat-label">S&P 500 Stocks Analyzed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${ratioFormatter.format(topBeta)}</div>
                    <div class="stat-label">Highest Beta (${topBetaTicker})</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">1.00</div>
                    <div class="stat-label">Market Baseline Beta</div>
                </div>
            </div>
        </header>

        <main>
            <section class="content-section">
                <h2>Beta vs. YTD Return</h2>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">A scatter plot showing the relationship between a stock's sensitivity to the market (Beta) and its Year-to-Date return.</p>
                <div class="chart-container">
                    <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
                        ${svgPoints}
                    </svg>
                </div>
            </section>

            <section class="content-section">
                <h2>Rankings</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Company</th>
                                <th>Beta (5Y Monthly)</th>
                                <th>Volatility (1Y Annualized)</th>
                                <th>YTD Return</th>
                                <th>Market Cap</th>
                                <th>Avg Volume</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="content-section">
                <h2>Frequently Asked Questions</h2>

                <div class="faq-item">
                    <div class="faq-question">What is Beta?</div>
                    <div class="faq-answer">Beta is a measure of a stock's volatility in relation to the overall market (usually the S&P 500). A beta of 1.0 means the stock tends to move with the market. A beta greater than 1.0 indicates high volatility and higher sensitivity to market movements. A beta less than 1.0 indicates the stock is less volatile than the market.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">What is Volatility?</div>
                    <div class="faq-answer">In this context, volatility measures the dispersion of returns for a given security or market index. Higher volatility means the price of the stock can change dramatically over a short time period in either direction. Lower volatility means the value does not fluctuate dramatically, but changes in value at a steady pace over a period of time.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Why look for low-beta stocks?</div>
                    <div class="faq-answer">Investors look for low-beta stocks for defensive portfolios because they are theoretically less volatile than the market, which can offer stability during market downturns, preserving capital.</div>
                </div>
            </section>

            <section class="methodology">
                <h3>Methodology & Data</h3>
                <p>Data was collected for ${numItems} S&P 500 components as of 2026. The analysis excludes companies missing beta or return data.</p>
                <ul>
                    <li><strong>Beta:</strong> Sourced from Yahoo Finance, representing the 5-year monthly beta compared to the S&P 500.</li>
                    <li><strong>Volatility (1Y Annualized):</strong> Calculated as the annualized standard deviation of daily returns over the past 52 weeks.</li>
                    <li><strong>YTD Return:</strong> Calculated using the year-to-date daily close price differences.</li>
                </ul>
                <p><em>Disclaimer: This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research.</em></p>
            </section>
        </main>

        <footer>
            <p>&copy; 2026 Westmount Research. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>`;

  const outPath = path.join(__dirname, '../public/beta-volatility.html');
  fs.writeFileSync(outPath, html);
  console.log('HTML generated successfully at public/beta-volatility.html');
}

generateHTML();
