const fs = require('fs');
const path = require('path');

function generateHTML() {
  const dataPath = path.join(__dirname, '../data/debt-to-equity.json');
  const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const numItems = items.length;

  // Let's get top 150 items that are heavily leveraged
  const topItems = items.slice(0, 150);

  const mostLeveraged = topItems[0];
  const negativeEquityItems = items.filter(i => i.debtToEquity < 0 || i.totalEquityB < 0);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: "compact",
    maximumFractionDigits: 1
  });

  const ratioFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  let tableRows = '';
  topItems.forEach((item, index) => {
    const isNegativeEquity = item.debtToEquity < 0 || item.totalEquityB < 0;
    const flagHtml = isNegativeEquity ? `<span class="flag">Negative Equity</span>` : '';

    // Some logic for negative equity text display
    const deRatioDisplay = isNegativeEquity ? `N/A (Neg)` : ratioFormatter.format(item.debtToEquity);

    tableRows += `
      <tr class="${isNegativeEquity ? 'negative-equity' : ''}">
        <td>${index + 1}</td>
        <td>
          <div class="company-name">${item.company}</div>
          <div class="company-ticker">${item.ticker} <span class="sector-tag">${item.sector}</span> ${flagHtml}</div>
        </td>
        <td class="num">${deRatioDisplay}</td>
        <td class="num">${formatter.format(item.totalDebtB * 1e9)}</td>
        <td class="num">${item.totalEquityB ? formatter.format(item.totalEquityB * 1e9) : 'N/A'}</td>
        <td class="num">${item.netDebtB ? formatter.format(item.netDebtB * 1e9) : 'N/A'}</td>
        <td class="num">${item.currentRatio ? ratioFormatter.format(item.currentRatio) : 'N/A'}</td>
      </tr>
    `;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debt-to-Equity Rankings: Most & Least Leveraged S&P 500 Companies (2026)</title>
    <meta name="description" content="Rankings of S&P 500 companies by debt-to-equity ratio. See which companies are heavily leveraged and which hold negative equity.">
    <link rel="canonical" href="https://westmountresearch.com/debt-to-equity">
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

        .flag {
            background-color: rgba(239, 68, 68, 0.1);
            color: var(--negative);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            font-family: var(--font-sans);
            font-weight: 600;
        }

        .num {
            font-family: var(--font-mono);
            font-size: 0.9rem;
            white-space: nowrap;
        }

        .negative-equity td {
            background-color: rgba(239, 68, 68, 0.02);
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
            td, th {
                padding: 12px 16px;
            }
        }
    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Debt-to-Equity Rankings: Most & Least Leveraged S&P 500 Companies",
      "author": {
        "@type": "Organization",
        "name": "Westmount Research"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Westmount Research",
        "logo": {
          "@type": "ImageObject",
          "url": "https://westmountresearch.com/favicon.svg"
        }
      },
      "datePublished": "2026-03-08",
      "dateModified": "2026-03-08"
    }
    </script>
</head>
<body>
    <div class="container">
        <header>
            <div class="breadcrumb">
                <a href="/">Westmount Research</a> &rsaquo; Studies &rsaquo; Debt-to-Equity Rankings
            </div>
            <h1>Debt-to-Equity Rankings: Most Leveraged S&P 500 Companies</h1>
            <p class="subtitle">An analysis of ${numItems} S&P 500 companies ranked by their debt-to-equity ratio. With interest rates elevated, heavily leveraged companies face increased pressure on earnings.</p>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${numItems}</div>
                    <div class="stat-label">Companies Analyzed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${ratioFormatter.format(mostLeveraged.debtToEquity)}</div>
                    <div class="stat-label">Highest D/E Ratio (${mostLeveraged.ticker})</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${negativeEquityItems.length}</div>
                    <div class="stat-label">Companies with Negative Equity</div>
                </div>
            </div>
        </header>

        <main>
            <section class="content-section">
                <h2>Top 150 Most Leveraged Companies</h2>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">Companies are ranked by their Debt-to-Equity ratio. Companies flagged with "Negative Equity" have liabilities exceeding their assets, making the traditional D/E ratio less meaningful.</p>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Company</th>
                                <th>D/E Ratio</th>
                                <th>Total Debt</th>
                                <th>Total Equity</th>
                                <th>Net Debt</th>
                                <th>Current Ratio</th>
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
                    <div class="faq-question">What is a good debt-to-equity ratio?</div>
                    <div class="faq-answer">A "good" debt-to-equity ratio varies heavily by industry. Capital-intensive industries like utilities and manufacturing typically have higher ratios (often 1.0 to 2.0 or more), while technology companies usually have lower ratios. Generally, a ratio below 1.0 is considered relatively safe, meaning a company has more equity than debt.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Which companies have the most debt?</div>
                    <div class="faq-answer">Companies in the telecommunications, utilities, and financial sectors often hold the largest absolute amounts of debt. However, absolute debt must be compared to equity and cash flow to determine true leverage. In our analysis, ${mostLeveraged.company} (${mostLeveraged.ticker}) screen as having the highest standard D/E ratio among positive-equity companies.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Is high debt-to-equity always bad?</div>
                    <div class="faq-answer">No. Debt is often cheaper than equity financing due to tax-deductible interest payments. Companies with highly predictable cash flows (like utilities) can safely handle higher debt loads. However, in a high-interest-rate environment, companies with high leverage and variable-rate debt or upcoming refinancing needs face significant risk.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">What sector has the highest leverage?</div>
                    <div class="faq-answer">Utilities, Real Estate, and Consumer Defensive typically exhibit higher leverage ratios due to their stable cash flows and capital-intensive nature, which allows them to comfortably service higher debt loads.</div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">How does debt-to-equity affect stock price?</div>
                    <div class="faq-answer">High leverage amplifies both gains and losses for shareholders. When business is good, debt boosts return on equity. When business slows, high interest payments can quickly wipe out profits, leading to higher stock price volatility and potential downside risk.</div>
                </div>
            </section>

            <section class="methodology">
                <h3>Methodology & Data</h3>
                <p>Data was collected for ${numItems} S&P 500 components as of 2026. The analysis excludes companies where total debt or market capitalization data was entirely unavailable.</p>
                <ul>
                    <li><strong>Debt-to-Equity (D/E):</strong> Calculated as Total Debt divided by Total Shareholder Equity.</li>
                    <li><strong>Negative Equity:</strong> Companies where accumulated deficits or massive share buybacks have pushed Total Equity below zero. For these firms, traditional D/E ratios are not meaningful, but they are highly levered.</li>
                    <li><strong>Net Debt:</strong> Total Debt minus Cash and Cash Equivalents.</li>
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

  const outPath = path.join(__dirname, '../public/debt-to-equity.html');
  fs.writeFileSync(outPath, html);
  console.log('HTML generated successfully at public/debt-to-equity.html');
}

generateHTML();
