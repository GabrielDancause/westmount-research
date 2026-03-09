const fs = require('fs');
const path = require('path');

function generateHTML() {
  const dataPath = path.join(__dirname, '../data/roe-rankings.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Data file not found at', dataPath);
    return;
  }

  const results = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Filter out any outliers or bad data if needed
  // For ROE, extremely high numbers often mean tiny positive equity, which is essentially negative equity behavior.
  // We'll keep them but maybe flag them.

  const formatter = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 1, maximumFractionDigits: 1, notation: 'compact' });
  const numFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Escape HTML helper
  const escapeHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  };

  let tableRows = '';

  // Calculate Sector averages
  const sectorMap = {};
  results.forEach(r => {
    if (!sectorMap[r.sector]) {
      sectorMap[r.sector] = { totalRoe: 0, count: 0, companies: [] };
    }
    // Exclude extreme outliers from sector average (e.g. ROE > 1000%)
    if (r.roe > -10 && r.roe < 10) {
      sectorMap[r.sector].totalRoe += r.roe;
      sectorMap[r.sector].count += 1;
    }
    sectorMap[r.sector].companies.push(r);
  });

  const sectorAverages = Object.keys(sectorMap).map(sector => {
    return {
      sector,
      avgRoe: sectorMap[sector].count > 0 ? sectorMap[sector].totalRoe / sectorMap[sector].count : 0,
      count: sectorMap[sector].companies.length
    };
  }).sort((a, b) => b.avgRoe - a.avgRoe);

  let chartBars = '';
  const maxAvgRoe = Math.max(...sectorAverages.map(s => s.avgRoe));

  sectorAverages.forEach(s => {
    const width = Math.max(0, (s.avgRoe / maxAvgRoe) * 100);
    const formattedRoe = formatter.format(s.avgRoe);
    chartBars += `
      <div class="chart-row">
        <div class="chart-label">${escapeHTML(s.sector)}</div>
        <div class="chart-bar-container">
          <div class="chart-bar" style="width: ${width}%"></div>
          <span class="chart-value">${formattedRoe}</span>
        </div>
      </div>
    `;
  });

  // Top 150 or so for the table
  const displayResults = results.slice(0, 150);

  displayResults.forEach((item, index) => {
    const isOutlier = item.roe > 5; // > 500% usually means equity is near zero

    tableRows += `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="company-name">${escapeHTML(item.company)}</div>
          <div class="company-ticker">${escapeHTML(item.ticker)}</div>
        </td>
        <td><span class="sector-tag">${escapeHTML(item.sector)}</span></td>
        <td class="num ${isOutlier ? 'outlier' : ''}">${formatter.format(item.roe)}</td>
        <td class="num">${moneyFormatter.format(item.net_income)}</td>
        <td class="num">${item.equity ? moneyFormatter.format(item.equity) : 'N/A'}</td>
        <td class="num">${moneyFormatter.format(item.market_cap)}</td>
        <td class="num">${item.pe_ratio ? numFormatter.format(item.pe_ratio) : 'N/A'}</td>
      </tr>
    `;
  });

  const numItems = results.length;
  const topCompany = results[0];
  const avgSAndP = results.filter(r => r.roe > -10 && r.roe < 10).reduce((acc, curr) => acc + curr.roe, 0) / results.filter(r => r.roe > -10 && r.roe < 10).length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Return on Equity Rankings: Most Efficient S&P 500 Companies 2026</title>
    <meta name="description" content="S&P 500 companies ranked by Return on Equity (ROE). Discover which companies generate the most profit from shareholder capital in 2026.">
    <style>
        :root {
            --bg-color: #060a12;
            --card-bg: #0a1020;
            --border-color: #152040;
            --accent-color: #4a8fe7;
            --text-primary: #c8d0de;
            --text-secondary: #8a9bb3;
            --text-muted: #5a6a80;
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            --positive: #10b981;
            --negative: #ef4444;
            --warning: #f59e0b;
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

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 24px;
        }

        header {
            margin-bottom: 48px;
            text-align: center;
        }

        .breadcrumb {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: 16px;
            font-weight: 500;
        }

        .breadcrumb a {
            color: var(--accent-color);
            text-decoration: none;
        }

        .breadcrumb a:hover {
            text-decoration: underline;
        }

        h1 {
            font-size: 2.75rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 16px;
            color: #fff;
            line-height: 1.2;
        }

        .subtitle {
            font-size: 1.125rem;
            color: var(--text-secondary);
            max-width: 700px;
            margin: 0 auto 32px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 40px;
        }

        .stat-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            transition: transform 0.2s, border-color 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            border-color: var(--accent-color);
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--accent-color);
            margin-bottom: 8px;
            line-height: 1;
            font-family: var(--font-mono);
            letter-spacing: -1px;
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .content-section {
            margin-bottom: 64px;
        }

        h2 {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 24px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        /* Chart styles */
        .chart-container {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 40px;
        }

        .chart-row {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
        }

        .chart-row:last-child {
            margin-bottom: 0;
        }

        .chart-label {
            width: 200px;
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--text-secondary);
            text-align: right;
            padding-right: 16px;
        }

        .chart-bar-container {
            flex-grow: 1;
            display: flex;
            align-items: center;
            height: 24px;
        }

        .chart-bar {
            height: 100%;
            background-color: var(--accent-color);
            border-radius: 4px;
            min-width: 4px;
        }

        .chart-value {
            margin-left: 12px;
            font-family: var(--font-mono);
            font-size: 0.85rem;
            font-weight: 600;
        }

        .table-container {
            overflow-x: auto;
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
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
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
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

        .outlier {
            color: var(--warning);
        }

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
            h1 {
                font-size: 2.25rem;
            }
            .stats-grid {
                grid-template-columns: 1fr;
            }
            .chart-label {
                width: 100px;
                font-size: 0.8rem;
                padding-right: 8px;
            }
            td, th {
                padding: 12px 16px;
            }
        }
    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Return on Equity Rankings: Most Efficient S&P 500 Companies 2026",
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
                <a href="/">Westmount Research</a> &rsaquo; Studies &rsaquo; Return on Equity Rankings
            </div>
            <h1>Return on Equity Rankings 2026</h1>
            <p class="subtitle">An analysis of ${numItems} S&P 500 companies ranked by Return on Equity (ROE). A measure of financial performance calculated by dividing net income by shareholders' equity.</p>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${numItems}</div>
                    <div class="stat-label">Companies Analyzed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatter.format(topCompany.roe)}</div>
                    <div class="stat-label">Highest ROE (${escapeHTML(topCompany.ticker)})</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatter.format(avgSAndP)}</div>
                    <div class="stat-label">S&P 500 Avg ROE</div>
                </div>
            </div>
        </header>

        <main>
            <section class="content-section">
                <h2>Sector Averages</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">Comparing average Return on Equity across different GICS sectors. Technology and Consumer Discretionary typically lead, while Capital Intensive sectors like Utilities and Real Estate run lower.</p>
                <div class="chart-container">
                    ${chartBars}
                </div>
            </section>

            <section class="content-section">
                <h2>Top 150 Performers by ROE</h2>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">Companies are ranked by their Return on Equity. Extremely high percentages (>500%) are often the result of aggressive share buybacks reducing total shareholder equity to near zero.</p>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Company</th>
                                <th>Sector</th>
                                <th>ROE</th>
                                <th>Net Income (TTM)</th>
                                <th>Shareholder Equity</th>
                                <th>Market Cap</th>
                                <th>P/E Ratio</th>
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
                    <div class="faq-question">What is Return on Equity (ROE)?</div>
                    <div class="faq-answer">Return on equity (ROE) is a measure of financial performance calculated by dividing net income by shareholders' equity. Because shareholders' equity is equal to a company's assets minus its debt, ROE is considered the return on net assets.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">What is considered a "good" ROE?</div>
                    <div class="faq-answer">A good ROE depends on the industry average. Generally, an ROE of 15-20% is considered excellent. Ratios across sectors vary greatly, making it more useful to compare a company's ROE to its industry peers rather than the broader market.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Why do some companies have extremely high ROE (e.g., >500%)?</div>
                    <div class="faq-answer">Extremely high ROE figures are often artificially inflated by negative or near-zero shareholder equity. This frequently happens when a company aggressively buys back its own stock, which reduces shareholder equity on the balance sheet. In these cases, ROE becomes less meaningful as a performance metric.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Can a company have a negative ROE?</div>
                    <div class="faq-answer">Yes, if a company has negative net income (i.e., it's losing money), its ROE will be negative. This indicates that the company is destroying shareholder value rather than creating it.</div>
                </div>
            </section>

            <section class="methodology">
                <h3>Methodology & Data</h3>
                <p>Data was collected for ${numItems} S&P 500 components as of 2026. The analysis excludes companies where net income or market capitalization data was entirely unavailable.</p>
                <ul>
                    <li><strong>Return on Equity (ROE):</strong> Calculated as Trailing Twelve Months (TTM) Net Income divided by Total Shareholders' Equity.</li>
                    <li><strong>Shareholder Equity:</strong> Calculated implicitly from ROE and Net Income, or retrieved directly from recent balance sheets.</li>
                    <li><strong>Sector Averages:</strong> Calculated by taking the mean ROE of all analyzed companies within a given sector, excluding extreme outliers (>1000% or <-1000%).</li>
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

  const outPath = path.join(__dirname, '../public/roe-rankings.html');
  fs.writeFileSync(outPath, html);
  console.log('HTML generated successfully at public/roe-rankings.html');
}

generateHTML();
