const fs = require('fs');
const path = require('path');

function buildHtml() {
  const dataPath = path.join(process.cwd(), 'data', 'ipo-data.json');
  const ipoData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Prepare chart data for top 15 that have all required fields
  const chartStocks = ipoData.filter(d =>
    d.first_day_return !== null && d.return_from_ipo !== null && d.ticker && d.ipo_price
  ).slice(0, 15);

  const chartLabels = JSON.stringify(chartStocks.map(d => d.ticker));
  const chartFirstDayData = JSON.stringify(chartStocks.map(d => d.first_day_return));
  const chartCurrentData = JSON.stringify(chartStocks.map(d => d.return_from_ipo));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "IPO Performance Tracker: First-Year Returns 2024-2026",
    "description": "Tracking IPO performance for newly listed stocks in their first year. Displays IPO price, first-day pop, and 1-year return for recent IPOs.",
    "creator": {
      "@type": "Organization",
      "name": "Westmount Research"
    }
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IPO Performance Tracker: First-Year Returns 2024-2026 | Westmount Fundamentals</title>
  <meta name="description" content="Track IPO performance — how do newly listed stocks perform in their first year? Show IPO price, first-day pop, and 1-year return for recent IPOs.">
  <script type="application/ld+json">
    ${JSON.stringify(jsonLd)}
  </script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #060a12;
      color: #c8d0de;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 60px 24px;
    }

    header {
      text-align: center;
      margin-bottom: 60px;
      border-bottom: 1px solid #152040;
      padding-bottom: 40px;
    }

    .tagline {
      color: #4a8fe7;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 3rem;
      font-weight: 900;
      letter-spacing: -1.5px;
      margin-bottom: 20px;
      color: #fff;
    }

    h2 {
      font-size: 2rem;
      color: #fff;
      margin: 40px 0 20px;
    }

    .desc {
      color: #5a6a80;
      font-size: 1.05rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .card {
      background: #0a1020;
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 40px;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #152040;
    }

    th {
      color: #5a6a80;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
    }

    td.ticker {
      font-family: 'JetBrains Mono', monospace;
      color: #4a8fe7;
      font-weight: 700;
    }

    .positive { color: #4ade80; }
    .negative { color: #f87171; }

    .chart-container {
      position: relative;
      height: 400px;
      width: 100%;
    }

    .faq, .methodology {
      background: #0a1020;
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 40px;
    }

    .faq h3, .methodology h3 {
      color: #fff;
      margin-bottom: 12px;
      font-size: 1.2rem;
    }

    .faq p, .methodology p {
      margin-bottom: 24px;
      color: #8a9bb0;
    }

    footer {
      text-align: center;
      padding: 50px 24px;
      font-size: 0.85rem;
      color: #3a4a5a;
      border-top: 1px solid #151f2e;
      background: #040810;
      margin-top: 60px;
    }

    footer a {
      color: #4a8fe7;
      text-decoration: none;
    }

    .disclaimer {
      max-width: 600px;
      margin: 16px auto 0;
      color: #2a3a4a;
      font-size: 0.75rem;
      line-height: 1.5;
    }

    a.back-link {
        color: #4a8fe7;
        text-decoration: none;
        display: inline-block;
        margin-bottom: 20px;
        font-weight: bold;
    }
    a.back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">&larr; Back to Research</a>
    <header>
      <div class="tagline">Original Research</div>
      <h1>IPO Performance Tracker: First-Year Returns 2024-2026</h1>
      <p class="desc">Tracking IPO performance — how do newly listed stocks perform in their first year? Analyzing IPO price, first-day pop, and 1-year return for recent IPOs.</p>
    </header>

    <h2>First-Day Pop vs Current Return</h2>
    <div class="card">
      <div class="chart-container">
        <canvas id="ipoChart"></canvas>
      </div>
    </div>

    <h2>Recent IPO Performance Data</h2>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Ticker</th>
            <th>IPO Date</th>
            <th>IPO Price</th>
            <th>First Day Close</th>
            <th>1st Day Return</th>
            <th>Current Price</th>
            <th>Return from IPO</th>
            <th>Sector</th>
          </tr>
        </thead>
        <tbody>
          ${ipoData.map(d => {
            const formatVal = (v, isCurrency = false, isPercent = false) => {
              if (v === null || v === undefined) return 'N/A';
              let numStr = typeof v === 'number' ? v.toFixed(2) : v;
              if (isCurrency) return '$' + numStr;
              if (isPercent) return numStr + '%';
              return numStr;
            };

            const firstDayClass = d.first_day_return > 0 ? 'positive' : (d.first_day_return < 0 ? 'negative' : '');
            const returnClass = d.return_from_ipo > 0 ? 'positive' : (d.return_from_ipo < 0 ? 'negative' : '');

            return `
            <tr>
              <td>${d.company || 'N/A'}</td>
              <td class="ticker">${d.ticker || 'N/A'}</td>
              <td>${d.ipo_date || 'N/A'}</td>
              <td>${formatVal(d.ipo_price, true)}</td>
              <td>${formatVal(d.first_day_close, true)}</td>
              <td class="${firstDayClass}">${formatVal(d.first_day_return, false, true)}</td>
              <td>${formatVal(d.current_price, true)}</td>
              <td class="${returnClass}">${formatVal(d.return_from_ipo, false, true)}</td>
              <td>${d.sector || 'N/A'}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="faq">
      <h2>Frequently Asked Questions</h2>
      <h3>What is an IPO 'pop'?</h3>
      <p>An IPO "pop" refers to the increase in a company's stock price on its first day of trading compared to its initial public offering (IPO) price. This happens when there is high demand for the stock in the open market.</p>

      <h3>Why do many IPOs drop below their initial price?</h3>
      <p>Initial excitement and limited float can artificially drive up the price on day one. Over the first year, lock-up periods expire (allowing insiders to sell) and the company must prove its valuation through earnings reports, which often brings the price back to fundamental realities.</p>

      <h3>How is the return calculated?</h3>
      <p>The return from IPO is calculated based on the original IPO pricing, not the first-day opening or closing price on the secondary market. This represents the return for institutional investors who were allocated shares at the offering price.</p>
    </div>

    <div class="methodology">
      <h2>Methodology</h2>
      <p>This study tracks recent Initial Public Offerings (IPOs) on major US exchanges. Data is sourced from public financial records and market data providers. The "First Day Return" represents the percentage difference between the IPO pricing and the closing price on the first day of trading. The "Return from IPO" is calculated using the most recent available closing price against the original IPO price. Calculations do not account for dividends, stock splits, or inflation. Missing data indicates that the security has not yet begun regular trading or pricing data was unavailable at the time of aggregation.</p>
    </div>
  </div>

  <footer>
    © ${new Date().getFullYear()} <a href="/">westmount-research</a> · A <a href="https://gab.ae">GAB Ventures</a> property
    <div class="disclaimer">This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research. Past performance of newly listed securities is not indicative of future results.</div>
  </footer>

  <script>
    const ctx = document.getElementById('ipoChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ${chartLabels},
        datasets: [
          {
            label: 'First Day Return (%)',
            data: ${chartFirstDayData},
            backgroundColor: 'rgba(74, 143, 231, 0.7)',
            borderColor: '#4a8fe7',
            borderWidth: 1
          },
          {
            label: 'Current Return (%)',
            data: ${chartCurrentData},
            backgroundColor: 'rgba(74, 222, 128, 0.7)',
            borderColor: '#4ade80',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            grid: { color: '#152040' },
            ticks: { color: '#8a9bb0' }
          },
          x: {
            grid: { color: '#152040' },
            ticks: { color: '#8a9bb0' }
          }
        },
        plugins: {
          legend: { labels: { color: '#c8d0de' } }
        }
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(process.cwd(), 'public', 'ipo-performance.html'), html);
  console.log('Successfully generated public/ipo-performance.html');
}

buildHtml();
