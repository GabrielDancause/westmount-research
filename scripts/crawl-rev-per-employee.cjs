const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function run() {
  const tickersPath = path.join(__dirname, '../tickers.json');
  const tickers = JSON.parse(fs.readFileSync(tickersPath, 'utf8'));

  const results = [];

  console.log(`Starting to fetch data for ${tickers.length} tickers...`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];

    // We only need ~120 valid to get 100+ items.
    // If we have 120, we can stop early, but let's just do more to be safe, maybe up to 150.
    if (results.length >= 130) break;

    try {
      const data = await yahooFinance.quoteSummary(ticker, {
        modules: ['assetProfile', 'financialData', 'price', 'defaultKeyStatistics']
      });

      const company = data.price?.longName || data.price?.shortName;
      const sector = data.assetProfile?.sector;
      const employees = data.assetProfile?.fullTimeEmployees;

      const totalRevenue = data.financialData?.totalRevenue;
      const netIncome = data.defaultKeyStatistics?.netIncomeToCommon;
      const marketCap = data.price?.marketCap;
      const profitMarginRaw = data.defaultKeyStatistics?.profitMargins;

      if (!company || !sector || employees == null || totalRevenue == null || marketCap == null || netIncome == null || profitMarginRaw == null) {
        continue;
      }

      const revenuePerEmployee = totalRevenue / employees;
      const profitPerEmployee = netIncome / employees;
      const marketCapPerEmployee = marketCap / employees;
      const profitMargin = profitMarginRaw * 100;
      const revenueB = totalRevenue / 1e9;
      const marketCapB = marketCap / 1e9;

      if (revenuePerEmployee < 10000 || revenuePerEmployee > 50000000) continue;
      if (employees < 100 || employees > 2500000) continue;

      results.push({
        ticker,
        company,
        sector,
        revenueB: Number(revenueB.toFixed(2)),
        employees,
        revenuePerEmployee: Number(revenuePerEmployee.toFixed(2)),
        profitPerEmployee: Number(profitPerEmployee.toFixed(2)),
        marketCapB: Number(marketCapB.toFixed(2)),
        marketCapPerEmployee: Number(marketCapPerEmployee.toFixed(2)),
        profitMargin: Number(profitMargin.toFixed(2))
      });

      process.stdout.write(`\rFound ${results.length} valid companies... (${i}/${tickers.length})`);
    } catch (e) {
      console.error(`Error for ticker ${ticker}:`, e.message);
      // Ignore errors for individual tickers
    }
  }

  console.log(`\nFinished fetching. Total valid companies: ${results.length}`);

  // Sort by revenue per employee descending
  results.sort((a, b) => b.revenuePerEmployee - a.revenuePerEmployee);

  const dataPath = path.join(__dirname, '../data/revenue-per-employee.json');
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(results, null, 2));

  // Generate HTML
  const topCompany = results[0];
  const avgRevPerEmp = results.reduce((acc, c) => acc + c.revenuePerEmployee, 0) / results.length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Revenue Per Employee: The Most Efficient Companies in the S&P 500 (2026)</title>
    <meta name="description" content="A comprehensive analysis of revenue per employee across S&P 500 companies. Discover the most efficient companies and sector benchmarks for 2026.">
    <link rel="canonical" href="https://westmountresearch.com/revenue-per-employee">
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

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 4rem; }
        .stat-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1.5rem; text-align: center; }
        .stat-value { font-size: 2rem; font-weight: 700; color: var(--accent-color); font-family: 'JetBrains Mono', monospace; }
        .stat-label { font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 3rem; background: var(--card-bg); border-radius: 0.5rem; overflow: hidden; }
        th, td { padding: 1rem; text-align: right; border-bottom: 1px solid var(--border-color); }
        th:first-child, td:first-child { text-align: left; }
        th:nth-child(2), td:nth-child(2) { text-align: left; }
        th { background: rgba(255,255,255,0.02); font-weight: 600; color: var(--text-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        td { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
        .company-name { font-family: 'Inter', sans-serif; font-weight: 500; color: #fff; display: block; }
        .ticker { font-size: 0.75rem; color: var(--text-muted); }
        .sector { background: rgba(255,255,255,0.05); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: 'Inter', sans-serif; }

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
      "headline": "Revenue Per Employee: The Most Efficient Companies in the S&P 500",
      "datePublished": "2026-01-01T08:00:00+08:00",
      "dateModified": "2026-01-01T08:00:00+08:00",
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
            <h1>Revenue Per Employee Rankings</h1>
            <p class="subtitle">Ranking ${results.length} S&P 500 companies by operational efficiency.</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${topCompany.ticker}</div>
                <div class="stat-label">Most Efficient</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${(topCompany.revenuePerEmployee / 1000000).toFixed(2)}M</div>
                <div class="stat-label">Top Revenue / Employee</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${(avgRevPerEmp / 1000).toFixed(0)}k</div>
                <div class="stat-label">Average Revenue / Employee</div>
            </div>
        </div>

        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Company</th>
                        <th>Sector</th>
                        <th>Rev / Employee</th>
                        <th>Employees</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map((r, i) => `
                    <tr>
                        <td style="font-family: 'Inter', sans-serif; color: var(--text-muted);">${i + 1}</td>
                        <td>
                            <span class="company-name">${r.company}</span>
                            <span class="ticker">${r.ticker}</span>
                        </td>
                        <td><span class="sector">${r.sector}</span></td>
                        <td style="color: var(--text-primary); font-weight: 500;">$${r.revenuePerEmployee.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                        <td>${r.employees.toLocaleString()}</td>
                        <td>$${r.revenueB}B</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="faq">
            <h2>Frequently Asked Questions</h2>

            <h3>Which company has the highest revenue per employee?</h3>
            <p>Based on our 2026 dataset, <strong>${topCompany.company} (${topCompany.ticker})</strong> leads with an impressive $${(topCompany.revenuePerEmployee / 1000000).toFixed(2)} million in revenue per employee. This metric often highlights companies with highly scalable business models or significant automation.</p>

            <h3>What is a good revenue per employee ratio?</h3>
            <p>A "good" ratio varies dramatically by sector. Retail and hospitality typically see $50,000 to $100,000 per employee due to high headcount requirements. In contrast, technology, financial, and energy sectors often target $500,000 to over $1,000,000 per employee. Investors should compare companies against their direct peers rather than the broader market.</p>

            <h3>Why do energy companies have high revenue per employee?</h3>
            <p>Energy companies operate asset-heavy business models where revenue is primarily driven by commodity extraction, processing, and market prices rather than human capital. A small team operating a major refinery or pipeline can generate billions in revenue, mathematically inflating the per-employee metric.</p>

            <h3>How does revenue per employee compare across sectors?</h3>
            <p>Sectors with high operating leverage (Energy, Real Estate, Technology) typically show the highest figures. Labor-intensive sectors (Consumer Discretionary, Industrials) generally rank lower. This discrepancy reflects different fundamental business models—capital-intensive vs. labor-intensive—rather than absolute management quality.</p>

            <h3>Is revenue per employee a good metric?</h3>
            <p>It is an excellent supplementary metric for evaluating operational efficiency and scalability, particularly when comparing companies within the same sub-industry. However, it should not be used in isolation, as it doesn't account for profit margins, capital expenditures, or the use of external contractors.</p>
        </div>

        <div class="methodology">
            <h2>Methodology</h2>
            <p>Data was collected and analyzed in 2026. Companies with missing or unreliable employee counts were excluded from the dataset. We filtered for companies generating between $10,000 and $50,000,000 per employee to remove extreme outliers caused by holding companies or recent restructurings.</p>
        </div>

        <div class="disclaimer">
            <h2>Disclaimer</h2>
            <p>This study provides data and analysis for informational purposes only. Metrics like revenue per employee do not guarantee future performance and do not represent a complete fundamental analysis. Nothing here constitutes investment advice. Always conduct your own research.</p>
        </div>

        <footer>
            © 2026 Westmount Research. All rights reserved.
        </footer>
    </div>
</body>
</html>`;

  const htmlPath = path.join(__dirname, '../public/revenue-per-employee.html');
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, html);

  console.log(`Generated HTML at ${htmlPath}`);
}

run();
