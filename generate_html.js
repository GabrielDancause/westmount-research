const fs = require('fs');
const data = require('./data/dividend-yield-vs-growth.json');

const avgYield = data.reduce((sum, item) => sum + (item.dividendYield || 0), 0) / data.length;
const validGrowth = data.filter(item => item.divGrowth5yr !== null);
const avgGrowth = validGrowth.reduce((sum, item) => sum + item.divGrowth5yr, 0) / validGrowth.length;

const highYieldHighGrowth = data.filter(item => (item.dividendYield || 0) > avgYield && (item.divGrowth5yr || 0) > avgGrowth);

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dividend Yield vs Growth Rate: S&P 500 Analysis 2026 | Westmount Research</title>
  <meta name="description" content="Explore the sweet spot of high dividend yield and high growth rate among S&P 500 companies in 2026. Data-driven analysis of dividend traps vs growers.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #060a12;
      --card: #0a1020;
      --border: #152040;
      --accent: #4a8fe7;
      --text: #c8d0de;
      --text-muted: #5a6a80;
      --green: #22c55e;
      --red: #ef4444;
      --font-sans: 'Inter', -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

    /* Header */
    header { border-bottom: 1px solid var(--border); padding: 20px 0; background: rgba(6, 10, 18, 0.8); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 100; }
    .logo { font-weight: 900; font-size: 1.2rem; color: #fff; letter-spacing: -0.5px; }

    /* Hero */
    .hero { padding: 80px 0 60px; text-align: center; border-bottom: 1px solid var(--border); background: radial-gradient(circle at 50% 0%, rgba(74, 143, 231, 0.05) 0%, transparent 70%); }
    .tag { display: inline-block; background: rgba(74, 143, 231, 0.1); color: var(--accent); font-size: 0.75rem; font-weight: 800; padding: 6px 16px; border-radius: 20px; letter-spacing: 1px; margin-bottom: 20px; text-transform: uppercase; }
    .hero h1 { font-size: 3.5rem; font-weight: 900; color: #fff; letter-spacing: -1.5px; margin-bottom: 24px; line-height: 1.1; }
    .hero p { font-size: 1.2rem; color: var(--text-muted); max-width: 700px; margin: 0 auto; }

    /* Stats */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin: -40px auto 60px; position: relative; z-index: 10; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .stat-value { font-size: 2.5rem; font-weight: 900; color: var(--accent); line-height: 1; margin-bottom: 8px; font-family: var(--font-mono); }
    .stat-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Main Content */
    .content-section { padding: 60px 0; border-bottom: 1px solid var(--border); }
    h2 { font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 24px; letter-spacing: -0.5px; }
    p { margin-bottom: 20px; }

    /* Controls */
    .controls { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; background: var(--card); padding: 16px; border-radius: 8px; border: 1px solid var(--border); }
    .control-group { display: flex; align-items: center; gap: 8px; }
    label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    input, select { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 6px; font-family: var(--font-sans); outline: none; }
    input:focus, select:focus { border-color: var(--accent); }
    button { background: rgba(74, 143, 231, 0.1); border: 1px solid var(--accent); color: var(--accent); padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    button:hover { background: var(--accent); color: #fff; }
    button.active { background: var(--accent); color: #fff; }

    /* Table */
    .table-container { overflow-x: auto; background: var(--card); border: 1px solid var(--border); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 16px; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border); cursor: pointer; white-space: nowrap; user-select: none; }
    th:hover { color: var(--accent); }
    td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 0.95rem; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }

    .ticker { font-family: var(--font-mono); font-weight: 700; color: #fff; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; }
    .company { font-weight: 500; color: #fff; }
    .sector { font-size: 0.85rem; color: var(--text-muted); }
    .number { font-family: var(--font-mono); }
    .highlight-green { color: var(--green); }
    .highlight-red { color: var(--red); }

    /* FAQ */
    .faq-item { margin-bottom: 24px; background: var(--card); border: 1px solid var(--border); padding: 24px; border-radius: 12px; }
    .faq-q { font-size: 1.2rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
    .faq-a { color: var(--text); }

    /* Footer */
    footer { padding: 40px 0; text-align: center; font-size: 0.85rem; color: var(--text-muted); background: #040810; border-top: 1px solid var(--border); }
    .disclaimer { max-width: 800px; margin: 16px auto 0; font-size: 0.75rem; line-height: 1.5; }

    @media (max-width: 768px) {
      .hero h1 { font-size: 2.5rem; }
      .controls { flex-direction: column; align-items: stretch; }
      .control-group { flex-direction: column; align-items: stretch; }
    }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Dividend Yield vs Growth Rate: S&P 500 Analysis 2026",
    "description": "An analysis of dividend yield versus dividend growth rate for S&P 500 companies in 2026.",
    "author": {
      "@type": "Organization",
      "name": "Westmount Research",
      "url": "https://westmountresearch.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Westmount Research"
    },
    "datePublished": "2026-03-09"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a good dividend yield in 2026?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The average dividend yield in the S&P 500 is roughly ${(avgYield * 100).toFixed(2)}%. Yields above 4% are often considered high, but should be evaluated against payout ratios and historical growth to avoid 'yield traps'."
        }
      },
      {
        "@type": "Question",
        "name": "What is the difference between dividend yield and dividend growth?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Dividend yield measures the current annual payout as a percentage of the stock price. Dividend growth measures how much that payout increases year over year. The sweet spot is finding stocks with an above-average yield and strong, consistent growth."
        }
      },
      {
        "@type": "Question",
        "name": "What is a dividend trap?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A dividend trap is a stock with a high yield but declining business fundamentals. The high yield is often the result of a plunging stock price rather than increasing payouts, and the dividend is at risk of being cut."
        }
      },
      {
        "@type": "Question",
        "name": "Why is the payout ratio important for dividend stocks?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The payout ratio shows the percentage of earnings paid out as dividends. A high payout ratio (often above 75-80%) suggests the company is paying out most of its profits, leaving little room for error or future growth."
        }
      },
      {
        "@type": "Question",
        "name": "Which S&P 500 sector pays the highest dividends?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Historically, Utilities and Real Estate (REITs) offer the highest average dividend yields, while Technology and Consumer Cyclical sectors focus more on capital appreciation and buybacks."
        }
      }
    ]
  }
  </script>
</head>
<body>
  <header>
    <div class="container">
      <a href="/" class="logo">Westmount Research</a>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <span class="tag">Original Research</span>
      <h1>Dividend Yield vs Growth Rate</h1>
      <p>Finding the sweet spot in the S&P 500. We analyzed ${data.length} dividend-paying stocks to separate the compounding growth engines from the yield traps.</p>
    </div>
  </section>

  <div class="container">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.length}</div>
        <div class="stat-label">Dividend Payers</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${(avgYield * 100).toFixed(2)}%</div>
        <div class="stat-label">Average Yield</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${(avgGrowth * 100).toFixed(2)}%</div>
        <div class="stat-label">Avg 5-Yr Growth</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${highYieldHighGrowth.length}</div>
        <div class="stat-label">"Sweet Spot" Stocks</div>
      </div>
    </div>

    <section class="content-section" id="data">
      <h2>Interactive Screener</h2>
      <p>Filter the S&P 500 to find stocks matching your dividend criteria. "Sweet Spot" highlights stocks with above-average yield and above-average growth.</p>

      <div class="controls">
        <div class="control-group">
          <label for="search">Search</label>
          <input type="text" id="search" placeholder="Ticker or Company...">
        </div>
        <div class="control-group">
          <label for="sectorFilter">Sector</label>
          <select id="sectorFilter">
            <option value="all">All Sectors</option>
            ${Array.from(new Set(data.map(d => d.sector).filter(Boolean))).sort().map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
          </select>
        </div>
        <div class="control-group">
          <label>Quick Filters</label>
          <button id="btnSweetSpot">Sweet Spot (High Yield + High Growth)</button>
          <button id="btnYieldTraps">Yield Traps (High Yield + Neg Growth)</button>
          <button id="btnReset" class="active">All Data</button>
        </div>
      </div>

      <div class="table-container">
        <table id="dataTable">
          <thead>
            <tr>
              <th data-sort="ticker">Ticker ↕</th>
              <th data-sort="company">Company ↕</th>
              <th data-sort="sector">Sector ↕</th>
              <th data-sort="dividendYield" class="number">Yield ↕</th>
              <th data-sort="divGrowth5yr" class="number">5Yr Growth ↕</th>
              <th data-sort="payoutRatio" class="number">Payout Ratio ↕</th>
              <th data-sort="consecutiveYears" class="number">Streak ↕</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </section>

    <section class="content-section">
      <h2>Frequently Asked Questions</h2>

      <div class="faq-item">
        <div class="faq-q">What is a good dividend yield in 2026?</div>
        <div class="faq-a">The average dividend yield in the S&P 500 is roughly ${(avgYield * 100).toFixed(2)}%. Yields above 4% are often considered high, but should be evaluated against payout ratios and historical growth to avoid "yield traps".</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">What is the difference between dividend yield and dividend growth?</div>
        <div class="faq-a">Dividend yield measures the current annual payout as a percentage of the stock price. Dividend growth measures how much that payout increases year over year. The sweet spot is finding stocks with an above-average yield and strong, consistent growth.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">What is a dividend trap?</div>
        <div class="faq-a">A dividend trap is a stock with a high yield but declining business fundamentals. The high yield is often the result of a plunging stock price rather than increasing payouts, and the dividend is at risk of being cut. We typically flag stocks with negative 5-year dividend growth as potential traps.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">Why is the payout ratio important for dividend stocks?</div>
        <div class="faq-a">The payout ratio shows the percentage of earnings paid out as dividends. A high payout ratio (often above 75-80%) suggests the company is paying out most of its profits, leaving little room for error or future growth. Exceptionally high or negative payout ratios are major red flags.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">Which S&P 500 sector pays the highest dividends?</div>
        <div class="faq-a">Historically, Utilities and Real Estate (REITs) offer the highest average dividend yields, while Technology and Consumer Cyclical sectors focus more on capital appreciation and buybacks.</div>
      </div>
    </section>

    <section class="content-section">
      <h2>Methodology</h2>
      <p>Data was collected from S&P 500 companies in early 2026. Only companies paying a regular cash dividend are included. The 5-year dividend growth rate is calculated as a Compound Annual Growth Rate (CAGR) over the last 5 full years of payments. Consecutive years of growth represents the number of unbroken years the dividend has been maintained or increased.</p>
      <p>The "Sweet Spot" is defined as companies with both a current yield and a 5-year growth rate above the S&P 500 dividend-payer averages. "Yield Traps" are defined for this study as companies with an above-average yield but a negative 5-year growth rate.</p>
    </section>
  </div>

  <footer>
    <div class="container">
      <p>© 2026 <a href="/">Westmount Research</a> · A <a href="https://gab.ae" target="_blank" rel="noopener">GAB Ventures</a> property</p>
      <p class="disclaimer">Disclaimer: The data and analysis on this page are provided for informational purposes only and do not constitute investment advice. Financial data may be delayed or inaccurate. Always conduct your own due diligence or consult a licensed financial advisor before making investment decisions.</p>
    </div>
  </footer>

  <script>
    // Embedded Data
    const rawData = ${JSON.stringify(data)};
    const avgYield = ${avgYield};
    const avgGrowth = ${avgGrowth};

    let currentData = [...rawData];
    let sortCol = 'dividendYield';
    let sortAsc = false;

    // Elements
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('search');
    const sectorFilter = document.getElementById('sectorFilter');
    const btnSweetSpot = document.getElementById('btnSweetSpot');
    const btnYieldTraps = document.getElementById('btnYieldTraps');
    const btnReset = document.getElementById('btnReset');
    const headers = document.querySelectorAll('th[data-sort]');

    // Formatters
    const formatPct = (val) => {
      if (val === null || val === undefined) return 'N/A';
      return (val * 100).toFixed(2) + '%';
    };

    const formatRatio = (val) => {
      if (val === null || val === undefined) return 'N/A';
      return val.toFixed(2);
    };

    const escapeHtml = (unsafe) => {
        if (!unsafe) return "";
        return unsafe
             .toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    // Render Table
    function renderTable() {
      tableBody.innerHTML = '';

      currentData.forEach(row => {
        const tr = document.createElement('tr');

        // Growth color logic
        let growthClass = '';
        if (row.divGrowth5yr > 0) growthClass = 'highlight-green';
        if (row.divGrowth5yr < 0) growthClass = 'highlight-red';

        tr.innerHTML = \`
          <td><span class="ticker">\${escapeHtml(row.ticker)}</span></td>
          <td>
            <div class="company">\${escapeHtml(row.company)}</div>
          </td>
          <td><span class="sector">\${escapeHtml(row.sector || 'N/A')}</span></td>
          <td class="number"><strong>\${formatPct(row.dividendYield)}</strong></td>
          <td class="number \${growthClass}">\${formatPct(row.divGrowth5yr)}</td>
          <td class="number">\${formatRatio(row.payoutRatio)}</td>
          <td class="number">\${row.consecutiveYears !== null ? row.consecutiveYears : 'N/A'}</td>
        \`;
        tableBody.appendChild(tr);
      });
    }

    // Sort Logic
    function sortData() {
      currentData.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];

        if (valA === null) valA = sortAsc ? Infinity : -Infinity;
        if (valB === null) valB = sortAsc ? Infinity : -Infinity;

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortAsc ? valA - valB : valB - valA;
      });
    }

    // Filter Logic
    function applyFilters() {
      const searchTerm = searchInput.value.toLowerCase();
      const sector = sectorFilter.value;

      currentData = rawData.filter(row => {
        const matchesSearch = row.ticker.toLowerCase().includes(searchTerm) ||
                              (row.company && row.company.toLowerCase().includes(searchTerm));
        const matchesSector = sector === 'all' || row.sector === sector;
        return matchesSearch && matchesSector;
      });

      sortData();
      renderTable();
      updateActiveButton(btnReset);
    }

    // Event Listeners
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (sortCol === col) {
          sortAsc = !sortAsc;
        } else {
          sortCol = col;
          sortAsc = (col === 'ticker' || col === 'company' || col === 'sector'); // default asc for text
        }
        sortData();
        renderTable();
      });
    });

    searchInput.addEventListener('input', applyFilters);
    sectorFilter.addEventListener('change', applyFilters);

    // Quick Filters
    function updateActiveButton(activeBtn) {
      [btnSweetSpot, btnYieldTraps, btnReset].forEach(btn => btn.classList.remove('active'));
      activeBtn.classList.add('active');
    }

    btnSweetSpot.addEventListener('click', () => {
      currentData = rawData.filter(row =>
        (row.dividendYield || 0) > avgYield &&
        (row.divGrowth5yr || 0) > avgGrowth
      );
      sortCol = 'divGrowth5yr';
      sortAsc = false;
      sortData();
      renderTable();
      updateActiveButton(btnSweetSpot);
      searchInput.value = '';
      sectorFilter.value = 'all';
    });

    btnYieldTraps.addEventListener('click', () => {
      currentData = rawData.filter(row =>
        (row.dividendYield || 0) > avgYield &&
        row.divGrowth5yr !== null && row.divGrowth5yr < 0
      );
      sortCol = 'dividendYield';
      sortAsc = false;
      sortData();
      renderTable();
      updateActiveButton(btnYieldTraps);
      searchInput.value = '';
      sectorFilter.value = 'all';
    });

    btnReset.addEventListener('click', () => {
      searchInput.value = '';
      sectorFilter.value = 'all';
      currentData = [...rawData];
      sortCol = 'dividendYield';
      sortAsc = false;
      sortData();
      renderTable();
      updateActiveButton(btnReset);
    });

    // Initial render
    sortData();
    renderTable();
  </script>
</body>
</html>\`;

fs.writeFileSync('./public/dividend-yield-vs-growth.html', html);
console.log('HTML generated successfully!');
