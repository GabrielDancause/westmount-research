const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/dividend-yield-vs-growth.json', 'utf8'));

const dividendPayers = data.filter(d => d.dividendYield !== null && d.dividendYield > 0)
    .sort((a,b) => b.dividendYield - a.dividendYield);

const totalAnalyzed = dividendPayers.length;
const medianYield = (() => {
    const yields = dividendPayers.map(d => d.dividendYield).sort((a,b) => a-b);
    return yields[Math.floor(yields.length/2)] * 100;
})();
const medianGrowth = (() => {
    const growths = dividendPayers.filter(d => d.divGrowth5yr !== null).map(d => d.divGrowth5yr).sort((a,b) => a-b);
    return growths[Math.floor(growths.length/2)] * 100;
})();

const sweetSpotCount = dividendPayers.filter(d => d.dividendYield > medianYield/100 && d.divGrowth5yr > medianGrowth/100).length;
const trapCount = dividendPayers.filter(d => d.dividendYield > medianYield/100 && d.divGrowth5yr < medianGrowth/100).length;

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dividend Yield vs Growth Rate: S&P 500 Analysis 2026 | Westmount Research</title>
    <meta name="description" content="Comparing dividend yield against dividend growth rate for S&P 500 companies. Find stocks with high yield and high growth vs yield traps.">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #060a12;
            --card: #0a1020;
            --border: #152040;
            --accent: #4a8fe7;
            --text-main: #c8d0de;
            --text-muted: #6a7a90;
            --trap: #ef4444;
            --grower: #10b981;
            --sweet: #f59e0b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }
        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        /* Header */
        header { border-bottom: 1px solid var(--border); padding: 20px 0; }
        .logo { font-weight: 800; font-size: 1.2rem; color: #fff; letter-spacing: -0.5px; }
        .logo span { color: var(--accent); }

        /* Hero */
        .hero { padding: 80px 0 40px; text-align: center; }
        .tag { display: inline-block; background: rgba(74,143,231,0.1); color: var(--accent); font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 4px; letter-spacing: 1px; margin-bottom: 20px; }
        h1 { font-size: 3rem; font-weight: 800; color: #fff; letter-spacing: -1px; margin-bottom: 20px; line-height: 1.1; }
        .hero p { font-size: 1.1rem; color: var(--text-muted); max-width: 700px; margin: 0 auto 40px; }

        /* Stats */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 60px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; text-align: center; }
        .stat-val { font-size: 2.5rem; font-weight: 800; color: var(--accent); line-height: 1; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
        .stat-label { font-size: 0.9rem; color: var(--text-muted); font-weight: 600; }

        /* Controls */
        .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .search-box { background: var(--card); border: 1px solid var(--border); padding: 10px 16px; border-radius: 8px; color: #fff; font-family: 'Inter', sans-serif; width: 300px; }
        .search-box:focus { outline: none; border-color: var(--accent); }
        .filters { display: flex; gap: 8px; }
        .filter-btn { background: var(--card); border: 1px solid var(--border); color: var(--text-muted); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; }
        .filter-btn:hover, .filter-btn.active { background: rgba(74,143,231,0.1); color: var(--accent); border-color: var(--accent); }

        /* Table */
        .table-container { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow-x: auto; margin-bottom: 60px; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th, td { padding: 16px; border-bottom: 1px solid var(--border); }
        th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 700; cursor: pointer; user-select: none; }
        th:hover { color: #fff; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(255,255,255,0.02); }

        .ticker { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #fff; }
        .company { font-weight: 500; color: var(--text-main); }
        .num { font-family: 'JetBrains Mono', monospace; }
        .quadrant-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }
        .q-sweet { background: rgba(245, 158, 11, 0.1); color: var(--sweet); }
        .q-trap { background: rgba(239, 68, 68, 0.1); color: var(--trap); }
        .q-grower { background: rgba(16, 185, 129, 0.1); color: var(--grower); }
        .q-low { background: rgba(106, 122, 144, 0.1); color: var(--text-muted); }

        /* FAQ */
        .faq-section { max-width: 800px; margin: 0 auto 80px; }
        .faq-section h2 { font-size: 2rem; color: #fff; margin-bottom: 30px; text-align: center; }
        .faq-item { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 16px; }
        .faq-q { font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
        .faq-a { color: var(--text-muted); }

        /* Methodology */
        .methodology { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 32px; margin-bottom: 60px; }
        .methodology h2 { color: #fff; margin-bottom: 16px; }
        .methodology p { color: var(--text-muted); margin-bottom: 16px; }

        /* Footer */
        footer { border-top: 1px solid var(--border); padding: 40px 0; text-align: center; font-size: 0.85rem; color: var(--text-muted); }
        .disclaimer { max-width: 600px; margin: 16px auto 0; font-size: 0.75rem; color: #4a5568; }

        @media (max-width: 768px) {
            h1 { font-size: 2rem; }
            .controls { flex-direction: column; align-items: flex-start; }
            .search-box { width: 100%; }
        }
    </style>
</head>
<body>

<header>
    <div class="container">
        <div class="logo"><a href="/" style="color:#fff;">Westmount <span>Research</span></a></div>
    </div>
</header>

<div class="container">
    <div class="hero">
        <span class="tag">ORIGINAL RESEARCH 2026</span>
        <h1>Dividend Yield vs Growth Rate</h1>
        <p>An analysis of ${totalAnalyzed} S&P 500 dividend-paying companies. We map current yield against 5-year growth rates to separate the "sweet spot" compounders from the yield traps.</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-val">${totalAnalyzed}</div>
            <div class="stat-label">Dividend Payers Analyzed</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">${sweetSpotCount}</div>
            <div class="stat-label">"Sweet Spot" Stocks<br><span style="font-size:0.75rem;font-weight:400">(Above median yield & growth)</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-val">${trapCount}</div>
            <div class="stat-label">Potential Yield Traps<br><span style="font-size:0.75rem;font-weight:400">(Above median yield, below median growth)</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-val">${medianYield.toFixed(2)}%</div>
            <div class="stat-label">Median S&P 500 Yield</div>
        </div>
    </div>

    <div class="controls">
        <input type="text" id="searchInput" class="search-box" placeholder="Search ticker or company...">
        <div class="filters" id="filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="sweet">Sweet Spot</button>
            <button class="filter-btn" data-filter="trap">Yield Traps</button>
            <button class="filter-btn" data-filter="grower">Growers</button>
        </div>
    </div>

    <div class="table-container">
        <table id="dataTable">
            <thead>
                <tr>
                    <th data-sort="ticker">Ticker ↕</th>
                    <th data-sort="company">Company ↕</th>
                    <th data-sort="yield">Yield ↕</th>
                    <th data-sort="growth">5Y Growth ↕</th>
                    <th data-sort="years">Consec. Yrs ↕</th>
                    <th data-sort="payout">Payout Ratio ↕</th>
                    <th data-sort="quadrant">Classification ↕</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <!-- Populated by JS -->
            </tbody>
        </table>
    </div>

    <div class="methodology">
        <h2>Methodology</h2>
        <p>This study analyzed all current dividend-paying stocks in the S&P 500 index. Data was collected in Q1 2026.</p>
        <p>We classify stocks into four quadrants based on the index medians (Yield: ${medianYield.toFixed(2)}%, Growth: ${medianGrowth.toFixed(2)}%):</p>
        <ul style="color:var(--text-muted); margin-left:20px; margin-bottom:16px;">
            <li><strong>Sweet Spot:</strong> Yield &gt; Median AND Growth &gt; Median. These companies offer both current income and inflation-beating dividend growth.</li>
            <li><strong>Yield Traps:</strong> Yield &gt; Median BUT Growth &lt; Median. Often mature companies with high payout ratios that struggle to grow their dividend meaningfully.</li>
            <li><strong>Growers:</strong> Yield &lt; Median BUT Growth &gt; Median. Typically capital-appreciating tech or growth stocks with fast-growing but small initial yields.</li>
            <li><strong>Low/Low:</strong> Yield &lt; Median AND Growth &lt; Median.</li>
        </ul>
        <p><em>Note on 5Y Growth:</em> Calculated as the Compound Annual Growth Rate (CAGR) of total dividends paid over the last 5 completed years.</p>
    </div>

    <div class="faq-section">
        <h2>Frequently Asked Questions</h2>

        <div class="faq-item">
            <div class="faq-q">What is considered a "good" dividend yield in the S&P 500?</div>
            <div class="faq-a">As of our 2026 analysis, the median dividend yield for S&P 500 companies that pay a dividend is ${medianYield.toFixed(2)}%. A yield between 2.5% and 4.0% is generally considered strong without entering "yield trap" territory, provided it is supported by consistent growth and a healthy payout ratio.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">What is a yield trap?</div>
            <div class="faq-a">A yield trap occurs when a stock presents an unusually high dividend yield, often because the stock price has fallen dramatically. In our study, we classify ${trapCount} companies as potential yield traps because their current yield is above the median, but their 5-year dividend growth rate is below the median, suggesting the dividend may not keep up with inflation or could be at risk of being cut.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">Why is dividend growth rate important?</div>
            <div class="faq-a">Dividend growth protects your income stream from inflation. A stock yielding 2% that grows its dividend at 10% annually will eventually provide a higher yield on your original investment (Yield on Cost) than a stock yielding 4% with zero growth. We found ${sweetSpotCount} "Sweet Spot" companies offering both above-average yield and growth.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">What is the "Sweet Spot" for dividend investing?</div>
            <div class="faq-a">The "Sweet Spot" refers to stocks that offer both an above-average starting yield AND an above-average dividend growth rate. These companies provide immediate income while still compounding your payout over time. In the S&P 500, we identified ${sweetSpotCount} companies fitting this description.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">How does payout ratio affect dividend safety?</div>
            <div class="faq-a">The payout ratio (dividends paid divided by net income) indicates how much of a company's earnings go toward dividends. A lower ratio (typically under 60%) suggests the dividend is safe and has room to grow. A ratio over 80% means the company is paying out most of its earnings, leaving little room for error if earnings drop.</div>
        </div>
    </div>

</div>

<footer>
    <div class="container">
        © 2026 <a href="/">Westmount Research</a> · A <a href="https://gab.ae" target="_blank" rel="noopener">GAB Ventures</a> property
        <div class="disclaimer">This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research.</div>
    </div>
</footer>

<script>
    const medianYield = ${medianYield};
    const medianGrowth = ${medianGrowth};

    // Inject the actual data
    const rawData = ${JSON.stringify(dividendPayers)};

    // Process data to add quadrant
    const stockData = rawData.map(d => {
        const yieldPct = (d.dividendYield * 100);
        const growthPct = d.divGrowth5yr !== null ? (d.divGrowth5yr * 100) : null;

        let quad = "Low/Low";
        let quadClass = "q-low";

        if (yieldPct > medianYield && growthPct !== null && growthPct > medianGrowth) {
            quad = "Sweet Spot"; quadClass = "q-sweet";
        } else if (yieldPct > medianYield && (growthPct === null || growthPct <= medianGrowth)) {
            quad = "Yield Trap"; quadClass = "q-trap";
        } else if (yieldPct <= medianYield && growthPct !== null && growthPct > medianGrowth) {
            quad = "Grower"; quadClass = "q-grower";
        }

        return {
            ...d,
            yieldPct,
            growthPct,
            quad,
            quadClass,
            payoutPct: d.payoutRatio !== null ? (d.payoutRatio * 100) : null
        };
    });

    let currentData = [...stockData];
    let sortCol = 'yield';
    let sortAsc = false;

    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const ths = document.querySelectorAll('th');

    function renderTable() {
        tableBody.innerHTML = '';
        currentData.forEach(d => {
            const tr = document.createElement('tr');

            const growthFmt = d.growthPct !== null ? d.growthPct.toFixed(2) + '%' : 'N/A';
            const payoutFmt = d.payoutPct !== null ? d.payoutPct.toFixed(1) + '%' : 'N/A';
            const yearsFmt = d.consecutiveYears !== null && d.consecutiveYears > 0 ? d.consecutiveYears : '-';

            tr.innerHTML = \`
                <td class="ticker">\${d.ticker}</td>
                <td class="company">\${d.company}</td>
                <td class="num" style="color:var(--accent)">\${d.yieldPct.toFixed(2)}%</td>
                <td class="num">\${growthFmt}</td>
                <td class="num">\${yearsFmt}</td>
                <td class="num">\${payoutFmt}</td>
                <td><span class="quadrant-badge \${d.quadClass}">\${d.quad}</span></td>
            \`;
            tableBody.appendChild(tr);
        });
    }

    function sortData() {
        currentData.sort((a, b) => {
            let valA, valB;
            switch(sortCol) {
                case 'ticker': valA = a.ticker; valB = b.ticker; break;
                case 'company': valA = a.company; valB = b.company; break;
                case 'yield': valA = a.yieldPct; valB = b.yieldPct; break;
                case 'growth': valA = a.growthPct ?? -999; valB = b.growthPct ?? -999; break;
                case 'years': valA = a.consecutiveYears ?? -1; valB = b.consecutiveYears ?? -1; break;
                case 'payout': valA = a.payoutPct ?? -999; valB = b.payoutPct ?? -999; break;
                case 'quadrant': valA = a.quad; valB = b.quad; break;
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
        renderTable();
    }

    function applyFilters() {
        const term = searchInput.value.toLowerCase();
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const filterType = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';

        currentData = stockData.filter(d => {
            const matchesSearch = d.ticker.toLowerCase().includes(term) || d.company.toLowerCase().includes(term);
            let matchesType = true;
            if (filterType === 'sweet') matchesType = d.quad === 'Sweet Spot';
            if (filterType === 'trap') matchesType = d.quad === 'Yield Trap';
            if (filterType === 'grower') matchesType = d.quad === 'Grower';

            return matchesSearch && matchesType;
        });

        sortData();
    }

    // Event Listeners
    searchInput.addEventListener('input', applyFilters);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFilters();
        });
    });

    ths.forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (sortCol === col) {
                sortAsc = !sortAsc;
            } else {
                sortCol = col;
                sortAsc = col === 'ticker' || col === 'company' || col === 'quadrant'; // default asc for text
            }
            sortData();
        });
    });

    // Initial render
    renderTable();
</script>

<!-- JSON-LD Schemas -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Dividend Yield vs Growth Rate: S&P 500 Analysis 2026",
  "description": "An analysis of ${totalAnalyzed} S&P 500 dividend-paying companies. We map current yield against 5-year growth rates to separate the sweet spot compounders from the yield traps.",
  "author": {
    "@type": "Organization",
    "name": "Westmount Research",
    "url": "https://westmountresearch.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Westmount Research",
    "logo": {
      "@type": "ImageObject",
      "url": "https://westmountresearch.com/favicon.svg"
    }
  },
  "datePublished": "2026-03-01",
  "dateModified": "2026-03-01"
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is considered a 'good' dividend yield in the S&P 500?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "As of our 2026 analysis, the median dividend yield for S&P 500 companies that pay a dividend is ${medianYield.toFixed(2)}%. A yield between 2.5% and 4.0% is generally considered strong without entering 'yield trap' territory, provided it is supported by consistent growth and a healthy payout ratio."
      }
    },
    {
      "@type": "Question",
      "name": "What is a yield trap?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A yield trap occurs when a stock presents an unusually high dividend yield, often because the stock price has fallen dramatically. In our study, we classify companies as potential yield traps because their current yield is above the median, but their 5-year dividend growth rate is below the median, suggesting the dividend may not keep up with inflation or could be at risk of being cut."
      }
    },
    {
      "@type": "Question",
      "name": "Why is dividend growth rate important?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Dividend growth protects your income stream from inflation. A stock yielding 2% that grows its dividend at 10% annually will eventually provide a higher yield on your original investment (Yield on Cost) than a stock yielding 4% with zero growth."
      }
    },
    {
      "@type": "Question",
      "name": "What is the 'Sweet Spot' for dividend investing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The 'Sweet Spot' refers to stocks that offer both an above-average starting yield AND an above-average dividend growth rate. These companies provide immediate income while still compounding your payout over time."
      }
    },
    {
      "@type": "Question",
      "name": "How does payout ratio affect dividend safety?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The payout ratio (dividends paid divided by net income) indicates how much of a company's earnings go toward dividends. A lower ratio (typically under 60%) suggests the dividend is safe and has room to grow. A ratio over 80% means the company is paying out most of its earnings, leaving little room for error if earnings drop."
      }
    }
  ]
}
</script>

</body>
</html>`;

fs.writeFileSync('public/dividend-yield-vs-growth.html', htmlContent);
console.log(`Generated public/dividend-yield-vs-growth.html with ${totalAnalyzed} companies.`);
