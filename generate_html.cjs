const fs = require('fs');

const dataRaw = fs.readFileSync('industry_margins.json', 'utf-8');
const data = JSON.parse(dataRaw);
const industries = data.industries;

const title = "Operating Margin by Industry: Profitability Rankings (2026)";
const desc = "Operating and net profit margins across 30+ industries. Rank by profitability, identify the most and least profitable industries, and view 5-year trends.";
const canonical = "https://westmountfundamentals.com/operating-margin-by-industry-2026";
const currentYear = new Date().getFullYear();

// Methodologies
const methodology = `
  <h2>Methodology & Data Sources</h2>
  <p>This study analyzes the profit margins of S&P 500 companies, grouped by their respective GICS industries, to determine the most and least profitable sectors of the economy in 2026.</p>
  <ul>
    <li><strong>Data Source:</strong> Financial data is aggregated from standard SEC filings (10-K, 10-Q) using the Yahoo Finance API.</li>
    <li><strong>Margin Definitions:</strong>
      <ul>
        <li><em>Operating Margin:</em> Operating Income divided by Total Revenue. Represents profit from core business operations before interest and taxes.</li>
        <li><em>Net Margin:</em> Net Income divided by Total Revenue. The final "bottom line" profit percentage.</li>
        <li><em>Gross Margin:</em> Gross Profit divided by Total Revenue. Revenue remaining after deducting the direct costs of goods sold (COGS).</li>
      </ul>
    </li>
    <li><strong>Averages:</strong> Industry averages are calculated as an equally-weighted average of the constituent S&P 500 companies within that industry.</li>
    <li><strong>Null Over Fake Data:</strong> Where financial models (e.g., banks, REITs) do not utilize standard gross margins, or where 5-year growth data is unavailable, values are explicitly reported as "N/A" rather than using placeholder values.</li>
  </ul>
`;

// FAQ
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a good operating margin by industry?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A 'good' operating margin varies drastically by industry. High-margin industries like Software or Pharmaceuticals often see operating margins above 20-30%, while volume-driven industries like Retail or Grocery typically operate on single-digit margins (3-8%)."
      }
    },
    {
      "@type": "Question",
      "name": "Which industry has the highest profit margins?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Historically, industries with high intellectual property and low marginal costs of reproduction—such as Software, Biotechnology, and Capital Markets—tend to have the highest profit margins."
      }
    },
    {
      "@type": "Question",
      "name": "What is the average profit margin for a business?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Across the broader S&P 500, the average net profit margin typically hovers around 10-12%, though this fluctuates with macroeconomic conditions and inflation."
      }
    },
    {
      "@type": "Question",
      "name": "How do you calculate operating margin?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Operating margin is calculated by dividing a company's operating income (profit after deducting operating expenses like wages and depreciation, but before interest and taxes) by its total revenue, then multiplying by 100 to get a percentage."
      }
    },
    {
      "@type": "Question",
      "name": "Why are gross margins higher than net margins?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Gross margin only deducts the direct costs of making a product (COGS). Net margin is lower because it deducts all other expenses, including operating costs, interest, and taxes."
      }
    }
  ]
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": title,
  "description": desc,
  "datePublished": "2026-03-13T00:00:00.000Z",
  "author": {
    "@type": "Organization",
    "name": "Westmount Research"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Westmount Research",
    "logo": {
      "@type": "ImageObject",
      "url": "https://westmountfundamentals.com/logo.png"
    }
  }
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <link rel="canonical" href="${canonical}">

    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">

    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

    <script type="application/ld+json">
      ${JSON.stringify(faqSchema)}
    </script>
    <script type="application/ld+json">
      ${JSON.stringify(articleSchema)}
    </script>

    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF72NSC1Q"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-VYF72NSC1Q');
    </script>

    <style>
        :root {
            --bg: #060a12;
            --card: #0a1020;
            --border: #152040;
            --accent: #4a8fe7;
            --text-main: #c8d0de;
            --text-muted: #6a7a90;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text-main);
            line-height: 1.6;
        }
        nav {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: rgba(6, 10, 18, 0.85);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--border);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        nav .brand {
            font-weight: 900;
            color: #fff;
            text-decoration: none;
            font-size: 1.2rem;
        }
        nav .links a {
            color: var(--text-main);
            text-decoration: none;
            margin-left: 1.5rem;
            font-weight: 600;
            font-size: 0.9rem;
        }
        nav .links a:hover { color: var(--accent); }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }

        h1 {
            font-size: 3rem;
            font-weight: 900;
            margin-bottom: 1rem;
            background: linear-gradient(90deg, #fff, var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1.2;
        }

        .subtitle {
            font-size: 1.2rem;
            color: var(--text-muted);
            margin-bottom: 3rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 4rem;
        }

        .stat-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
        }
        .stat-card .value {
            font-size: 2.5rem;
            font-weight: 900;
            color: var(--accent);
            margin-bottom: 0.5rem;
            font-family: 'JetBrains Mono', monospace;
        }
        .stat-card .label {
            font-size: 0.9rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }

        .controls {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }

        input[type="text"], select {
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--text-main);
            padding: 0.8rem 1rem;
            border-radius: 8px;
            font-family: inherit;
            flex: 1;
            min-width: 200px;
        }
        input[type="text"]:focus, select:focus {
            outline: none;
            border-color: var(--accent);
        }

        .table-container {
            overflow-x: auto;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            margin-bottom: 4rem;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-variant-numeric: tabular-nums;
        }

        th, td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border);
        }

        th {
            font-weight: 800;
            color: #fff;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 1px;
            cursor: pointer;
            white-space: nowrap;
        }
        th:hover { color: var(--accent); }

        td { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; }
        td.industry-col { font-family: 'Inter', sans-serif; font-weight: 600; color: #fff; }
        td.sector-col { font-family: 'Inter', sans-serif; color: var(--text-muted); font-size: 0.85rem; }

        .positive { color: #4ade80; }
        .negative { color: #f87171; }
        .null-val { color: var(--text-muted); font-style: italic; }

        .chart-container {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 4rem;
            height: 500px;
            position: relative;
        }

        .content-section {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 3rem;
            margin-bottom: 4rem;
        }
        .content-section h2 {
            font-size: 2rem;
            color: #fff;
            margin-bottom: 1.5rem;
        }
        .content-section p { margin-bottom: 1.5rem; }
        .content-section ul { margin-left: 1.5rem; margin-bottom: 1.5rem; }
        .content-section li { margin-bottom: 0.5rem; }

        .faq-item {
            margin-bottom: 2rem;
            border-bottom: 1px solid var(--border);
            padding-bottom: 1.5rem;
        }
        .faq-item h3 {
            font-size: 1.2rem;
            color: #fff;
            margin-bottom: 0.8rem;
        }
        .faq-item p { margin-bottom: 0; color: var(--text-muted); }

        footer {
            text-align: center;
            padding: 3rem 2rem;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        @media (max-width: 768px) {
            h1 { font-size: 2rem; }
            .container { padding: 2rem 1rem; }
            .content-section { padding: 1.5rem; }
            nav { flex-direction: column; gap: 1rem; }
        }
    </style>
</head>
<body>
    <nav>
        <a href="/" class="brand">Westmount Fundamentals</a>
        <div class="links">
            <a href="/#studies">Studies</a>
            <a href="/#tools">Tools</a>
            <a href="/#guides">Guides</a>
        </div>
    </nav>

    <div class="container">
        <h1>${title}</h1>
        <p class="subtitle">An analysis of profit margins across S&P 500 industries.</p>

        <div class="stats-grid" id="stats-grid">
            <!-- Stats populated by JS -->
        </div>

        <div class="chart-container">
            <canvas id="marginChart"></canvas>
        </div>

        <div class="controls">
            <input type="text" id="searchInput" placeholder="Search industries...">
            <select id="sectorFilter">
                <option value="all">All Sectors</option>
            </select>
        </div>

        <div class="table-container">
            <table id="dataTable">
                <thead>
                    <tr>
                        <th data-sort="industry">Industry ↕</th>
                        <th data-sort="sector">Sector ↕</th>
                        <th data-sort="companiesCount">S&P 500 Cos ↕</th>
                        <th data-sort="avgOperatingMargin">Operating Margin ↕</th>
                        <th data-sort="avgNetMargin">Net Margin ↕</th>
                        <th data-sort="avgGrossMargin">Gross Margin ↕</th>
                        <th data-sort="avgFiveYearGrowth">5Y EPS Growth ↕</th>
                        <th>Top Companies</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>

        <div class="content-section">
            ${methodology}
        </div>

        <div class="content-section">
            <h2>Frequently Asked Questions</h2>
            <div id="faq-container">
                <!-- Populated by JS -->
            </div>
        </div>
    </div>

    <footer>
        <p>© ${currentYear} Westmount Research · A GAB Ventures property. Not investment advice. All information for educational purposes only.</p>
    </footer>

    <script>
        const INITIAL_DATA = ${JSON.stringify(industries)};
        const FAQ_DATA = ${JSON.stringify(faqSchema.mainEntity)};

        let currentData = [...INITIAL_DATA];
        let sortCol = 'avgOperatingMargin';
        let sortAsc = false;

        const formatPct = (val) => {
            if (val === null || val === undefined) return '<span class="null-val">N/A</span>';
            const num = val * 100;
            const cls = num < 0 ? 'negative' : '';
            return \`<span class="\${cls}">\${num.toFixed(1)}%</span>\`;
        };

        const renderStats = () => {
            const validOp = INITIAL_DATA.filter(d => d.avgOperatingMargin !== null);
            validOp.sort((a,b) => b.avgOperatingMargin - a.avgOperatingMargin);

            const highestOp = validOp[0];
            const lowestOp = validOp[validOp.length - 1];

            let totalOp = 0;
            validOp.forEach(d => totalOp += d.avgOperatingMargin);
            const avgOp = totalOp / validOp.length;

            const statsHtml = \`
                <div class="stat-card">
                    <div class="value">\${(highestOp.avgOperatingMargin * 100).toFixed(1)}%</div>
                    <div class="label">Highest Op Margin (\${highestOp.industry})</div>
                </div>
                <div class="stat-card">
                    <div class="value">\${(lowestOp.avgOperatingMargin * 100).toFixed(1)}%</div>
                    <div class="label">Lowest Op Margin (\${lowestOp.industry})</div>
                </div>
                <div class="stat-card">
                    <div class="value">\${(avgOp * 100).toFixed(1)}%</div>
                    <div class="label">Avg Industry Op Margin</div>
                </div>
            \`;
            document.getElementById('stats-grid').innerHTML = statsHtml;
        };

        const populateSectors = () => {
            const sectors = [...new Set(INITIAL_DATA.map(d => d.sector))].filter(Boolean).sort();
            const select = document.getElementById('sectorFilter');
            sectors.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                select.appendChild(opt);
            });
        };

        const renderTable = () => {
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';

            currentData.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = \`
                    <td class="industry-col">\${row.industry}</td>
                    <td class="sector-col">\${row.sector || 'N/A'}</td>
                    <td>\${row.companiesCount}</td>
                    <td>\${formatPct(row.avgOperatingMargin)}</td>
                    <td>\${formatPct(row.avgNetMargin)}</td>
                    <td>\${formatPct(row.avgGrossMargin)}</td>
                    <td>\${formatPct(row.avgFiveYearGrowth)}</td>
                    <td class="sector-col">\${row.topCompaniesStr}</td>
                \`;
                tbody.appendChild(tr);
            });
        };

        const renderChart = () => {
            // Take top 15 industries by operating margin for the chart
            const chartData = [...INITIAL_DATA]
                .filter(d => d.avgOperatingMargin !== null)
                .sort((a, b) => b.avgOperatingMargin - a.avgOperatingMargin)
                .slice(0, 15);

            const ctx = document.getElementById('marginChart').getContext('2d');

            // Destroy existing chart if it exists
            if (window.myChart) {
                window.myChart.destroy();
            }

            Chart.defaults.color = '#6a7a90';
            Chart.defaults.font.family = 'Inter';

            window.myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.map(d => d.industry.length > 20 ? d.industry.substring(0, 20) + '...' : d.industry),
                    datasets: [
                        {
                            label: 'Operating Margin',
                            data: chartData.map(d => (d.avgOperatingMargin * 100).toFixed(1)),
                            backgroundColor: '#4a8fe7',
                            borderRadius: 4
                        },
                        {
                            label: 'Net Margin',
                            data: chartData.map(d => d.avgNetMargin !== null ? (d.avgNetMargin * 100).toFixed(1) : 0),
                            backgroundColor: '#152040',
                            borderColor: '#4a8fe7',
                            borderWidth: 1,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { color: '#c8d0de' } },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#152040' },
                            ticks: { callback: function(value) { return value + '%'; } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { maxRotation: 45, minRotation: 45 }
                        }
                    }
                }
            });
        };

        const renderFAQ = () => {
            const container = document.getElementById('faq-container');
            let html = '';
            FAQ_DATA.forEach(q => {
                html += \`
                    <div class="faq-item">
                        <h3>\${q.name}</h3>
                        <p>\${q.acceptedAnswer.text}</p>
                    </div>
                \`;
            });
            container.innerHTML = html;
        };

        const filterAndSort = () => {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const sector = document.getElementById('sectorFilter').value;

            currentData = INITIAL_DATA.filter(d => {
                const matchSearch = d.industry.toLowerCase().includes(search);
                const matchSector = sector === 'all' || d.sector === sector;
                return matchSearch && matchSector;
            });

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

            renderTable();
        };

        // Event Listeners
        document.getElementById('searchInput').addEventListener('input', filterAndSort);
        document.getElementById('sectorFilter').addEventListener('change', filterAndSort);

        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-sort');
                if (sortCol === col) {
                    sortAsc = !sortAsc;
                } else {
                    sortCol = col;
                    sortAsc = false;
                }
                filterAndSort();
            });
        });

        // Init
        renderStats();
        populateSectors();
        renderTable();
        renderChart();
        renderFAQ();
    </script>
</body>
</html>`;

fs.writeFileSync('public/operating-margin-by-industry-2026.html', html);
console.log("Successfully generated public/operating-margin-by-industry-2026.html");
