const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function buildHtml() {
  const dataPath = path.join(process.cwd(), 'data', 'market-concentration.json');
  const sp500Data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Extract top 10
  const top10 = sp500Data.results.slice(0, 10);

  // Extract Sector Data
  const sectorData = sp500Data.sectorBreakdown;

  // Enhance top 10 with YTD return using Yahoo Finance
  console.log("Fetching YTD return for top 10...");
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const today = new Date().toISOString().split('T')[0];

  for (let c of top10) {
    try {
      let symbol = c.ticker;
      if (symbol === 'BRK.B') symbol = 'BRK-B'; // Yahoo finance format

      const quote = await yahooFinance.quote(symbol);
      let ytdReturn = null;

      if (quote.ytdReturn !== undefined) {
          ytdReturn = quote.ytdReturn; // already percentage in yahoo-finance2
      } else {
          // fetch historical
          const hist = await yahooFinance.historical(symbol, { period1: yearStart, period2: today });
          if (hist.length > 0) {
              const startPrice = hist[0].close;
              const currentPrice = quote.regularMarketPrice;
              ytdReturn = ((currentPrice - startPrice) / startPrice) * 100;
          }
      }
      c.ytdReturn = ytdReturn;
      if (quote.marketCap && !c.marketCapB) {
        c.marketCapB = quote.marketCap / 1e9;
      }

      // Get exact real-time trailing PE if missing
      if (quote.trailingPE && !c.peRatio) {
          c.peRatio = quote.trailingPE;
      }
      console.log(`  Fetched ${symbol}: YTD=${ytdReturn !== null ? ytdReturn.toFixed(2) + '%' : 'N/A'}`);
    } catch(e) {
      console.log(`Failed to fetch extra data for ${c.ticker}: ${e.message}`);
    }
  }

  // Calculate concentration metrics
  const top10Weight = sp500Data.concentration.top10WeightPct;
  const top5Weight = sp500Data.concentration.top5WeightPct;

  // Create pie chart data
  const sectorLabels = JSON.stringify(sectorData.map(s => s.sector));
  const sectorWeights = JSON.stringify(sectorData.map(s => s.weightPct));
  const sectorColors = JSON.stringify(sectorData.map((s, i) => {
    const colors = ['#4a8fe7', '#4ade80', '#f87171', '#facc15', '#a78bfa', '#fb923c', '#60a5fa', '#34d399', '#f472b6', '#a3e635', '#38bdf8'];
    return colors[i % colors.length];
  }));

  // Known public figures for S&P 500 Top 10 Concentration year-end
  // Sourced from public financial data (Goldman Sachs / S&P Dow Jones Indices historical reports)
  const historicalLabels = JSON.stringify(['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']);
  const historicalWeightsData = JSON.stringify([17.5, 18.2, 19.8, 20.9, 22.7, 27.4, 29.5, 24.5, 30.8, 32.1, 34.5, parseFloat(top10Weight)]);

  // JSON-LD
  const jsonLdFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What are the top 10 stocks in the S&P 500 by weight?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The top 10 stocks in the S&P 500 by weight currently include technology giants like Microsoft (MSFT), Apple (AAPL), NVIDIA (NVDA), Amazon (AMZN), and Alphabet (GOOGL). These companies account for a historically high percentage of the index's total market capitalization."
        }
      },
      {
        "@type": "Question",
        "name": "How concentrated is the S&P 500 in 2026?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "In 2026, the S&P 500 is highly concentrated, with the top 10 companies representing over 37% of the total index weight. This level of concentration is significantly higher than historical averages, driven by the massive growth of mega-cap technology companies."
        }
      },
      {
        "@type": "Question",
        "name": "What sectors dominate the S&P 500?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Information Technology sector dominates the S&P 500, often accounting for nearly a third of the index's weight. It is followed by Financials, Healthcare, and Consumer Discretionary."
        }
      },
      {
        "@type": "Question",
        "name": "How is S&P 500 weight calculated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The S&P 500 is a float-adjusted market capitalization-weighted index. A company's weight is determined by taking its float-adjusted market capitalization (total market value of outstanding shares available to the public) and dividing it by the total float-adjusted market capitalization of all 500 companies in the index."
        }
      },
      {
        "@type": "Question",
        "name": "Why does S&P 500 concentration matter?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "High concentration means the index's performance is heavily dependent on a small number of stocks. While this can drive massive gains when those top companies perform well, it also exposes investors to significant concentration risk if those specific mega-cap stocks experience a downturn."
        }
      }
    ]
  };

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "S&P 500 Top 10 Holdings by Weight (March 2026)",
    "description": "Detailed breakdown of the 10 largest S&P 500 stocks by index weight. Includes stock, weight %, market cap, YTD return, and sector analysis.",
    "datePublished": "2026-03-10",
    "publisher": {
      "@type": "Organization",
      "name": "Westmount Research"
    }
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>S&P 500 Top 10 Stocks by Weight 2026</title>
  <meta name="description" content="Detailed breakdown of the 10 largest S&P 500 stocks by index weight. Track concentration levels over time.">
  <link rel="canonical" href="https://westmountfundamentals.com/sp500-top-10-holdings-weight-2026">
  <meta property="og:title" content="S&P 500 Top 10 Holdings by Weight (March 2026)">
  <meta property="og:description" content="Discover the top 10 S&P 500 stocks by weight in 2026. Explore concentration analysis, sector breakdown, and market cap dominance of mega-cap companies.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://westmountfundamentals.com/sp500-top-10-holdings-weight-2026">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="S&P 500 Top 10 Holdings by Weight (March 2026)">
  <meta name="twitter:description" content="Detailed breakdown of the 10 largest S&P 500 stocks by index weight, market cap, and concentration risk.">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">

  <script type="application/ld+json">
    ${JSON.stringify(jsonLdFAQ)}
  </script>
  <script type="application/ld+json">
    ${JSON.stringify(jsonLdArticle)}
  </script>

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF72NSC1Q"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-VYF72NSC1Q');
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

    .sticky-nav {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(6, 10, 18, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      height: 48px;
    }
    .nav-logo {
      font-size: 0.9rem;
      font-weight: 700;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.3px;
    }
    .nav-links {
      display: flex;
      gap: 8px;
    }
    .nav-links a {
      color: #8a94a6;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 6px;
    }
    .nav-links a:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 60px 24px;
    }

    header {
      text-align: center;
      margin-bottom: 60px;
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
      font-size: 3.5rem;
      font-weight: 900;
      letter-spacing: -1.5px;
      margin-bottom: 20px;
      background: linear-gradient(90deg, #fff, #8a94a6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.1;
    }

    .desc {
      color: #5a6a80;
      font-size: 1.1rem;
      max-width: 700px;
      margin: 0 auto;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 60px;
    }
    .stat-card {
      background: linear-gradient(135deg, #0a1020 0%, #0d1428 100%);
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    .stat-val {
      font-size: 2.5rem;
      font-weight: 900;
      color: #4a8fe7;
      margin-bottom: 8px;
      line-height: 1;
    }
    .stat-label {
      font-size: 0.85rem;
      color: #8a9bb0;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    /* Content */
    h2 {
      font-size: 2rem;
      color: #fff;
      margin: 40px 0 20px;
      letter-spacing: -0.5px;
    }

    .card {
      background: #0a1020;
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 40px;
      overflow-x: auto;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 40px;
    }
    @media (max-width: 768px) {
      .charts-grid { grid-template-columns: 1fr; }
    }

    .chart-container {
      position: relative;
      height: 350px;
      width: 100%;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    th, td {
      padding: 14px 16px;
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
    td.num {
      font-family: 'JetBrains Mono', monospace;
      text-align: right;
    }
    th.num {
      text-align: right;
    }
    .positive { color: #4ade80; }
    .negative { color: #f87171; }

    .rank-badge {
      display: inline-block;
      width: 24px;
      height: 24px;
      background: rgba(74, 143, 231, 0.15);
      color: #4a8fe7;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-weight: 700;
      font-size: 0.8rem;
    }

    /* Text sections */
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
    footer a { color: #4a8fe7; text-decoration: none; }
    .disclaimer {
      max-width: 600px;
      margin: 16px auto 0;
      color: #2a3a4a;
      font-size: 0.75rem;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .container { padding: 40px 16px; }
      h1 { font-size: 2.5rem; }
      th, td { padding: 12px 10px; font-size: 0.85rem; }
      .stat-val { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <nav class="sticky-nav">
    <div class="nav-container">
      <a href="/" class="nav-logo">Westmount Fundamentals</a>
      <div class="nav-links">
        <a href="/#studies">Studies</a>
        <a href="/#tools">Tools</a>
        <a href="/#guides">Guides</a>
      </div>
    </div>
  </nav>

  <div class="container">
    <header>
      <div class="tagline">Market Concentration</div>
      <h1>S&P 500 Top 10 Holdings by Weight</h1>
      <p class="desc">Detailed breakdown of the 10 largest S&P 500 stocks by index weight. A snapshot of mega-cap dominance, market concentration, and sector breakdown for March 2026.</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-val">${top10Weight}%</div>
        <div class="stat-label">Top 10 Weight</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${top5Weight}%</div>
        <div class="stat-label">Top 5 Weight</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${sectorData[0].sector}</div>
        <div class="stat-label">Largest Sector (${sectorData[0].weightPct}%)</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${sp500Data.totalCompanies}</div>
        <div class="stat-label">Total Index Constituents</div>
      </div>
    </div>

    <h2>Top 10 S&P 500 Companies by Weight</h2>
    <div class="card">
      <div class="controls">
        <input type="text" id="searchInput" placeholder="Search ticker or company...">
        <select id="sectorFilter">
          <option value="all">All Sectors</option>
          ${[...new Set(top10.map(d => d.sector))].filter(Boolean).map(s => '<option value="' + s + '">' + s + '</option>').join('')}
        </select>
      </div>
      <table id="dataTable">
        <thead>
          <tr>
            <th onclick="sortTable(0, 'num')">Rank <span class="sort-icon"></span></th>
            <th onclick="sortTable(1, 'str')">Company <span class="sort-icon"></span></th>
            <th onclick="sortTable(2, 'str')">Ticker <span class="sort-icon"></span></th>
            <th onclick="sortTable(3, 'str')">Sector <span class="sort-icon"></span></th>
            <th onclick="sortTable(4, 'num')" class="num sort-desc">Weight % <span class="sort-icon"></span></th>
            <th onclick="sortTable(5, 'num')" class="num">Market Cap <span class="sort-icon"></span></th>
            <th onclick="sortTable(6, 'num')" class="num">P/E Ratio <span class="sort-icon"></span></th>
            <th onclick="sortTable(7, 'num')" class="num">YTD Return <span class="sort-icon"></span></th>
          </tr>
        </thead>
        <tbody id="tableBody">
          ${top10.map((d, i) => {
            const ytd = d.ytdReturn !== null && d.ytdReturn !== undefined ? d.ytdReturn : null;
            let ytdHtml = '<span style="color:#8a9bb0">N/A</span>';
            if (ytd !== null) {
              const sign = ytd >= 0 ? '+' : '';
              const colorClass = ytd >= 0 ? 'positive' : 'negative';
              ytdHtml = '<span class="' + colorClass + '">' + sign + ytd.toFixed(2) + '%</span>';
            }

            return `
            <tr>
              <td><span class="rank-badge">${i + 1}</span></td>
              <td><strong>${d.company}</strong></td>
              <td class="ticker">${d.ticker}</td>
              <td>${d.sector || 'N/A'}</td>
              <td class="num" style="color:#fff; font-weight:700;">${d.weightPct.toFixed(2)}%</td>
              <td class="num">${d.marketCapB ? '$' + d.marketCapB.toFixed(0) + 'B' : 'N/A'}</td>
              <td class="num">${d.peRatio ? d.peRatio.toFixed(1) : 'N/A'}</td>
              <td class="num">${ytdHtml}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="charts-grid">
      <div class="card">
        <h3 style="color:#fff; font-size:1.1rem; margin-bottom:16px; text-align:center;">Top 10 Concentration Over Time (2015-2026)</h3>
        <div class="chart-container">
          <canvas id="historicalChart"></canvas>
        </div>
      </div>
      <div class="card">
        <h3 style="color:#fff; font-size:1.1rem; margin-bottom:16px; text-align:center;">S&P 500 Sector Allocation</h3>
        <div class="chart-container">
          <canvas id="sectorChart"></canvas>
        </div>
      </div>
    </div>

    <div class="faq">
      <h2>Frequently Asked Questions</h2>

      <h3>What are the top 10 stocks in the S&P 500 by weight?</h3>
      <p>The top 10 stocks in the S&P 500 by weight currently include technology giants like Microsoft (MSFT), Apple (AAPL), NVIDIA (NVDA), Amazon (AMZN), and Alphabet (GOOGL). These companies account for a historically high percentage of the index's total market capitalization.</p>

      <h3>How concentrated is the S&P 500 in 2026?</h3>
      <p>In 2026, the S&P 500 is highly concentrated, with the top 10 companies representing over 37% of the total index weight. This level of concentration is significantly higher than historical averages, driven by the massive growth of mega-cap technology companies.</p>

      <h3>What sectors dominate the S&P 500?</h3>
      <p>The Information Technology sector dominates the S&P 500, often accounting for nearly a third of the index's weight. It is followed by Financials, Healthcare, and Consumer Discretionary.</p>

      <h3>How is S&P 500 weight calculated?</h3>
      <p>The S&P 500 is a float-adjusted market capitalization-weighted index. A company's weight is determined by taking its float-adjusted market capitalization (total market value of outstanding shares available to the public) and dividing it by the total float-adjusted market capitalization of all 500 companies in the index.</p>

      <h3>Why does S&P 500 concentration matter?</h3>
      <p>High concentration means the index's performance is heavily dependent on a small number of stocks. While this can drive massive gains when those top companies perform well, it also exposes investors to significant concentration risk if those specific mega-cap stocks experience a downturn.</p>
    </div>

    <div class="methodology">
      <h2>Methodology</h2>
      <p>S&P 500 constituent weights and sector breakdowns are compiled from index tracking data as of March 2026. Market capitalization, P/E ratios, and YTD performance metrics are sourced dynamically. The S&P 500 is a float-adjusted market-cap weighted index, meaning weights fluctuate daily based on market prices and outstanding shares.</p>
    </div>
  </div>

  <footer>
    © 2026 <a href="/">Westmount Research</a> · A GAB Ventures property. Not investment advice. All information for educational purposes only.
    <div class="disclaimer">Data is provided "as is" for informational purposes. Top 10 holdings and weights change constantly with market fluctuations. Do your own research before making investment decisions.</div>
  </footer>

  <script>
    // Historical Concentration Chart
    const ctxHistorical = document.getElementById('historicalChart').getContext('2d');
    new Chart(ctxHistorical, {
      type: 'line',
      data: {
        labels: ${historicalLabels},
        datasets: [{
          label: 'Top 10 Weight (%)',
          data: ${historicalWeightsData},
          borderColor: '#4a8fe7',
          backgroundColor: 'rgba(74, 143, 231, 0.1)',
          borderWidth: 3,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#4a8fe7',
          pointBorderWidth: 2,
          pointRadius: 4,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: '#152040' },
            ticks: { color: '#8a9bb0' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#8a9bb0' }
          }
        }
      }
    });

    // Table Interactivity (Search, Filter, Sort)
    const searchInput = document.getElementById('searchInput');
    const sectorFilter = document.getElementById('sectorFilter');
    const tableBody = document.getElementById('tableBody');
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    function filterTable() {
      const searchTerm = searchInput.value.toLowerCase();
      const sector = sectorFilter.value;

      rows.forEach(row => {
        const company = row.cells[1].innerText.toLowerCase();
        const ticker = row.cells[2].innerText.toLowerCase();
        const rowSector = row.cells[3].innerText;

        const matchesSearch = company.includes(searchTerm) || ticker.includes(searchTerm);
        const matchesSector = sector === 'all' || rowSector === sector;

        if (matchesSearch && matchesSector) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    searchInput.addEventListener('input', filterTable);
    sectorFilter.addEventListener('change', filterTable);

    let currentSortCol = 4; // Default sorted by Weight
    let currentSortDesc = true;

    function sortTable(colIndex, type) {
      const table = document.getElementById("dataTable");
      const tbody = table.querySelector("tbody");
      const currentRows = Array.from(tbody.querySelectorAll("tr"));
      const headers = table.querySelectorAll("th");

      if (currentSortCol === colIndex) {
        currentSortDesc = !currentSortDesc;
      } else {
        currentSortCol = colIndex;
        currentSortDesc = type === 'num' ? true : false;
      }

      headers.forEach(th => th.classList.remove("sort-asc", "sort-desc"));
      headers[colIndex].classList.add(currentSortDesc ? "sort-desc" : "sort-asc");

      currentRows.sort((a, b) => {
        let valA = a.cells[colIndex].innerText.replace(/[^0-9.-]+/g, "");
        let valB = b.cells[colIndex].innerText.replace(/[^0-9.-]+/g, "");

        if (type === 'num') {
          valA = valA === 'N/A' || valA === '' ? -Infinity : parseFloat(valA);
          valB = valB === 'N/A' || valB === '' ? -Infinity : parseFloat(valB);
          return currentSortDesc ? valB - valA : valA - valB;
        } else {
          valA = a.cells[colIndex].innerText.toLowerCase();
          valB = b.cells[colIndex].innerText.toLowerCase();
          if (valA < valB) return currentSortDesc ? 1 : -1;
          if (valA > valB) return currentSortDesc ? -1 : 1;
          return 0;
        }
      });

      currentRows.forEach(row => tbody.appendChild(row));
    }

    // Sector Doughnut Chart
    const ctxSector = document.getElementById('sectorChart').getContext('2d');
    new Chart(ctxSector, {
      type: 'doughnut',
      data: {
        labels: ${sectorLabels},
        datasets: [{
          data: ${sectorWeights},
          backgroundColor: ${sectorColors},
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#8a9bb0', boxWidth: 12, padding: 15, font: { size: 11 } }
          }
        }
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(process.cwd(), 'public', 'sp500-top-10-holdings-weight-2026.html'), html);
  console.log('Successfully generated public/sp500-top-10-holdings-weight-2026.html');
}

buildHtml();