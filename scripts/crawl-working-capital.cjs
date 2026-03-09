const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function run() {
  const tickersPath = path.join(__dirname, '../tickers.json');
  const tickers = JSON.parse(fs.readFileSync(tickersPath, 'utf8'));

  const results = [];

  console.log(`Starting to fetch data for ${tickers.length} tickers...`);

  // We only need a subset for the ranking, let's say top 100-150 most efficient
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];

    // Stop if we have enough data (maybe 130 good ones)
    if (results.length >= 130) break;

    try {
      // Get basic info first to skip financials etc.
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ['assetProfile', 'price']
      });

      const sector = summary.assetProfile?.sector;
      const company = summary.price?.longName || summary.price?.shortName;

      if (!sector || !company) continue;

      // Skip Financials and Real Estate as CCC doesn't apply well
      if (sector === 'Financial Services' || sector === 'Real Estate') {
         continue;
      }

      // Fetch fundamentals
      // period1 is set to 2 years ago to ensure we get at least 4 quarters
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const period1 = twoYearsAgo.toISOString().split('T')[0];

      const data = await yahooFinance.fundamentalsTimeSeries(ticker, {
        period1: period1,
        module: 'all'
      });

      if (!data || data.length < 4) {
         continue;
      }

      let inventory = 0;
      let ar = 0;
      let ap = 0;
      let rev = 0;
      let cogs = 0;
      let validQuarters = 0;

      // sum up last 4 quarters
      for (let j = data.length - 4; j < data.length; j++) {
        const d = data[j];
        // Ensure we have revenue and cogs for the quarter, or at least they aren't completely missing
        if (d.totalRevenue !== undefined && d.costOfRevenue !== undefined) {
           inventory += d.inventory || 0;
           ar += d.accountsReceivable || 0;
           ap += d.accountsPayable || 0;
           rev += d.totalRevenue || 0;
           cogs += d.costOfRevenue || 0;
           validQuarters++;
        }
      }

      if (validQuarters < 4) continue;
      if (rev === 0 || cogs === 0) continue;

      const avgInv = inventory / 4;
      const avgAr = ar / 4;
      const avgAp = ap / 4;

      const daysInv = (avgInv / cogs) * 365;
      const daysRec = (avgAr / rev) * 365;
      const daysPay = (avgAp / cogs) * 365;
      const ccc = daysInv + daysRec - daysPay;

      // Filter out extreme outliers (e.g. data errors)
      if (ccc < -500 || ccc > 1000) continue;
      if (daysInv < 0 || daysRec < 0 || daysPay < 0) continue;

      results.push({
        ticker,
        company: escapeHTML(company),
        sector: escapeHTML(sector),
        revenue: rev,
        days_inventory: Number(daysInv.toFixed(1)),
        days_receivable: Number(daysRec.toFixed(1)),
        days_payable: Number(daysPay.toFixed(1)),
        cash_conversion_cycle: Number(ccc.toFixed(1))
      });

      process.stdout.write(`\rFound ${results.length} valid companies... (${i}/${tickers.length})`);

    } catch (e) {
      // console.error(`Error for ticker ${ticker}:`, e.message);
    }
  }

  console.log(`\nFinished fetching. Total valid companies: ${results.length}`);

  // Sort by CCC ascending (lowest is most efficient)
  results.sort((a, b) => a.cash_conversion_cycle - b.cash_conversion_cycle);

  const dataPath = path.join(__dirname, '../data/working-capital.json');
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(results, null, 2));

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Working Capital Efficiency Rankings 2026</title>
    <meta name="description" content="Ranking S&P 500 companies by Cash Conversion Cycle (CCC). Discover which companies manage inventory best and collect cash fastest.">
    <link rel="canonical" href="https://westmountfundamentals.com/working-capital.html">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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

        .ccc-val { font-weight: bold; color: var(--accent-color); }
    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Working Capital Efficiency Rankings 2026",
      "datePublished": "2026-01-01T08:00:00+08:00",
      "dateModified": "2026-01-01T08:00:00+08:00",
      "author": [{
          "@type": "Organization",
          "name": "Westmount Research",
          "url": "https://westmountfundamentals.com"
      }]
    }
    </script>
</head>
<body>
    <div class="container">
        <header>
            <span class="tag">ORIGINAL RESEARCH 2026</span>
            <h1>Working Capital Efficiency Rankings</h1>
            <p class="subtitle">Ranking ${results.length} companies by Cash Conversion Cycle (CCC).</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${results[0]?.ticker || 'N/A'}</div>
                <div class="stat-label">Most Efficient</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${results[0]?.cash_conversion_cycle} days</div>
                <div class="stat-label">Best CCC</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${results[results.length-1]?.ticker || 'N/A'}</div>
                <div class="stat-label">Least Efficient</div>
            </div>
        </div>

        <div class="chart-container" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 2rem; margin-bottom: 3rem;">
            <h2 style="margin-bottom: 1rem; text-align: center;">Top 10 Most Efficient Companies</h2>
            <canvas id="cccChart" style="width: 100%; height: 400px;"></canvas>
        </div>

        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Company</th>
                        <th>Sector</th>
                        <th>Revenue</th>
                        <th>Days Inventory</th>
                        <th>Days Receivable</th>
                        <th>Days Payable</th>
                        <th>CCC (Days)</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map((r, i) => {
                        const fmtRev = r.revenue >= 1e9 ? '$' + (r.revenue / 1e9).toFixed(1) + 'B' :
                                       r.revenue >= 1e6 ? '$' + (r.revenue / 1e6).toFixed(1) + 'M' :
                                       r.revenue ? '$' + r.revenue.toLocaleString() : 'N/A';
                        return `
                    <tr>
                            <td style="font-family: 'Inter', sans-serif; color: var(--text-muted);">${i + 1}</td>
                        <td>
                                <span class="company-name">${r.company}</span>
                                <span class="ticker">${r.ticker}</span>
                        </td>
                            <td><span class="sector">${r.sector}</span></td>
                            <td>${fmtRev}</td>
                            <td>${r.days_inventory}</td>
                            <td>${r.days_receivable}</td>
                            <td>${r.days_payable}</td>
                            <td class="ccc-val">${r.cash_conversion_cycle}</td>
                    </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>

        <div class="faq">
            <h2>Frequently Asked Questions</h2>

            <h3>What is the Cash Conversion Cycle (CCC)?</h3>
            <p>The Cash Conversion Cycle (CCC) measures how long it takes a company to convert its investments in inventory and other resources into cash flows from sales. It is calculated as: <strong>Days Inventory Outstanding + Days Sales Outstanding - Days Payable Outstanding</strong>.</p>

            <h3>What does a negative CCC mean?</h3>
            <p>A negative CCC means a company is paid by its customers before it has to pay its suppliers. This is a highly efficient model, essentially using suppliers to finance operations. Companies like Amazon and Apple frequently maintain negative CCCs.</p>

            <h3>Why are Financials and Real Estate excluded?</h3>
            <p>The Cash Conversion Cycle relies on inventory and cost of goods sold (COGS). Financial institutions and real estate firms have entirely different business models where "inventory" and "payables" do not translate to traditional working capital metrics.</p>
        </div>

        <div class="methodology">
            <h2>Methodology</h2>
            <p>Data was collected based on trailing twelve months (TTM) financials using the latest quarterly statements available as of 2026. We calculated average inventory, accounts receivable, and accounts payable across the last four quarters to smooth out seasonal fluctuations. Companies with fewer than four valid quarters or missing revenue/COGS data were excluded.</p>
        </div>

        <div class="disclaimer">
            <h2>Disclaimer</h2>
            <p>This study provides data and analysis for informational purposes only. Metrics like the Cash Conversion Cycle do not guarantee future performance and do not represent a complete fundamental analysis. Nothing here constitutes investment advice. Always conduct your own research.</p>
        </div>

        <footer>
            © 2026 Westmount Research. All rights reserved.
        </footer>
    </div>

    <script>
        const chartData = ${JSON.stringify(results.slice(0, 10).map(r => ({ ticker: r.ticker, ccc: r.cash_conversion_cycle })))};

        const ctx = document.getElementById('cccChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(d => d.ticker),
                datasets: [{
                    label: 'Cash Conversion Cycle (Days)',
                    data: chartData.map(d => d.ccc),
                    backgroundColor: 'rgba(74, 143, 231, 0.5)',
                    borderColor: '#4a8fe7',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#152040' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#f1f5f9' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#f1f5f9' }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

  const htmlPath = path.join(__dirname, '../public/working-capital.html');
  fs.writeFileSync(htmlPath, html);

  console.log(`Generated HTML at ${htmlPath}`);
}

run();
