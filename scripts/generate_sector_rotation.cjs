const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const SECTORS = [
  { symbol: 'XLK', name: 'Technology', type: 'Growth' },
  { symbol: 'XLV', name: 'Healthcare', type: 'Defensive' },
  { symbol: 'XLF', name: 'Financials', type: 'Cyclical' },
  { symbol: 'XLY', name: 'Consumer Discretionary', type: 'Cyclical' },
  { symbol: 'XLC', name: 'Communication Services', type: 'Growth' },
  { symbol: 'XLI', name: 'Industrials', type: 'Cyclical' },
  { symbol: 'XLP', name: 'Consumer Staples', type: 'Defensive' },
  { symbol: 'XLE', name: 'Energy', type: 'Cyclical' },
  { symbol: 'XLU', name: 'Utilities', type: 'Defensive' },
  { symbol: 'XLRE', name: 'Real Estate', type: 'Cyclical' },
  { symbol: 'XLB', name: 'Materials', type: 'Cyclical' }
];

async function fetchHistoricalData(symbol, period1, period2) {
  try {
    const queryOptions = { period1, period2, interval: '1d' };
    const result = await yahooFinance.historical(symbol, queryOptions);
    return result;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

function calculateReturn(data, daysAgo) {
  if (!data || data.length === 0) return null;
  const currentPrice = data[data.length - 1].close;
  const pastIndex = Math.max(0, data.length - 1 - daysAgo);
  const pastPrice = data[pastIndex].close;
  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

function determinePhase(sectorData) {
  // Simple heuristic based on recent momentum
  const defensiveSum = sectorData.filter(s => s.type === 'Defensive').reduce((sum, s) => sum + (s.return3M || 0), 0);
  const cyclicalSum = sectorData.filter(s => s.type === 'Cyclical').reduce((sum, s) => sum + (s.return3M || 0), 0);
  const growthSum = sectorData.filter(s => s.type === 'Growth').reduce((sum, s) => sum + (s.return3M || 0), 0);

  if (defensiveSum > cyclicalSum && defensiveSum > growthSum) {
    return 'Contraction / Late Cycle';
  } else if (cyclicalSum > defensiveSum && cyclicalSum > growthSum) {
    return 'Early Expansion / Recovery';
  } else {
    return 'Mid Cycle / Peak';
  }
}

async function generateData() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 1); // Get 1 year of data

  const sectorData = [];
  for (const sector of SECTORS) {
    const histData = await fetchHistoricalData(sector.symbol, startDate, endDate);
    sectorData.push({
      ...sector,
      return1M: calculateReturn(histData, 21), // Approx 21 trading days
      return3M: calculateReturn(histData, 63), // Approx 63 trading days
      return6M: calculateReturn(histData, 126), // Approx 126 trading days
      return1Y: calculateReturn(histData, 252), // Approx 252 trading days
      currentPrice: histData.length > 0 ? histData[histData.length - 1].close : null
    });
  }

  const phase = determinePhase(sectorData);

  const initialData = {
    sectors: sectorData,
    phase: phase,
    lastUpdated: new Date().toISOString()
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sector Rotation Analysis & Predictions 2026 | Westmount Fundamentals</title>
  <meta name="description" content="Interactive sector rotation analysis tool. Track economic cycles, leading/lagging sectors, and future market phase predictions based on real ETF performance data.">

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-G86C7NJG3F"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-G86C7NJG3F');
  </script>

  <style>
    :root {
      --bg-color: #060a12;
      --card-bg: #0a1020;
      --border-color: #152040;
      --accent-color: #4a8fe7;
      --text-main: #c8d0de;
      --text-muted: #5a6a80;
      --positive: #2ecc71;
      --negative: #e74c3c;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg-color);
      color: var(--text-main);
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    header {
      text-align: center;
      margin-bottom: 50px;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 15px;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 30px;
      margin-bottom: 50px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 25px;
    }

    .card h2 {
      font-size: 1.5rem;
      color: #fff;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
    }

    .phase-indicator {
      text-align: center;
      padding: 30px 0;
    }

    .phase-title {
      font-size: 1.2rem;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .phase-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--accent-color);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    th {
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .val-positive { color: var(--positive); }
    .val-negative { color: var(--negative); }

    .chart-container {
      position: relative;
      height: 400px;
      width: 100%;
    }

    .methodology, .faq {
      margin-top: 50px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 30px;
    }

    .faq-item {
      margin-bottom: 25px;
    }

    .faq-q {
      font-weight: bold;
      font-size: 1.1rem;
      color: #fff;
      margin-bottom: 10px;
    }

    .faq-a {
      color: var(--text-main);
    }

    .footer {
      text-align: center;
      padding: 40px 20px;
      margin-top: 50px;
      border-top: 1px solid var(--border-color);
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <script src="/nav.js"></script>

  <div class="container">
    <header>
      <h1>Sector Rotation Analysis</h1>
      <p class="subtitle">Track leading and lagging sectors across economic cycles. Identify current market phases and historical momentum to optimize asset allocation.</p>
    </header>

    <div class="dashboard-grid">
      <div class="card">
        <h2>Current Market Phase</h2>
        <div class="phase-indicator">
          <div class="phase-title">Inferred Cycle State</div>
          <div class="phase-value" id="current-phase">Loading...</div>
          <p style="margin-top: 20px; font-size: 0.9rem; color: var(--text-muted);">
            Based on recent 3-month momentum across Defensive, Cyclical, and Growth sectors.
          </p>
        </div>
      </div>

      <div class="card">
        <h2>Sector Performance Clock</h2>
        <div class="chart-container">
          <canvas id="rotationChart"></canvas>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Sector Performance Tracker</h2>
      <div style="overflow-x: auto;">
        <table id="sector-table">
          <thead>
            <tr>
              <th>Sector</th>
              <th>ETF</th>
              <th>Type</th>
              <th>1M Return</th>
              <th>3M Return</th>
              <th>6M Return</th>
              <th>1Y Return</th>
            </tr>
          </thead>
          <tbody>
            <!-- Data injected via JS -->
          </tbody>
        </table>
      </div>
    </div>

    <div class="methodology">
      <h2>Methodology</h2>
      <p>This tool analyzes the performance of the 11 GICS sectors using their corresponding SPDR ETFs. By tracking historical returns (1-month, 3-month, 6-month, 1-year), we can observe money flowing between different areas of the market—a concept known as sector rotation.</p>
      <br>
      <p>The "Current Market Phase" is inferred by comparing the recent 3-month momentum of Defensive (Utilities, Healthcare, Consumer Staples), Cyclical (Financials, Energy, Materials, Industrials, Real Estate, Consumer Discretionary), and Growth (Technology, Communication Services) sectors. Strong performance in defensive sectors often indicates late-cycle or contraction phases, while leadership in cyclicals suggests early expansion.</p>
    </div>

    <div class="faq">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-item">
        <div class="faq-q">What is sector rotation in the stock market?</div>
        <div class="faq-a">Sector rotation is an investment strategy where investors move their capital from one industry sector to another in anticipation of the next stage of the economic cycle. By investing in sectors that typically outperform during specific economic phases, investors aim to beat the broader market.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Which sectors perform best during an economic expansion?</div>
        <div class="faq-a">During the early expansion phase, cyclical sectors like Financials, Real Estate, Consumer Discretionary, and Industrials tend to outperform because they benefit most from falling interest rates and accelerating economic growth.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">What are defensive sectors and when do they lead?</div>
        <div class="faq-a">Defensive sectors include Utilities, Healthcare, and Consumer Staples. These sectors produce essential goods and services that people need regardless of the economy. They typically lead during late-cycle and contraction (recession) phases when investors seek stability and consistent dividends.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">How does inflation impact sector rotation?</div>
        <div class="faq-a">High inflation usually benefits the Energy and Materials sectors, as these companies sell the commodities whose prices are rising. Conversely, sectors heavily reliant on borrowing or consumer discretionary spending often suffer during inflationary periods due to rising interest rates and squeezed consumer budgets.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Why use ETFs for sector rotation analysis?</div>
        <div class="faq-a">Sector ETFs (like the Select Sector SPDRs) provide a pure, diversified representation of an entire industry group. Using ETFs eliminates single-stock risk and provides a clearer picture of macroeconomic trends and institutional money flow.</div>
      </div>
    </div>

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is sector rotation in the stock market?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sector rotation is an investment strategy where investors move their capital from one industry sector to another in anticipation of the next stage of the economic cycle. By investing in sectors that typically outperform during specific economic phases, investors aim to beat the broader market."
          }
        },
        {
          "@type": "Question",
          "name": "Which sectors perform best during an economic expansion?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "During the early expansion phase, cyclical sectors like Financials, Real Estate, Consumer Discretionary, and Industrials tend to outperform because they benefit most from falling interest rates and accelerating economic growth."
          }
        },
        {
          "@type": "Question",
          "name": "What are defensive sectors and when do they lead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Defensive sectors include Utilities, Healthcare, and Consumer Staples. These sectors produce essential goods and services that people need regardless of the economy. They typically lead during late-cycle and contraction (recession) phases when investors seek stability and consistent dividends."
          }
        },
        {
          "@type": "Question",
          "name": "How does inflation impact sector rotation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "High inflation usually benefits the Energy and Materials sectors, as these companies sell the commodities whose prices are rising. Conversely, sectors heavily reliant on borrowing or consumer discretionary spending often suffer during inflationary periods due to rising interest rates and squeezed consumer budgets."
          }
        },
        {
          "@type": "Question",
          "name": "Why use ETFs for sector rotation analysis?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sector ETFs (like the Select Sector SPDRs) provide a pure, diversified representation of an entire industry group. Using ETFs eliminates single-stock risk and provides a clearer picture of macroeconomic trends and institutional money flow."
          }
        }
      ]
    }
    </script>
  </div>

  <div class="footer">
    <p>© 2026 Westmount Research · A GAB Ventures property</p>
    <p style="margin-top: 10px; font-size: 0.8rem;">Data for informational purposes only. Not investment advice.</p>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};

    document.addEventListener('DOMContentLoaded', () => {
      const data = window.__INITIAL_DATA__;

      // Update Phase
      document.getElementById('current-phase').textContent = data.phase;

      // Populate Table
      const tbody = document.querySelector('#sector-table tbody');

      const formatReturn = (val) => {
        if (val === null || val === undefined) return 'N/A';
        const formatted = val.toFixed(2) + '%';
        const className = val >= 0 ? 'val-positive' : 'val-negative';
        const sign = val >= 0 ? '+' : '';
        return \`<span class="\${className}">\${sign}\${formatted}</span>\`;
      };

      // Sort by 3M return
      const sortedSectors = [...data.sectors].sort((a, b) => (b.return3M || 0) - (a.return3M || 0));

      sortedSectors.forEach(sector => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><strong>\${sector.name}</strong></td>
          <td>\${sector.symbol}</td>
          <td><span style="font-size: 0.8rem; padding: 2px 6px; background: #152040; border-radius: 4px;">\${sector.type}</span></td>
          <td>\${formatReturn(sector.return1M)}</td>
          <td>\${formatReturn(sector.return3M)}</td>
          <td>\${formatReturn(sector.return6M)}</td>
          <td>\${formatReturn(sector.return1Y)}</td>
        \`;
        tbody.appendChild(tr);
      });

      // Render Chart
      const ctx = document.getElementById('rotationChart').getContext('2d');

      const labels = sortedSectors.map(s => s.symbol);
      const returns1M = sortedSectors.map(s => s.return1M || 0);
      const returns3M = sortedSectors.map(s => s.return3M || 0);

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: '1M Return (%)',
              data: returns1M,
              backgroundColor: 'rgba(74, 143, 231, 0.5)',
              borderColor: 'rgba(74, 143, 231, 1)',
              borderWidth: 1
            },
            {
              label: '3M Return (%)',
              data: returns3M,
              backgroundColor: 'rgba(46, 204, 113, 0.5)',
              borderColor: 'rgba(46, 204, 113, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#152040' },
              ticks: { color: '#5a6a80' }
            },
            x: {
              grid: { color: '#152040' },
              ticks: { color: '#5a6a80' }
            }
          },
          plugins: {
            legend: {
              labels: { color: '#c8d0de' }
            }
          }
        }
      });
    });
  </script>
</body>
</html>
  `;

  fs.writeFileSync(path.join(__dirname, '../public/sector-rotation-analysis-2026.html'), htmlContent);
  console.log('Successfully generated public/sector-rotation-analysis-2026.html');
}

generateData();
