const fs = require('fs');

const holdings = JSON.parse(fs.readFileSync('brk_enriched.json', 'utf8'));

// Format utilities
const formatMoney = (val) => {
    if (val === null || val === undefined) return 'null';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return `$${val.toLocaleString()}`;
};

const formatShares = (val) => {
    if (val === null || val === undefined) return 'null';
    return val.toLocaleString();
};

const formatPercent = (val) => {
    if (val === null || val === undefined) return 'null';
    return `${val.toFixed(2)}%`;
};

// Activity badge
const getActivityBadge = (activity) => {
    if (!activity) return '<span class="badge badge-neutral">No Change</span>';
    const lower = activity.toLowerCase();
    if (lower.includes('add')) return `<span class="badge badge-positive">${activity}</span>`;
    if (lower.includes('reduce')) return `<span class="badge badge-negative">${activity}</span>`;
    if (lower.includes('buy')) return `<span class="badge badge-positive">New Buy</span>`;
    if (lower.includes('sell')) return `<span class="badge badge-negative">Sold Out</span>`;
    return `<span class="badge badge-neutral">${activity}</span>`;
};

// Sort holdings by percent (descending)
holdings.sort((a, b) => b.percent - a.percent);

const top10 = holdings.slice(0, 10);

// Calculate sectors
const sectorMap = {};
let totalPercent = 0;
holdings.forEach(h => {
    const s = h.sector || 'Unknown';
    sectorMap[s] = (sectorMap[s] || 0) + h.percent;
    totalPercent += h.percent;
});

const sectors = Object.keys(sectorMap).map(k => ({
    name: k,
    percent: sectorMap[k]
})).sort((a, b) => b.percent - a.percent);

// Recently Bought / Sold
const recentActivity = holdings.filter(h => h.activity && h.activity.trim() !== '');

// Top 10 chart colors
const chartColors = [
    '#4a8fe7', '#3b7bd4', '#2d67c1', '#1f53ad', '#12409a',
    '#0e327a', '#0a2559', '#061839', '#030a18', '#000000'
];

// Build Top 10 Chart CSS Bars
let top10ChartHtml = `<div class="bar-chart">`;
const maxTop10Percent = top10[0].percent;
top10.forEach((h, i) => {
    const width = (h.percent / maxTop10Percent) * 100;
    top10ChartHtml += `
    <div class="bar-row">
        <div class="bar-label"><strong>${h.ticker}</strong></div>
        <div class="bar-container">
            <div class="bar" style="width: ${width}%; background-color: #4a8fe7;"></div>
        </div>
        <div class="bar-value">${h.percent.toFixed(2)}%</div>
    </div>`;
});
top10ChartHtml += `</div>`;

// Build Sector Breakdown CSS Bars
let sectorChartHtml = `<div class="bar-chart">`;
const maxSectorPercent = sectors[0].percent;
sectors.forEach(s => {
    const width = (s.percent / maxSectorPercent) * 100;
    sectorChartHtml += `
    <div class="bar-row">
        <div class="bar-label">${s.name}</div>
        <div class="bar-container">
            <div class="bar" style="width: ${width}%; background-color: #1a5276;"></div>
        </div>
        <div class="bar-value">${s.percent.toFixed(2)}%</div>
    </div>`;
});
sectorChartHtml += `</div>`;


// Build recent activity table
let activityRows = recentActivity.map(h => `
    <tr>
        <td><strong>${h.ticker}</strong></td>
        <td>${h.nameText}</td>
        <td>${getActivityBadge(h.activity)}</td>
        <td class="num">${formatPercent(h.percent)}</td>
    </tr>
`).join('');

let activityHtml = `
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th>Activity</th>
                <th class="num">% of Portfolio</th>
            </tr>
        </thead>
        <tbody>
            ${activityRows}
        </tbody>
    </table>
</div>`;


// Build all holdings table
let holdingsRows = holdings.map(h => `
    <tr>
        <td><strong>${h.ticker}</strong></td>
        <td>${h.nameText}</td>
        <td>${h.sector || 'Unknown'}</td>
        <td class="num">${formatShares(h.shares)}</td>
        <td class="num">${formatMoney(h.value)}</td>
        <td class="num">${formatPercent(h.percent)}</td>
        <td>${getActivityBadge(h.activity)}</td>
    </tr>
`).join('');

let holdingsHtml = `
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th>Sector</th>
                <th class="num">Shares</th>
                <th class="num">Market Value</th>
                <th class="num">% Portfolio</th>
                <th>Activity</th>
            </tr>
        </thead>
        <tbody>
            ${holdingsRows}
        </tbody>
    </table>
</div>`;

const faqs = [
    {
        "q": "What stocks does Warren Buffett own right now?",
        "a": "Warren Buffett's Berkshire Hathaway portfolio consists of over 40 publicly traded companies. Apple (AAPL) remains one of his largest holdings, but he also owns substantial stakes in financial stalwarts like American Express (AXP) and Bank of America (BAC), as well as consumer staples like Coca-Cola (KO)."
    },
    {
        "q": "What is the Warren Buffett portfolio 2026?",
        "a": "The 2026 portfolio represents the latest SEC 13F filings detailing Berkshire Hathaway's equity holdings. It provides insights into his current macroeconomic views, highlighting his strategic bets in technology, energy, and financial services sectors."
    },
    {
        "q": "What are the largest Berkshire Hathaway holdings?",
        "a": "The largest positions typically include Apple (AAPL), American Express (AXP), Bank of America (BAC), Coca-Cola (KO), and Chevron (CVX). These core holdings often make up over 70% of the entire portfolio's value."
    },
    {
        "q": "Did Warren Buffett buy or sell recently?",
        "a": "Buffett actively manages the portfolio. Recent activities include both opportunistic additions and strategic trims. You can view the full 'Activity' column in our complete holdings table above to see exactly which stakes were reduced or added."
    },
    {
        "q": "Why does Buffett like dividend stocks like Coca-Cola?",
        "a": "Buffett favors companies with durable competitive advantages ('moats'), predictable earnings, and strong management. Coca-Cola, a holding for decades, consistently generates free cash flow and returns capital to shareholders via dividends, epitomizing his value investing philosophy."
    }
];

const faqHtml = faqs.map(faq => `
    <div class="faq-item">
        <h3>${faq.q}</h3>
        <p>${faq.a}</p>
    </div>
`).join('');

const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": f.a
        }
    }))
};

const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Warren Buffett's Portfolio 2026: Every Berkshire Hathaway Holding",
    "description": "See every stock Warren Buffett owns in 2026. One surprising sector makes up a massive chunk of Berkshire Hathaway's portfolio. Discover what he bought and sold.",
    "datePublished": "2026-01-01T08:00:00+08:00",
    "publisher": {
        "@type": "Organization",
        "name": "Westmount Research"
    }
};


const htmlStr = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warren Buffett's Portfolio 2026: Every Berkshire Hathaway Holding</title>
    <meta name="description" content="See every stock Warren Buffett owns in 2026. One surprising sector makes up a massive chunk of Berkshire Hathaway's portfolio. Discover what he bought and sold.">
    <link rel="canonical" href="https://westmountfundamentals.com/warren-buffett-portfolio-2026.html">

    <!-- Open Graph -->
    <meta property="og:title" content="Warren Buffett's Portfolio 2026: Every Berkshire Hathaway Holding">
    <meta property="og:description" content="See every stock Warren Buffett owns in 2026. One surprising sector makes up a massive chunk of Berkshire Hathaway's portfolio. Discover what he bought and sold.">
    <meta property="og:url" content="https://westmountfundamentals.com/warren-buffett-portfolio-2026.html">
    <meta property="og:type" content="article">

    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF72NSC1Q"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-VYF72NSC1Q');
    </script>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
        ${JSON.stringify(faqJsonLd)}
    </script>
    <script type="application/ld+json">
        ${JSON.stringify(articleJsonLd)}
    </script>

    <style>
        :root {
            --bg-color: #060a12;
            --card-bg: #0a1020;
            --border-color: #152040;
            --accent-color: #4a8fe7;
            --accent-hover: #3b7bd4;
            --text-main: #e2e8f0;
            --text-muted: #94a3b8;
            --positive: #10b981;
            --negative: #ef4444;
            --neutral: #64748b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
        }

        .sticky-nav {
            position: sticky;
            top: 0;
            z-index: 1000;
            background-color: rgba(6, 10, 18, 0.85);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid var(--border-color);
            padding: 1rem 0;
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 1.5rem;
        }

        .brand {
            font-weight: 700;
            font-size: 1.25rem;
            color: #fff;
            text-decoration: none;
        }

        .nav-links {
            display: flex;
            gap: 1.5rem;
        }

        .nav-links a {
            color: var(--text-muted);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.95rem;
            transition: color 0.2s;
        }

        .nav-links a:hover {
            color: var(--accent-color);
        }

        main {
            max-width: 1200px;
            margin: 3rem auto;
            padding: 0 1.5rem;
        }

        header {
            text-align: center;
            margin-bottom: 3rem;
        }

        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #fff;
            line-height: 1.2;
        }

        .subtitle {
            font-size: 1.125rem;
            color: var(--text-muted);
            max-width: 800px;
            margin: 0 auto;
        }

        h2 {
            font-size: 1.75rem;
            margin-top: 3rem;
            margin-bottom: 1.5rem;
            color: #fff;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.5rem;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            margin-bottom: 3rem;
        }

        @media (min-width: 768px) {
            .grid { grid-template-columns: 1fr 1fr; }
        }

        .card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1.5rem;
        }

        .card h3 {
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
            color: #fff;
        }

        .bar-chart {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .bar-row {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .bar-label {
            width: 80px;
            font-size: 0.875rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .bar-container {
            flex-grow: 1;
            background-color: var(--bg-color);
            height: 12px;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }

        .bar {
            height: 100%;
            border-radius: 6px;
        }

        .bar-value {
            width: 50px;
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
        }

        .table-container {
            overflow-x: auto;
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            margin-bottom: 2rem;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th, td {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
        }

        th {
            font-weight: 600;
            color: var(--text-muted);
            background-color: rgba(0,0,0,0.2);
            font-size: 0.875rem;
            white-space: nowrap;
        }

        td {
            font-size: 0.95rem;
        }

        tbody tr:hover {
            background-color: rgba(255,255,255,0.02);
        }

        .num {
            font-family: 'JetBrains Mono', monospace;
            text-align: right;
        }

        th.num { text-align: right; }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge-positive { background-color: rgba(16, 185, 129, 0.15); color: var(--positive); border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-negative { background-color: rgba(239, 68, 68, 0.15); color: var(--negative); border: 1px solid rgba(239, 68, 68, 0.3); }
        .badge-neutral { background-color: rgba(100, 116, 139, 0.15); color: var(--text-muted); border: 1px solid rgba(100, 116, 139, 0.3); }

        .faq-section {
            margin-top: 4rem;
        }

        .faq-item {
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .faq-item h3 {
            font-size: 1.125rem;
            margin-bottom: 0.5rem;
            color: #fff;
        }

        .faq-item p {
            color: var(--text-muted);
        }

        footer {
            text-align: center;
            padding: 3rem 1.5rem;
            border-top: 1px solid var(--border-color);
            margin-top: 4rem;
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            .nav-links { display: none; }
            h1 { font-size: 2rem; }
            th, td { padding: 0.75rem; font-size: 0.875rem; }
        }
    </style>
</head>
<body>

    <nav class="sticky-nav">
        <div class="nav-container">
            <a href="/" class="brand">Westmount Fundamentals</a>
            <div class="nav-links">
                <a href="/#studies">Studies</a>
                <a href="/#tools">Tools</a>
                <a href="/#guides">Guides</a>
            </div>
        </div>
    </nav>

    <main>
        <header>
            <h1>Warren Buffett's Portfolio 2026: Every Berkshire Hathaway Holding</h1>
            <p class="subtitle">A complete breakdown of what stocks Warren Buffett owns, his sector allocations, and recent buys and sells from the latest 13F filing.</p>
        </header>

        <section class="grid">
            <div class="card">
                <h3>Top 10 Holdings</h3>
                ${top10ChartHtml}
            </div>
            <div class="card">
                <h3>Sector Breakdown</h3>
                ${sectorChartHtml}
            </div>
        </section>

        <section>
            <h2>What Buffett Bought and Sold Recently</h2>
            <p style="margin-bottom: 1rem; color: var(--text-muted);">Recent quarter-over-quarter adjustments in the Berkshire Hathaway portfolio.</p>
            ${activityHtml}
        </section>

        <section>
            <h2>Complete List of Berkshire Hathaway Holdings</h2>
            <p style="margin-bottom: 1rem; color: var(--text-muted);">Every publicly traded equity currently held by Berkshire Hathaway. Data is sourced from recent filings.</p>
            ${holdingsHtml}
        </section>

        <section class="faq-section">
            <h2>Frequently Asked Questions</h2>
            ${faqHtml}
        </section>
    </main>

    <footer>
        <p>&copy; 2026 Westmount Research &middot; A GAB Ventures property.</p>
        <p style="margin-top: 0.5rem; font-size: 0.75rem;">Data for informational purposes only. Not investment advice. All information for educational purposes only.</p>
    </footer>

</body>
</html>`;

fs.writeFileSync('public/warren-buffett-portfolio-2026.html', htmlStr);
console.log("HTML successfully built!");
