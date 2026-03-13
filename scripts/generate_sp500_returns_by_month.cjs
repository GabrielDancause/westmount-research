const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');

const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function generatePage() {
  console.log('Fetching historical S&P 500 data...');

  // Fetch historical monthly data from 1950 to current date
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const historical = await yahooFinance.historical('^GSPC', {
    period1: '1950-01-01',
    period2: todayStr,
    interval: '1mo'
  });

  console.log(`Fetched ${historical.length} months of data.`);

  // Process data to calculate monthly returns
  const monthlyData = [];

  for (let i = 1; i < historical.length; i++) {
    const current = historical[i];
    const previous = historical[i - 1];

    // We only want data where both current and previous have adjClose
    if (current.adjClose && previous.adjClose) {
      const returnPct = ((current.adjClose - previous.adjClose) / previous.adjClose) * 100;
      const date = new Date(current.date);

      monthlyData.push({
        year: date.getFullYear(),
        month: date.getMonth(), // 0-11
        monthName: date.toLocaleString('default', { month: 'short' }),
        returnPct: returnPct
      });
    }
  }

  // Calculate average returns by month
  const monthStats = Array(12).fill(0).map((_, i) => ({
    month: i,
    monthName: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }),
    totalReturn: 0,
    count: 0,
    positiveCount: 0,
    averageReturn: 0,
    percentPositive: 0
  }));

  monthlyData.forEach(d => {
    const stat = monthStats[d.month];
    stat.totalReturn += d.returnPct;
    stat.count++;
    if (d.returnPct > 0) {
      stat.positiveCount++;
    }
  });

  monthStats.forEach(stat => {
    if (stat.count > 0) {
      stat.averageReturn = stat.totalReturn / stat.count;
      stat.percentPositive = (stat.positiveCount / stat.count) * 100;
    }
  });

  // Sort by average return to find best and worst
  const sortedStats = [...monthStats].sort((a, b) => b.averageReturn - a.averageReturn);
  const bestMonth = sortedStats[0];
  const worstMonth = sortedStats[sortedStats.length - 1];

  // Best/Worst overall % positive
  const sortedPositives = [...monthStats].sort((a, b) => b.percentPositive - a.percentPositive);
  const mostPositive = sortedPositives[0];

  // Overall average monthly return
  const totalReturnOverall = monthStats.reduce((sum, stat) => sum + stat.averageReturn, 0);
  const avgMonthlyReturn = totalReturnOverall / 12;

  // Calculate year by year returns for a heatmap
  const yearsData = {};
  monthlyData.forEach(d => {
    if (!yearsData[d.year]) {
      yearsData[d.year] = Array(12).fill(null);
    }
    yearsData[d.year][d.month] = d.returnPct;
  });

  const yearRange = Object.keys(yearsData).map(Number);
  const minYear = Math.min(...yearRange);
  const maxYear = Math.max(...yearRange);

  // Transform yearsData into a list for the client
  const heatmapData = [];
  for (let year = minYear; year <= maxYear; year++) {
    if (yearsData[year]) {
      heatmapData.push({
        year: year,
        months: yearsData[year]
      });
    }
  }

  // Prepare embedded data
  const pageData = {
    monthStats,
    heatmapData,
    summary: {
      bestMonth: bestMonth.monthName,
      bestMonthReturn: bestMonth.averageReturn.toFixed(2),
      worstMonth: worstMonth.monthName,
      worstMonthReturn: worstMonth.averageReturn.toFixed(2),
      mostPositiveMonth: mostPositive.monthName,
      mostPositivePct: mostPositive.percentPositive.toFixed(1),
      avgMonthlyReturn: avgMonthlyReturn.toFixed(2),
      dateRange: `1950-${maxYear}`
    }
  };

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>S&P 500 Returns by Month: Seasonal Market Patterns</title>
  <meta name="description" content="Discover the best and worst months for stocks. Analyze historical S&P 500 returns, seasonal patterns, and market seasonality data from 1950 to today.">
  <link rel="canonical" href="https://westmountfundamentals.com/sp500-returns-by-month">

  <!-- Open Graph -->
  <meta property="og:title" content="S&P 500 Returns by Month: Seasonal Market Patterns">
  <meta property="og:description" content="Discover the best and worst months for stocks. Analyze historical S&P 500 returns, seasonal patterns, and market seasonality data from 1950 to today.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://westmountfundamentals.com/sp500-returns-by-month">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="S&P 500 Returns by Month: Seasonal Market Patterns">
  <meta name="twitter:description" content="Discover the best and worst months for stocks. Analyze historical S&P 500 returns, seasonal patterns, and market seasonality data from 1950 to today.">

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF72NSC1Q"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-VYF72NSC1Q');
  </script>

  <!-- JSON-LD FAQ Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the best month for the stock market?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Historically, November and December are among the best months for the stock market, often driven by the 'Santa Claus Rally' and strong Q4 institutional buying. April also shows consistently strong average returns."
        }
      },
      {
        "@type": "Question",
        "name": "What is the worst month for the stock market?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "September is historically the worst month for the S&P 500. This phenomenon is known as the 'September Effect,' where average returns are often negative as institutional investors return from summer vacations and reposition portfolios."
        }
      },
      {
        "@type": "Question",
        "name": "What does 'Sell in May and go away' mean?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It is an investment adage suggesting that the stock market underperforms during the six-month period from May to October compared to the November to April period. Investors are historically advised to sell stocks in May and buy them back in November."
        }
      },
      {
        "@type": "Question",
        "name": "What is the January Effect in stocks?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The January Effect is a seasonal increase in stock prices during the month of January. It is often attributed to tax-loss harvesting in December followed by repurchasing in January, as well as the deployment of year-end bonuses."
        }
      },
      {
        "@type": "Question",
        "name": "How reliable are seasonal stock market patterns?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "While historical data shows clear seasonal trends (like the September Effect), these are averages over many decades. In any given year, macroeconomic factors, interest rates, and earnings heavily outweigh seasonal patterns, meaning seasonality should not be the sole basis for investing decisions."
        }
      }
    ]
  }
  </script>

  <!-- JSON-LD Article Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "S&P 500 Returns by Month: Seasonal Market Patterns",
    "description": "Discover the best and worst months for stocks. Analyze historical S&P 500 returns, seasonal patterns, and market seasonality data from 1950 to today.",
    "datePublished": "${new Date().toISOString()}",
    "publisher": {
      "@type": "Organization",
      "name": "Westmount Research",
      "url": "https://westmountfundamentals.com"
    }
  }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #060a12;
      color: #c8d0de;
      line-height: 1.6;
    }

    /* Navigation */
    nav {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(6, 10, 18, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #152040;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-brand {
      color: #fff;
      font-weight: 800;
      font-size: 1.2rem;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .nav-links {
      display: flex;
      gap: 24px;
    }
    .nav-links a {
      color: #8a9ab0;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      transition: color 0.2s;
    }
    .nav-links a:hover {
      color: #fff;
    }

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    /* Header */
    header {
      text-align: center;
      margin-bottom: 60px;
      padding: 40px 0;
    }
    h1 {
      font-size: 3rem;
      font-weight: 900;
      letter-spacing: -1px;
      margin-bottom: 20px;
      background: linear-gradient(90deg, #fff, #8a9ab0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 1.1rem;
      color: #8a9ab0;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Stats Row */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: #0a1020;
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    .stat-card h3 {
      font-size: 0.85rem;
      color: #8a9ab0;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .stat-value {
      font-size: 2.2rem;
      font-weight: 800;
      color: #4a8fe7;
      font-family: 'JetBrains Mono', monospace;
    }
    .stat-desc {
      font-size: 0.85rem;
      color: #5a6a80;
      margin-top: 8px;
    }

    /* Section Styles */
    section {
      margin-bottom: 60px;
      background: #0a1020;
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 32px;
    }
    section h2 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 24px;
      border-bottom: 1px solid #152040;
      padding-bottom: 16px;
    }

    /* Chart Container */
    .chart-container {
      position: relative;
      height: 400px;
      width: 100%;
      margin-bottom: 30px;
    }

    /* Table Styles */
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
    }
    th, td {
      padding: 12px 16px;
      text-align: right;
      border-bottom: 1px solid #152040;
    }
    th:first-child, td:first-child {
      text-align: left;
    }
    th {
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #8a9ab0;
      background: rgba(21, 32, 64, 0.4);
      position: sticky;
      top: 0;
    }
    tbody tr:hover {
      background: rgba(74, 143, 231, 0.05);
    }
    .positive { color: #4ade80; }
    .negative { color: #f87171; }

    /* Heatmap grid specifically */
    .heatmap-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .heatmap-grid {
      display: grid;
      grid-template-columns: 60px repeat(12, 1fr);
      gap: 2px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      overflow-x: auto;
    }

    .hm-cell {
      padding: 8px 4px;
      text-align: center;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hm-header {
      background: #152040;
      color: #8a9ab0;
      font-weight: bold;
      font-family: 'Inter', sans-serif;
    }

    .hm-year {
      background: #060a12;
      color: #8a9ab0;
      font-weight: bold;
      border-right: 1px solid #152040;
    }

    /* FAQ & Methodology */
    .faq-item {
      margin-bottom: 24px;
    }
    .faq-item h3 {
      font-size: 1.1rem;
      color: #fff;
      margin-bottom: 8px;
    }
    .faq-item p, .methodology-content p {
      color: #8a9ab0;
      font-size: 0.95rem;
      margin-bottom: 16px;
    }

    /* Footer */
    footer {
      text-align: center;
      padding: 40px 24px;
      border-top: 1px solid #152040;
      color: #5a6a80;
      font-size: 0.85rem;
      margin-top: 40px;
    }

    @media (max-width: 768px) {
      h1 { font-size: 2.2rem; }
      .nav-links { display: none; }
      section { padding: 20px; }
      .hm-cell { font-size: 0.6rem; padding: 4px 2px; }
    }
  </style>
</head>
<body>

  <nav>
    <a href="/" class="nav-brand">Westmount Fundamentals</a>
    <div class="nav-links">
      <a href="/#studies">Studies</a>
      <a href="/#tools">Tools</a>
      <a href="/#guides">Guides</a>
    </div>
  </nav>

  <div class="container">
    <header>
      <h1>S&P 500 Returns by Month:<br>Seasonal Market Patterns</h1>
      <p class="subtitle">Historical average returns, best and worst months, and seasonal market data from ${pageData.summary.dateRange}.</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Best Month Average</h3>
        <div class="stat-value" id="val-best-month">${pageData.summary.bestMonthReturn}%</div>
        <div class="stat-desc" id="desc-best-month">${pageData.summary.bestMonth} historical avg</div>
      </div>
      <div class="stat-card">
        <h3>Worst Month Average</h3>
        <div class="stat-value" id="val-worst-month" style="color: #f87171;">${pageData.summary.worstMonthReturn}%</div>
        <div class="stat-desc" id="desc-worst-month">${pageData.summary.worstMonth} historical avg</div>
      </div>
      <div class="stat-card">
        <h3>Most Consistent</h3>
        <div class="stat-value" id="val-consistent">${pageData.summary.mostPositivePct}%</div>
        <div class="stat-desc" id="desc-consistent">${pageData.summary.mostPositiveMonth}s are positive</div>
      </div>
      <div class="stat-card">
        <h3>Average Month</h3>
        <div class="stat-value" id="val-avg">${pageData.summary.avgMonthlyReturn}%</div>
        <div class="stat-desc">Baseline monthly return</div>
      </div>
    </div>

    <section>
      <h2>Average Monthly Returns (${pageData.summary.dateRange})</h2>
      <div class="chart-container">
        <canvas id="monthlyReturnsChart"></canvas>
      </div>

      <div class="table-container">
        <table id="monthlyStatsTable">
          <thead>
            <tr>
              <th>Month</th>
              <th>Average Return</th>
              <th>% Positive</th>
              <th>Data Points</th>
            </tr>
          </thead>
          <tbody>
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Historical Returns Heatmap</h2>
      <p style="color: #8a9ab0; margin-bottom: 20px; font-size: 0.95rem;">Annual month-by-month returns for the S&P 500.</p>
      <div class="table-container">
        <div id="heatmapContainer" class="heatmap-grid">
          <!-- Populated by JS -->
        </div>
      </div>
    </section>

    <section>
      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">
        <div class="faq-item">
          <h3>What is the best month for the stock market?</h3>
          <p>Historically, November and December are among the best months for the stock market, often driven by the "Santa Claus Rally" and strong Q4 institutional buying. April also shows consistently strong average returns.</p>
        </div>
        <div class="faq-item">
          <h3>What is the worst month for the stock market?</h3>
          <p>September is historically the worst month for the S&P 500. This phenomenon is known as the "September Effect," where average returns are often negative as institutional investors return from summer vacations and reposition portfolios.</p>
        </div>
        <div class="faq-item">
          <h3>What does 'Sell in May and go away' mean?</h3>
          <p>It is an investment adage suggesting that the stock market underperforms during the six-month period from May to October compared to the November to April period. Investors are historically advised to sell stocks in May and buy them back in November.</p>
        </div>
        <div class="faq-item">
          <h3>What is the January Effect in stocks?</h3>
          <p>The January Effect is a seasonal increase in stock prices during the month of January. It is often attributed to tax-loss harvesting in December followed by repurchasing in January, as well as the deployment of year-end bonuses.</p>
        </div>
        <div class="faq-item">
          <h3>How reliable are seasonal stock market patterns?</h3>
          <p>While historical data shows clear seasonal trends (like the September Effect), these are averages over many decades. In any given year, macroeconomic factors, interest rates, and earnings heavily outweigh seasonal patterns, meaning seasonality should not be the sole basis for investing decisions.</p>
        </div>
      </div>
    </section>

    <section>
      <h2>Methodology & Data Sources</h2>
      <div class="methodology-content">
        <p>This study analyzes historical S&P 500 (Ticker: ^GSPC) adjusted closing price data from ${pageData.summary.dateRange}. Data is sourced directly via the Yahoo Finance API.</p>
        <p>Monthly returns are calculated as the percentage change in the adjusted close price from the end of the previous month to the end of the current month. The adjusted close accounts for corporate actions like stock splits and dividends (total return).</p>
        <p>Note: Past performance is not indicative of future results. Seasonal patterns represent statistical averages, and individual years may vary significantly from these historical norms.</p>
      </div>
    </section>

  </div>

  <footer>
    <p>&copy; ${new Date().getFullYear()} Westmount Research &middot; A GAB Ventures property. Not investment advice. All information for educational purposes only.</p>
  </footer>

  <script>
    window.__INITIAL_DATA__ = ${JSON.stringify(pageData)};

    document.addEventListener('DOMContentLoaded', () => {
      const data = window.__INITIAL_DATA__;

      // 1. Render Table
      const tbody = document.querySelector('#monthlyStatsTable tbody');
      data.monthStats.forEach(stat => {
        const tr = document.createElement('tr');
        const retClass = stat.averageReturn >= 0 ? 'positive' : 'negative';

        tr.innerHTML = \`
          <td style="font-family: 'Inter', sans-serif; font-weight: 600; color: #fff;">\${stat.monthName}</td>
          <td class="\${retClass}">\${stat.averageReturn > 0 ? '+' : ''}\${stat.averageReturn.toFixed(2)}%</td>
          <td style="color: #fff;">\${stat.percentPositive.toFixed(1)}%</td>
          <td style="color: #8a9ab0;">\${stat.count} yrs</td>
        \`;
        tbody.appendChild(tr);
      });

      // 2. Render Chart
      const ctx = document.getElementById('monthlyReturnsChart').getContext('2d');
      const labels = data.monthStats.map(s => s.monthName);
      const returns = data.monthStats.map(s => s.averageReturn);
      const bgColors = returns.map(val => val >= 0 ? 'rgba(74, 222, 128, 0.7)' : 'rgba(248, 113, 113, 0.7)');
      const borderColors = returns.map(val => val >= 0 ? 'rgba(74, 222, 128, 1)' : 'rgba(248, 113, 113, 1)');

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Average Return (%)',
            data: returns,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.parsed.y > 0 ? '+' + context.parsed.y.toFixed(2) + '%' : context.parsed.y.toFixed(2) + '%';
                }
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(21, 32, 64, 0.5)' },
              ticks: {
                color: '#8a9ab0',
                callback: function(value) { return value + '%'; }
              }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#8a9ab0', font: { family: 'Inter' } }
            }
          }
        }
      });

      // 3. Render Heatmap
      const hmContainer = document.getElementById('heatmapContainer');

      // Headers
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      hmContainer.innerHTML += \`<div class="hm-cell hm-header">Year</div>\`;
      months.forEach(m => {
        hmContainer.innerHTML += \`<div class="hm-cell hm-header">\${m}</div>\`;
      });

      // Colors for heatmap
      function getHeatmapColor(val) {
        if (val === null) return '#0a1020'; // no data
        if (val > 0) {
          // Green gradient based on intensity (max ~ 10%)
          const intensity = Math.min(val / 10, 1);
          return \`rgba(74, 222, 128, \${0.1 + (intensity * 0.9)})\`;
        } else {
          // Red gradient based on intensity (min ~ -10%)
          const intensity = Math.min(Math.abs(val) / 10, 1);
          return \`rgba(248, 113, 113, \${0.1 + (intensity * 0.9)})\`;
        }
      }

      function getTextColor(val) {
        if (val === null) return 'transparent';
        const intensity = Math.min(Math.abs(val) / 10, 1);
        if (intensity > 0.5) return '#000'; // dark text for bright backgrounds
        return '#fff'; // light text for dark backgrounds
      }

      // Reverse order to show newest first
      const reversedHeatmap = [...data.heatmapData].reverse();

      reversedHeatmap.forEach(row => {
        hmContainer.innerHTML += \`<div class="hm-cell hm-year">\${row.year}</div>\`;

        row.months.forEach(val => {
          if (val === null) {
            hmContainer.innerHTML += \`<div class="hm-cell" style="background: #0a1020;">-</div>\`;
          } else {
            const bg = getHeatmapColor(val);
            const color = getTextColor(val);
            hmContainer.innerHTML += \`<div class="hm-cell" style="background: \${bg}; color: \${color};" title="\${val > 0 ? '+' : ''}\${val.toFixed(2)}%">\${val.toFixed(1)}</div>\`;
          }
        });
      });
    });
  </script>
</body>
</html>`;

  const outPath = path.join(__dirname, '../public/sp500-returns-by-month.html');
  fs.writeFileSync(outPath, htmlContent, 'utf8');
  console.log(`Successfully generated HTML at ${outPath}`);
}

generatePage().catch(console.error);
