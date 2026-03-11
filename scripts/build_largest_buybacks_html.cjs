const fs = require('fs');
const path = require('path');

function buildHtml() {
  const dataPath = path.join(process.cwd(), 'data', 'buyback-leaders.json');
  const buybackData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Get top 50 by buybackAmountB
  const top50 = buybackData.results.slice(0, 50);

  // Sector breakdown chart
  const sectorData = buybackData.sectorSummary;
  const sectorLabels = JSON.stringify(sectorData.map(s => s.sector));
  const sectorValues = JSON.stringify(sectorData.map(s => s.totalBuybacksB));
  const sectorColors = JSON.stringify(sectorData.map((s, i) => {
    const colors = ['rgba(74, 143, 231, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(248, 113, 113, 0.7)', 'rgba(250, 204, 21, 0.7)', 'rgba(167, 139, 250, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(96, 165, 250, 0.7)', 'rgba(52, 211, 153, 0.7)'];
    return colors[i % colors.length];
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Which companies have the largest share buybacks?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The companies with the largest share buybacks are typically mega-cap technology and financial firms. Apple (AAPL) frequently leads, often repurchasing tens of billions of dollars annually, followed by companies like Alphabet (GOOGL), Meta (META), and Microsoft (MSFT)."
        }
      },
      {
        "@type": "Question",
        "name": "What are the biggest stock buybacks in 2026?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The biggest stock buybacks in 2026 are dominated by the Information Technology sector, with Apple alone accounting for nearly $100 billion in trailing 12-month repurchases. Financials and Energy companies also have significant buyback programs."
        }
      },
      {
        "@type": "Question",
        "name": "Are stock buybacks good or bad for shareholders?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Stock buybacks can be good or bad depending on the price paid. When a company buys back undervalued stock, it creates value for remaining shareholders by increasing their ownership percentage and boosting earnings per share (EPS). However, if management buys back overvalued stock, it destroys shareholder value."
        }
      },
      {
        "@type": "Question",
        "name": "Where can I find a list of companies buying back stock?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can find a list of companies buying back stock on our comprehensive buyback tracker, which ranks the top 50 companies by total buyback amount, buyback yield, and share count reduction."
        }
      },
      {
        "@type": "Question",
        "name": "How does buyback yield compare to dividend yield?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Buyback yield is the total amount spent on share repurchases divided by market cap, whereas dividend yield is total dividends paid divided by market cap. Both return capital to shareholders, but buybacks are often more tax-efficient and flexible, while dividends provide predictable income. Many top companies offer a combination of both."
        }
      }
    ]
  };

  const currentYear = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Largest Stock Buybacks 2026: Which Companies Are Buying Back the Most Stock? | Westmount Fundamentals</title>
  <meta name="description" content="Discover the biggest stock buybacks of 2026. Explore our comprehensive list of companies buying back stock, track buyback yields, and see which sectors spend the most.">
  <link rel="canonical" href="https://westmountfundamentals.com/largest-stock-buybacks-2026.html">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <script type="application/ld+json">
    ${JSON.stringify(jsonLd)}
  </script>
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

    h3 {
      font-size: 1.5rem;
      color: #e0e8f0;
      margin: 30px 0 15px;
    }

    .desc {
      color: #5a6a80;
      font-size: 1.05rem;
      max-width: 700px;
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

    .text-content p {
      margin-bottom: 1.2rem;
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
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      color: #4a8fe7;
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

    .chart-container {
      position: relative;
      height: 400px;
      width: 100%;
    }

    .faq, .methodology, .content-section {
      background: #0a1020;
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 40px;
    }

    .faq h3, .methodology h3, .content-section h3 {
      color: #fff;
      margin-bottom: 12px;
      font-size: 1.2rem;
    }

    .faq p, .methodology p, .content-section p {
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

    .sort-icon::after {
      content: '↕';
      margin-left: 5px;
      opacity: 0.5;
    }
    .sort-asc::after { content: '↑'; opacity: 1; }
    .sort-desc::after { content: '↓'; opacity: 1; }

    @media (max-width: 768px) {
      .container { padding: 40px 16px; }
      h1 { font-size: 2.2rem; }
      .chart-container { height: 300px; }
      th, td { padding: 10px 8px; font-size: 0.8rem; }
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
      <div class="tagline">Original Research</div>
      <h1>Largest Stock Buybacks 2026</h1>
      <p class="desc">Which companies are buying back the most stock? A comprehensive tracker of the largest share repurchases, buyback yields, and the ongoing debate over their value to shareholders.</p>
    </header>

    <div class="content-section text-content">
      <h2>The Debate: Are Buybacks Good or Bad for Shareholders?</h2>
      <p>Stock buybacks remain one of the most debated topics in finance. In theory, a share repurchase is a tax-efficient way to return capital to shareholders. By reducing the number of outstanding shares, each remaining share represents a larger ownership stake in the company, inherently boosting Earnings Per Share (EPS).</p>

      <h3>The Case For Buybacks</h3>
      <p>Supporters argue that buybacks are a sign of financial health and disciplined capital allocation. When management believes their stock is undervalued, repurchasing shares is an excellent investment. It's often more tax-efficient than paying dividends, as shareholders only pay capital gains tax when they choose to sell, rather than being forced to pay taxes on dividend income every year. Furthermore, buybacks provide companies with flexibility—they can be ramped up during good times and paused during downturns without the negative market reaction that typically accompanies a dividend cut.</p>

      <h3>The Case Against Buybacks</h3>
      <p>Critics, however, point out that executives are notoriously bad at market timing, frequently buying back stock at peak valuations, which destroys shareholder value. Moreover, some argue that heavy buyback activity signals a lack of internal investment opportunities—suggesting the company can't find better ways to spend its cash on R&D, expansion, or employee compensation. Finally, because executive compensation is often tied to EPS targets, there's a structural incentive for management to aggressively buy back stock to boost EPS, even if it leaves the company financially fragile in a downturn.</p>

      <h3>Net Buybacks: The Complete Picture</h3>
      <p>It's crucial to look at <em>net</em> buybacks. Some companies announce massive buyback programs, but simultaneously issue huge amounts of stock-based compensation to employees. If a company buys back $5 billion in stock but issues $4 billion in new shares to executives, the net reduction in share count is minimal. The companies truly creating value are those executing significant <strong>net</strong> buybacks that meaningfully reduce their shares outstanding.</p>
    </div>

    <h2>Buyback Spending by Sector ($ Billions)</h2>
    <div class="card">
      <div class="chart-container">
        <canvas id="sectorChart"></canvas>
      </div>
    </div>

    <h2>Top 50 Companies by Total Buyback Amount</h2>
    <div class="card">
      <table id="buybackTable">
        <thead>
          <tr>
            <th onclick="sortTable(0, 'str')">Company <span class="sort-icon"></span></th>
            <th onclick="sortTable(1, 'str')">Ticker <span class="sort-icon"></span></th>
            <th onclick="sortTable(2, 'num')" class="num sort-desc">Buybacks ($B) <span class="sort-icon"></span></th>
            <th onclick="sortTable(3, 'num')" class="num">Buyback Yield <span class="sort-icon"></span></th>
            <th onclick="sortTable(4, 'num')" class="num">Div Yield <span class="sort-icon"></span></th>
            <th onclick="sortTable(5, 'num')" class="num">Share Reduction <span class="sort-icon"></span></th>
            <th onclick="sortTable(6, 'num')" class="num">Market Cap ($B) <span class="sort-icon"></span></th>
            <th onclick="sortTable(7, 'str')">Sector <span class="sort-icon"></span></th>
          </tr>
        </thead>
        <tbody>
          ${top50.map(d => {
            const formatNum = (v, prec = 2) => v === null || v === undefined ? 'N/A' : v.toFixed(prec);
            return `
            <tr>
              <td>${d.company}</td>
              <td class="ticker">${d.ticker}</td>
              <td class="num">$${formatNum(d.buybackAmountB, 1)}B</td>
              <td class="num">${formatNum(d.buybackYield)}%</td>
              <td class="num">${formatNum(d.dividendYield)}%</td>
              <td class="num">${formatNum(d.sharesReductionPct)}%</td>
              <td class="num">$${formatNum(d.marketCapB, 0)}B</td>
              <td>${d.sector}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="faq">
      <h2>Frequently Asked Questions</h2>

      <h3>Which companies have the largest share buybacks?</h3>
      <p>The companies with the largest share buybacks are typically mega-cap technology and financial firms. Apple (AAPL) frequently leads, often repurchasing tens of billions of dollars annually, followed by companies like Alphabet (GOOGL), Meta (META), and Microsoft (MSFT).</p>

      <h3>What are the biggest stock buybacks in 2026?</h3>
      <p>The biggest stock buybacks in 2026 are dominated by the Information Technology sector, with Apple alone accounting for nearly $100 billion in trailing 12-month repurchases. Financials and Energy companies also have significant buyback programs.</p>

      <h3>Are stock buybacks good or bad for shareholders?</h3>
      <p>Stock buybacks can be good or bad depending on the price paid. When a company buys back undervalued stock, it creates value for remaining shareholders by increasing their ownership percentage and boosting earnings per share (EPS). However, if management buys back overvalued stock, it destroys shareholder value.</p>

      <h3>Where can I find a list of companies buying back stock?</h3>
      <p>You can find a list of companies buying back stock on our comprehensive buyback tracker, which ranks the top 50 companies by total buyback amount, buyback yield, and share count reduction.</p>

      <h3>How does buyback yield compare to dividend yield?</h3>
      <p>Buyback yield is the total amount spent on share repurchases divided by market cap, whereas dividend yield is total dividends paid divided by market cap. Both return capital to shareholders, but buybacks are often more tax-efficient and flexible, while dividends provide predictable income. Many top companies offer a combination of both.</p>
    </div>

    <div class="methodology">
      <h2>Methodology & Recent Announcements</h2>
      <p>This study compiles buyback data from SEC 10-K filings, quarterly earnings reports, and S&P Dow Jones Indices. Buyback amounts represent trailing 12-month share repurchases. Buyback yield is calculated as the buyback amount divided by market capitalization. Market capitalization data is sourced as of early 2026.</p>
      <p><strong>Recent Announcements:</strong> Note that this tracker uses trailing 12-month <em>actual</em> repurchases, not just authorizations. Companies often announce massive multi-year buyback authorizations (e.g., $50B over 5 years) but only execute a fraction of that in any given year. We track the actual capital deployed to purchase shares.</p>
    </div>
  </div>

  <footer>
    © ${currentYear} Westmount Research · A GAB Ventures property
    <div class="disclaimer">Data for informational purposes only. Not investment advice. Past performance is not indicative of future results.</div>
  </footer>

  <script>
    // Chart.js implementation
    const ctx = document.getElementById('sectorChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ${sectorLabels},
        datasets: [{
          label: 'Total Buybacks ($ Billions)',
          data: ${sectorValues},
          backgroundColor: ${sectorColors},
          borderColor: ${sectorColors}.map(c => c.replace('0.7', '1')),
          borderWidth: 1
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
            beginAtZero: true,
            grid: { color: '#152040' },
            ticks: { color: '#8a9bb0' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#8a9bb0', maxRotation: 45, minRotation: 45 }
          }
        }
      }
    });

    // Table sorting logic
    let currentSortCol = 2; // Default sorted by Buybacks ($B)
    let currentSortDesc = true;

    function sortTable(colIndex, type) {
      const table = document.getElementById("buybackTable");
      const tbody = table.querySelector("tbody");
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const headers = table.querySelectorAll("th");

      // Update sort direction
      if (currentSortCol === colIndex) {
        currentSortDesc = !currentSortDesc;
      } else {
        currentSortCol = colIndex;
        currentSortDesc = type === 'num' ? true : false; // Default desc for num, asc for str
      }

      // Update header styles
      headers.forEach(th => {
        th.classList.remove("sort-asc", "sort-desc");
      });
      headers[colIndex].classList.add(currentSortDesc ? "sort-desc" : "sort-asc");

      rows.sort((a, b) => {
        let valA = a.cells[colIndex].innerText.replace(/[^0-9.-]+/g,"");
        let valB = b.cells[colIndex].innerText.replace(/[^0-9.-]+/g,"");

        if (type === 'num') {
            valA = valA === 'NA' || valA === '' ? -1 : parseFloat(valA);
            valB = valB === 'NA' || valB === '' ? -1 : parseFloat(valB);
            return currentSortDesc ? valB - valA : valA - valB;
        } else {
            valA = a.cells[colIndex].innerText.toLowerCase();
            valB = b.cells[colIndex].innerText.toLowerCase();
            if (valA < valB) return currentSortDesc ? 1 : -1;
            if (valA > valB) return currentSortDesc ? -1 : 1;
            return 0;
        }
      });

      rows.forEach(row => tbody.appendChild(row));
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(process.cwd(), 'public', 'largest-stock-buybacks-2026.html'), html);
  console.log('Successfully generated public/largest-stock-buybacks-2026.html');
}

buildHtml();
