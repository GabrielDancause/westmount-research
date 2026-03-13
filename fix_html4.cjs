const fs = require('fs');

const data = fs.readFileSync('colData.json', 'utf-8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cost of Living by State 2026: Affordability Ranked</title>
    <meta name="description" content="Discover the complete 2026 cost of living by state ranking. Compare all 50 US states by housing, groceries, effective tax burden, and true affordability.">
    <link rel="canonical" href="https://westmountfundamentals.com/cost-of-living-by-state-2026">

    <meta property="og:title" content="Cost of Living by State 2026: Affordability Ranked">
    <meta property="og:description" content="Discover the complete 2026 cost of living by state ranking. Compare all 50 US states by housing, groceries, effective tax burden, and true affordability.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://westmountfundamentals.com/cost-of-living-by-state-2026">
    <meta property="og:site_name" content="Westmount Fundamentals">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Cost of Living by State 2026: Affordability Ranked">
    <meta name="twitter:description" content="Discover the complete 2026 cost of living by state ranking. Compare all 50 US states by housing, groceries, effective tax burden, and true affordability.">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF72NSC1Q"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-VYF72NSC1Q');
    </script>

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Cost of Living by State 2026",
      "description": "Discover the complete 2026 cost of living by state ranking. Compare all 50 US states by housing, groceries, effective tax burden, and true affordability.",
      "datePublished": "2024-03-05T08:00:00+08:00",
      "publisher": {
        "@type": "Organization",
        "name": "Westmount Fundamentals"
      }
    }
    </script>

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [{
        "@type": "Question",
        "name": "What are the cheapest states to live in 2026?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The cheapest states typically include those in the South and Midwest, such as Oklahoma, Mississippi, and West Virginia, driven by low housing and utility costs."
        }
      }, {
        "@type": "Question",
        "name": "Which states have the highest cost of living?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Hawaii, Massachusetts, California, and New York consistently rank among the most expensive states due to severe housing shortages and high state taxes."
        }
      }, {
        "@type": "Question",
        "name": "How is the cost of living index calculated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The index compares state-level prices for housing, groceries, utilities, transportation, and healthcare to a national baseline average set at 100."
        }
      }, {
        "@type": "Question",
        "name": "Does cost of living include taxes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Standard cost of living indexes often exclude taxes. However, true affordability must factor in state income, property, and sales taxes to calculate effective take-home pay."
        }
      }, {
        "@type": "Question",
        "name": "How does median income affect state affordability?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A high cost of living can be offset by higher median incomes. Affordability is best measured by dividing post-tax effective income by the regional cost of living index."
        }
      }]
    }
    </script>

    <style>
        :root {
            --bg: #060a12;
            --card-bg: #0a1020;
            --border: #152040;
            --accent: #4a8fe7;
            --text-main: #e2e8f0;
            --text-muted: #94a3b8;
            --font-sans: 'Inter', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background-color: var(--bg);
            color: var(--text-main);
            font-family: var(--font-sans);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }

        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        /* Sticky Nav */
        nav {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: rgba(6, 10, 18, 0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
            padding: 16px 0;
        }
        .nav-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .nav-brand {
            font-weight: 700;
            font-size: 1.1rem;
            color: #fff;
            letter-spacing: -0.02em;
        }
        .nav-links {
            display: flex;
            gap: 24px;
        }
        .nav-links a {
            color: var(--text-muted);
            font-size: 0.9rem;
            font-weight: 500;
        }
        .nav-links a:hover { color: #fff; text-decoration: none; }

        /* Typography */
        h1, h2, h3 { color: #fff; line-height: 1.2; font-weight: 700; }
        .gradient-text {
            background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; letter-spacing: -0.03em; }
        h2 { font-size: 1.75rem; margin: 3rem 0 1.5rem; }
        p { margin-bottom: 1.5rem; color: var(--text-muted); }

        header { padding: 4rem 0 2rem; text-align: center; }
        .header-desc { max-width: 700px; margin: 0 auto; font-size: 1.1rem; }

        /* Footer */
        footer {
            margin-top: 5rem;
            padding: 3rem 0;
            border-top: 1px solid var(--border);
            text-align: center;
            color: var(--text-muted);
            font-size: 0.85rem;
        }
        footer p { margin-bottom: 0.5rem; }

        /* Utils */
        .text-center { text-align: center; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-8 { margin-bottom: 2rem; }

        @media (max-width: 768px) {
            h1 { font-size: 2rem; }
            .nav-links { display: none; }
        }

        /* Stat Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        .stat-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #fff;
            margin: 0.5rem 0;
            font-family: var(--font-mono);
        }
        .stat-label {
            font-size: 0.9rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Table */
        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        input[type="text"] {
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--text-main);
            padding: 0.75rem 1rem;
            border-radius: 8px;
            width: 100%;
            max-width: 300px;
            font-family: var(--font-sans);
        }
        input[type="text"]:focus {
            outline: none;
            border-color: var(--accent);
        }

        .table-container {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--card-bg);
            margin-bottom: 3rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            min-width: 800px;
        }
        th, td {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
        }
        th {
            background: rgba(255, 255, 255, 0.02);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
        }
        th:hover { color: #fff; }
        td { font-family: var(--font-mono); font-size: 0.95rem; }
        .col-state { font-family: var(--font-sans); font-weight: 600; color: #fff; }
        .badge-good { color: #4ade80; }
        .badge-bad { color: #f87171; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: rgba(255,255,255,0.02); }

        /* Chart */
        .chart-container {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 3rem;
            position: relative;
            height: 400px;
            width: 100%;
        }
    </style>
</head>
<body>

    <nav>
        <div class="container nav-content">
            <a href="/" class="nav-brand">Westmount Fundamentals</a>
            <div class="nav-links">
                <a href="/#studies">Studies</a>
                <a href="/#tools">Tools</a>
                <a href="/#guides">Guides</a>
            </div>
        </div>
    </nav>

    <main class="container">
        <header>
            <h1 class="gradient-text">Cost of Living by State 2026</h1>
            <p class="header-desc">
                A complete breakdown of the cheapest and most expensive US states. We analyze the traditional cost of living index alongside median income and state tax burdens to reveal the true affordability of all 50 states.
            </p>
        </header>

        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <div class="stat-label">Cheapest State</div>
                <div class="stat-value" id="statCheapest">--</div>
                <div class="stat-label" style="font-size:0.75rem" id="statCheapestVal">Index: --</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Most Expensive</div>
                <div class="stat-value" id="statExpensive">--</div>
                <div class="stat-label" style="font-size:0.75rem" id="statExpensiveVal">Index: --</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Highest Median Income</div>
                <div class="stat-value" id="statIncome">--</div>
                <div class="stat-label" style="font-size:0.75rem" id="statIncomeVal">$ --</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Most Affordable Overall</div>
                <div class="stat-value" id="statAffordable">--</div>
                <div class="stat-label" style="font-size:0.75rem">Best Income/Cost Ratio</div>
            </div>
        </div>

        <h2 style="margin-top:0">The Data</h2>
        <div class="controls">
            <input type="text" id="searchInput" placeholder="Search states...">
        </div>

        <div class="table-container">
            <table id="dataTable">
                <thead>
                    <tr>
                        <th data-sort="rank">Rank ▼</th>
                        <th data-sort="state">State</th>
                        <th data-sort="index">COL Index</th>
                        <th data-sort="housing">Housing</th>
                        <th data-sort="grocery">Groceries</th>
                        <th data-sort="taxBurden">Tax Burden</th>
                        <th data-sort="income">Median Income</th>
                        <th data-sort="affordabilityScore">Affordability Score</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <!-- Data injected via JS -->
                </tbody>
            </table>
        </div>

        <h2>Cost vs Income Analysis</h2>
        <div class="chart-container">
            <canvas id="scatterChart"></canvas>
        </div>

        <section id="methodology" style="margin-top: 4rem;">
            <h2>Data & Methodology</h2>
            <p>
                To provide a comprehensive view of state affordability, this analysis combines three major datasets:
            </p>
            <ul style="color: var(--text-muted); margin-left: 1.5rem; margin-bottom: 1.5rem;">
                <li style="margin-bottom: 0.5rem;"><strong>Cost of Living Index:</strong> Sourced from the Missouri Economic Research and Information Center (MERIC), representing an average of prices for housing, groceries, utilities, transportation, and healthcare. A baseline of 100 represents the national average.</li>
                <li style="margin-bottom: 0.5rem;"><strong>Median Income:</strong> Data is derived from the latest available Census Bureau figures, reflecting median household income per state.</li>
                <li style="margin-bottom: 0.5rem;"><strong>Effective Tax Burden:</strong> Represents the total percentage of income paid in state and local taxes (including property, income, and sales taxes), aggregated by WalletHub.</li>
                <li style="margin-bottom: 0.5rem;"><strong>True Affordability Score:</strong> An estimated metric calculated by adjusting the state median income for the effective tax burden, and dividing the resulting "take-home" income by the state's cost of living index. A higher score indicates better overall purchasing power.</li>
            </ul>
        </section>

        <section id="faq">
            <h2>Frequently Asked Questions</h2>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">What are the cheapest states to live in 2026?</h3>
                <p>The cheapest states typically include those in the South and Midwest, such as Oklahoma, Mississippi, and West Virginia, driven by significantly lower housing and utility costs compared to coastal states.</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Which states have the highest cost of living?</h3>
                <p>Hawaii, Massachusetts, California, and New York consistently rank among the most expensive states due to severe housing shortages, high utility rates, and elevated state taxes.</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">How is the cost of living index calculated?</h3>
                <p>The index compares state-level prices for key expenses—housing, groceries, utilities, transportation, and healthcare—to a national baseline average, which is always set to 100.</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Does cost of living include taxes?</h3>
                <p>Standard cost of living indexes often exclude taxes. However, true affordability must factor in state income, property, and sales taxes to calculate effective take-home pay, which is why our affordability score includes tax burdens.</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">How does median income affect state affordability?</h3>
                <p>A high cost of living can sometimes be offset by higher median incomes. Affordability is best measured by dividing post-tax effective income by the regional cost of living index to understand local purchasing power.</p>
            </div>
        </section>

    </main>

    <footer>
        <div class="container">
            <p>© 2026 Westmount Research · A GAB Ventures property. Not investment advice.</p>
            <p>All information for educational purposes only.</p>
        </div>
    </footer>

    <script id="data-script">
    const COL_DATA = ${data};
    </script>

    <script>
    document.addEventListener('DOMContentLoaded', () => {
        if (!COL_DATA) return;

        let sortCol = 'index';
        let sortAsc = true;
        let tableData = [...COL_DATA];

        const tbody = document.getElementById('tableBody');
        const searchInput = document.getElementById('searchInput');

        // Stats
        const cheapest = [...COL_DATA].sort((a,b) => a.index - b.index)[0];
        const expensive = [...COL_DATA].sort((a,b) => b.index - a.index)[0];
        const incomeRank = [...COL_DATA].sort((a,b) => (b.income||0) - (a.income||0))[0];
        const affordRank = [...COL_DATA].sort((a,b) => (b.affordabilityScore||0) - (a.affordabilityScore||0))[0];

        document.getElementById('statCheapest').textContent = cheapest.state;
        document.getElementById('statCheapestVal').textContent = 'Index: ' + cheapest.index;

        document.getElementById('statExpensive').textContent = expensive.state;
        document.getElementById('statExpensiveVal').textContent = 'Index: ' + expensive.index;

        document.getElementById('statIncome').textContent = incomeRank.state;
        document.getElementById('statIncomeVal').textContent = incomeRank.income ? '$' + incomeRank.income.toLocaleString() : 'N/A';

        document.getElementById('statAffordable').textContent = affordRank.state;

        // Render Table
        function renderTable(data) {
            tbody.innerHTML = '';
            data.forEach((row, i) => {
                const tr = document.createElement('tr');

                // Formatters
                const fIndex = val => val ? val.toFixed(1) : '--';
                const fCurrency = val => val ? '$' + val.toLocaleString() : '--';
                const fPct = val => val ? val.toFixed(2) + '%' : '--';
                const fScore = val => val ? val.toLocaleString() : '--';

                // Rank logic. If sorting by index asc, rank is just original index. Otherwise show dash.
                const rank = (sortCol === 'index' && sortAsc) ? (i + 1) : '-';

                tr.innerHTML = \`
                    <td>\${rank}</td>
                    <td class="col-state">\${row.state}</td>
                    <td>\${fIndex(row.index)}</td>
                    <td>\${fIndex(row.housing)}</td>
                    <td>\${fIndex(row.grocery)}</td>
                    <td>\${fPct(row.taxBurden)}</td>
                    <td>\${fCurrency(row.income)}</td>
                    <td>\${fScore(row.affordabilityScore)}</td>
                \`;
                tbody.appendChild(tr);
            });
        }

        function sortData() {
            tableData.sort((a, b) => {
                let valA = a[sortCol];
                let valB = b[sortCol];

                if (sortCol === 'rank') {
                   valA = a.index;
                   valB = b.index;
                }

                if (typeof valA === 'string') {
                    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    valA = valA || 0;
                    valB = valB || 0;
                    return sortAsc ? valA - valB : valB - valA;
                }
            });
            renderTable(tableData);
        }

        // Headers
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-sort');
                if (sortCol === col) {
                    sortAsc = !sortAsc;
                } else {
                    sortCol = col;
                    sortAsc = true;
                }

                // Reset arrows
                document.querySelectorAll('th').forEach(h => h.textContent = h.textContent.replace(' ▼', '').replace(' ▲', ''));
                th.textContent += sortAsc ? ' ▼' : ' ▲';

                sortData();
            });
        });

        // Search
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            tableData = COL_DATA.filter(row => row.state.toLowerCase().includes(term));
            sortData();
        });

        // Init Table
        sortData();

        // Chart.js Setup
        const ctx = document.getElementById('scatterChart').getContext('2d');
        const chartData = COL_DATA.map(d => ({
            x: d.index,
            y: d.effectiveIncome || d.income,
            state: d.state
        }));

        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'States',
                    data: chartData,
                    backgroundColor: '#4a8fe7',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const d = ctx.raw;
                                return \`\${d.state}: Index \${d.x}, Income $\${d.y.toLocaleString()}\`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Cost of Living Index (100 = Avg)', color: '#94a3b8' },
                        grid: { color: '#152040' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        title: { display: true, text: 'Effective Take-Home Income', color: '#94a3b8' },
                        grid: { color: '#152040' },
                        ticks: { color: '#94a3b8', callback: val => '$' + val.toLocaleString() }
                    }
                }
            }
        });
    });
    </script>
</body>
</html>`;

fs.writeFileSync('public/cost-of-living-by-state-2026.html', html);
console.log('Successfully wrote clean HTML file');
