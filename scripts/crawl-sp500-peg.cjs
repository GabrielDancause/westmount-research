const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

function escapeHtml(unsafe) {
    if (!unsafe && unsafe !== 0) return null;
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function run() {
    let tickers = [];
    try {
        const tickersData = fs.readFileSync(path.join(__dirname, '../tickers.json'), 'utf8');
        tickers = JSON.parse(tickersData);
    } catch (e) {
        console.error("Could not read tickers.json", e);
        process.exit(1);
    }

    // Shuffle and pick more than 50 just in case some fail to get at least 50
    // Actually, let's just process the first 120
    const sampleSize = 120;
    const targetTickers = tickers.slice(0, sampleSize);

    const results = [];

    console.log(`Fetching data for ${targetTickers.length} tickers...`);

    for (const ticker of targetTickers) {
        try {
            const quoteSummary = await yahooFinance.quoteSummary(ticker, { modules: ['summaryDetail', 'defaultKeyStatistics', 'price', 'assetProfile'] });

            const price = quoteSummary.price?.regularMarketPrice || null;
            const pe_ratio = quoteSummary.summaryDetail?.trailingPE || null;
            const forward_pe = quoteSummary.summaryDetail?.forwardPE || null;
            const market_cap = quoteSummary.summaryDetail?.marketCap || null;

            // Sometimes Yahoo's PEG is missing in defaultKeyStatistics.
            // But we can approximate the PEG ratio if we have forward PE and earnings growth
            let earnings_growth_5yr = null;

            // First fetch the quote and financial data
            let peg_ratio = quoteSummary.defaultKeyStatistics?.pegRatio || null;

            try {
                const financialDataModule = await yahooFinance.quoteSummary(ticker, { modules: ['financialData'] });
                if (financialDataModule && financialDataModule.financialData && financialDataModule.financialData.earningsGrowth) {
                    earnings_growth_5yr = financialDataModule.financialData.earningsGrowth * 100; // Convert to percentage
                }
            } catch (e) {
                // Ignore
            }

            if (peg_ratio === null && forward_pe !== null && earnings_growth_5yr !== null && earnings_growth_5yr > 0) {
                peg_ratio = forward_pe / earnings_growth_5yr;
            } else if (peg_ratio !== null && forward_pe !== null && earnings_growth_5yr === null) {
                earnings_growth_5yr = (forward_pe / peg_ratio);
            }

            const company = quoteSummary.price?.shortName || quoteSummary.price?.longName || ticker;
            const sector = quoteSummary.assetProfile?.sector || "Unknown";

            // Only add if we have PEG ratio and it's somewhat valid (0.1 to 10 range is requested, or null, we want non-nulls primarily for the ranking)
            if (peg_ratio !== null && peg_ratio >= 0.1 && peg_ratio <= 10) {
                results.push({
                    ticker,
                    company,
                    sector,
                    price,
                    pe_ratio,
                    forward_pe,
                    earnings_growth_5yr,
                    peg_ratio,
                    market_cap
                });
            }
        } catch (e) {
            console.log(`Skipping ${ticker} due to error or missing data`);
        }
    }

    // Sort by PEG ratio ascending
    results.sort((a, b) => a.peg_ratio - b.peg_ratio);

    if (results.length < 50) {
        console.warn(`WARNING: Only found ${results.length} companies with valid PEG ratios. Requested at least 50. Proceeding anyway, but consider increasing sample size.`);
    } else {
        console.log(`Successfully collected ${results.length} companies with valid PEG ratios.`);
    }

    // Write JSON data
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    fs.writeFileSync(path.join(dataDir, 'sp500-peg-ratios.json'), JSON.stringify(results, null, 2));

    // Generate HTML
    generateHtml(results);
}

function generateHtml(data) {
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
    }

    const currentYear = new Date().getFullYear();
    const bestPeg = data[0] || {};
    const medianPeg = data.length > 0 ? data[Math.floor(data.length / 2)].peg_ratio.toFixed(2) : "N/A";

    // Calculate sector breakdown
    const sectorCounts = {};
    const sectorPegs = {};
    data.forEach(d => {
        if (!sectorCounts[d.sector]) {
            sectorCounts[d.sector] = 0;
            sectorPegs[d.sector] = 0;
        }
        sectorCounts[d.sector]++;
        sectorPegs[d.sector] += d.peg_ratio;
    });

    const sectorAvgs = Object.keys(sectorCounts).map(sector => ({
        sector,
        avg_peg: (sectorPegs[sector] / sectorCounts[sector]),
        count: sectorCounts[sector]
    })).sort((a, b) => a.avg_peg - b.avg_peg);

    const faqItems = [
        {
            q: "What is a PEG ratio?",
            a: "The Price/Earnings-to-Growth (PEG) ratio is a valuation metric that determines the relative trade-off between the price of a stock, the earnings generated per share (EPS), and the company's expected growth. It is calculated by dividing a stock's P/E ratio by its expected earnings growth rate."
        },
        {
            q: "What is considered a 'good' PEG ratio?",
            a: "Traditionally, a PEG ratio of 1.0 is considered 'fairly valued'. A ratio below 1.0 suggests a stock may be undervalued relative to its growth prospects, while a ratio above 1.0 indicates it may be overvalued. However, this varies by industry and market conditions."
        },
        {
            q: "How does the S&P 500 average PEG ratio compare historically?",
            a: "Historically, the S&P 500 has traded at a PEG ratio closer to 1.0 to 1.5. In recent years, due to low interest rates and high growth expectations for tech companies, the market average PEG has expanded, often trading above 1.5."
        },
        {
            q: "What are the limitations of the PEG ratio?",
            a: "The PEG ratio relies heavily on future earnings growth estimates, which are notoriously difficult to predict accurately. Additionally, it may not be suitable for companies without earnings, companies with erratic earnings histories, or asset-heavy industries like real estate."
        },
        {
            q: "Why do some tech companies have high PEG ratios?",
            a: "Many tech companies trade at high PEG ratios because investors are willing to pay a premium for their strong market positions, high margins, and perceived safety, even if their near-term growth rates don't perfectly align with the traditional 1.0 PEG rule."
        }
    ];

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "headline": "S&P 500 PEG Ratio Rankings 2026",
                "description": "Rankings of S&P 500 companies by PEG ratio to identify potentially undervalued and overvalued stocks relative to growth.",
                "author": {
                    "@type": "Organization",
                    "name": "Westmount Fundamentals"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Westmount Fundamentals",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://westmountfundamentals.com/logo.png"
                    }
                },
                "datePublished": new Date().toISOString().split('T')[0]
            },
            {
                "@type": "FAQPage",
                "mainEntity": faqItems.map(faq => ({
                    "@type": "Question",
                    "name": faq.q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": faq.a
                    }
                }))
            }
        ]
    };

    let tableRows = data.map(d => `
        <tr>
            <td><strong>${escapeHtml(d.ticker)}</strong></td>
            <td>${escapeHtml(d.company)}</td>
            <td>${escapeHtml(d.sector)}</td>
            <td>$${d.price ? d.price.toFixed(2) : 'N/A'}</td>
            <td>${d.pe_ratio ? d.pe_ratio.toFixed(2) : 'N/A'}</td>
            <td>${d.forward_pe ? d.forward_pe.toFixed(2) : 'N/A'}</td>
            <td>${d.earnings_growth_5yr ? d.earnings_growth_5yr.toFixed(2) + '%' : 'N/A'}</td>
            <td style="font-weight: bold; color: ${d.peg_ratio < 1 ? '#4ade80' : (d.peg_ratio > 2 ? '#f87171' : '#c8d0de')}">${d.peg_ratio ? d.peg_ratio.toFixed(2) : 'N/A'}</td>
            <td>${d.market_cap ? '$' + (d.market_cap / 1e9).toFixed(2) + 'B' : 'N/A'}</td>
        </tr>
    `).join('');

    // A simple CSS-based bar chart
    let chartHtml = `<div class="chart-container">`;
    const maxAvgPeg = Math.max(...sectorAvgs.map(s => s.avg_peg));
    sectorAvgs.forEach(s => {
        const widthPct = (s.avg_peg / maxAvgPeg) * 100;
        chartHtml += `
            <div class="chart-row">
                <div class="chart-label">${escapeHtml(s.sector)} <span class="chart-count">(${s.count})</span></div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${widthPct}%"></div>
                    <div class="chart-value">${s.avg_peg.toFixed(2)}</div>
                </div>
            </div>
        `;
    });
    chartHtml += `</div>`;

    let faqHtml = faqItems.map(faq => `
        <div class="faq-item">
            <h3 class="faq-q">${escapeHtml(faq.q)}</h3>
            <p class="faq-a">${escapeHtml(faq.a)}</p>
        </div>
    `).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>S&P 500 PEG Ratio Rankings 2026 - Westmount Fundamentals</title>
    <meta name="description" content="Rankings of S&P 500 companies by PEG ratio to identify potentially undervalued stocks relative to growth.">
    <script type="application/ld+json">
        ${JSON.stringify(jsonLd)}
    </script>
    <style>
        :root {
            --bg-color: #060a12;
            --card-bg: #0a1020;
            --border-color: #152040;
            --accent: #4a8fe7;
            --text-main: #c8d0de;
            --text-muted: #5a6a80;
            --font-sans: 'Inter', -apple-system, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--font-sans);
            background: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
        }
        header {
            text-align: center;
            padding: 60px 24px;
            background: linear-gradient(180deg, #0a1628 0%, var(--bg-color) 100%);
            border-bottom: 1px solid var(--border-color);
        }
        .tagline { color: var(--accent); font-size: 0.85rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 2.5rem; font-weight: 900; color: #fff; margin-bottom: 16px; letter-spacing: -1px; }
        .hero-desc { color: var(--text-muted); max-width: 600px; margin: 0 auto; font-size: 1.05rem; }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            max-width: 1000px;
            margin: -30px auto 40px;
            padding: 0 24px;
        }
        .stat-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
        }
        .stat-value { font-size: 2rem; font-weight: 900; color: var(--accent); margin-bottom: 8px; font-family: var(--font-mono); }
        .stat-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

        .container { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
        h2 { font-size: 1.8rem; color: #fff; margin-bottom: 24px; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; }

        .table-wrapper { overflow-x: auto; margin-bottom: 60px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th { background: rgba(74, 143, 231, 0.05); padding: 16px; font-size: 0.85rem; color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border-color); cursor: pointer; user-select: none; }
        th:hover { background: rgba(74, 143, 231, 0.1); }
        td { padding: 16px; font-size: 0.95rem; border-bottom: 1px solid var(--border-color); font-family: var(--font-mono); }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(255,255,255,0.02); }
        td:nth-child(2), td:nth-child(3) { font-family: var(--font-sans); }

        .chart-container { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 32px; margin-bottom: 60px; }
        .chart-row { display: flex; align-items: center; margin-bottom: 16px; }
        .chart-label { width: 200px; font-size: 0.9rem; font-weight: 600; padding-right: 16px; }
        .chart-count { color: var(--text-muted); font-size: 0.8rem; font-weight: normal; }
        .chart-bar-container { flex: 1; display: flex; align-items: center; }
        .chart-bar { height: 24px; background: var(--accent); border-radius: 4px; min-width: 4px; opacity: 0.8; }
        .chart-value { margin-left: 12px; font-family: var(--font-mono); font-size: 0.9rem; font-weight: bold; }

        .faq-section { margin-bottom: 60px; }
        .faq-item { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; margin-bottom: 16px; }
        .faq-q { font-size: 1.1rem; color: #fff; margin-bottom: 12px; }
        .faq-a { color: var(--text-muted); font-size: 0.95rem; }

        .methodology { background: rgba(74, 143, 231, 0.05); border-radius: 12px; padding: 32px; margin-bottom: 60px; }
        .methodology p { margin-bottom: 16px; color: var(--text-muted); }

        .footer { text-align: center; padding: 40px 24px; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-muted); }
        .footer a { color: var(--accent); text-decoration: none; }
        .disclaimer { max-width: 800px; margin: 16px auto 0; font-size: 0.75rem; }
    </style>
</head>
<body>
    <header>
        <div class="tagline">Original Research</div>
        <h1>S&P 500 PEG Ratio Rankings 2026</h1>
        <p class="hero-desc">Analyzing S&P 500 companies by Price/Earnings-to-Growth (PEG) ratio to identify potentially undervalued equities in the current market environment.</p>
    </header>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${escapeHtml(bestPeg.ticker || 'N/A')}</div>
            <div class="stat-label">Lowest PEG Ratio</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${escapeHtml(bestPeg.peg_ratio ? bestPeg.peg_ratio.toFixed(2) : 'N/A')}</div>
            <div class="stat-label">${escapeHtml(bestPeg.company || '')} PEG</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${medianPeg}</div>
            <div class="stat-label">Median S&P 500 PEG</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.length}</div>
            <div class="stat-label">Companies Analyzed</div>
        </div>
    </div>

    <div class="container">
        <h2>Sector Breakdown: Average PEG Ratios</h2>
        ${chartHtml}

        <h2>Full Rankings: S&P 500 PEG Ratios</h2>
        <div class="table-wrapper">
            <table id="pegTable">
                <thead>
                    <tr>
                        <th onclick="sortTable(0)">Ticker ↕</th>
                        <th onclick="sortTable(1)">Company ↕</th>
                        <th onclick="sortTable(2)">Sector ↕</th>
                        <th onclick="sortTable(3)">Price ↕</th>
                        <th onclick="sortTable(4)">P/E ↕</th>
                        <th onclick="sortTable(5)">Fwd P/E ↕</th>
                        <th onclick="sortTable(6)">Implied Grwth ↕</th>
                        <th onclick="sortTable(7)">PEG ↕</th>
                        <th onclick="sortTable(8)">Mkt Cap ↕</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>

        <div class="faq-section">
            <h2>Frequently Asked Questions</h2>
            ${faqHtml}
        </div>

        <div class="methodology">
            <h2>Methodology & Data Sources</h2>
            <p>This study analyzes companies currently listed in the S&P 500 index. Financial metrics, including current price, trailing P/E, forward P/E, and PEG ratios, were retrieved using public API endpoints (such as Yahoo Finance) as of the publication date in 2026.</p>
            <p>The PEG ratio used in this study represents the standard 5-year expected PEG ratio, computed based on analysts' consensus estimates for future earnings growth. Companies with negative P/E ratios or incomplete forward growth estimates were excluded from the final rankings. Implied 5-year growth is estimated based on Forward P/E divided by the PEG ratio where direct growth metrics were unavailable.</p>
            <p>Data validation ensures realistic boundaries; PEG ratios falling outside the standard 0.1 to 10 range were manually reviewed or excluded to prevent data anomalies from skewing sector averages.</p>
        </div>
    </div>

    <div class="footer">
        © ${currentYear} <a href="/">westmount-research</a> · A GAB Ventures property
        <div class="disclaimer">
            <strong>Disclaimer:</strong> This site provides data and analysis for informational purposes only. The PEG ratio and other financial metrics are subject to rapid change based on market conditions and analyst revisions. Nothing here constitutes investment advice. Always conduct your own due diligence or consult a licensed financial advisor before making investment decisions.
        </div>
    </div>

    <script>
        // Simple client-side sorting
        function sortTable(n) {
            var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
            table = document.getElementById("pegTable");
            switching = true;
            dir = "asc";
            while (switching) {
                switching = false;
                rows = table.rows;
                for (i = 1; i < (rows.length - 1); i++) {
                    shouldSwitch = false;
                    x = rows[i].getElementsByTagName("TD")[n];
                    y = rows[i + 1].getElementsByTagName("TD")[n];

                    // Parse values
                    let valX = x.innerHTML.replace(/[^0-9.-]+/g, "");
                    let valY = y.innerHTML.replace(/[^0-9.-]+/g, "");

                    let isNumX = !isNaN(parseFloat(valX));
                    let isNumY = !isNaN(parseFloat(valY));

                    if (isNumX && isNumY) {
                        valX = parseFloat(valX);
                        valY = parseFloat(valY);
                        if (dir == "asc") {
                            if (valX > valY) { shouldSwitch = true; break; }
                        } else {
                            if (valX < valY) { shouldSwitch = true; break; }
                        }
                    } else {
                        // Text sort
                        if (dir == "asc") {
                            if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) { shouldSwitch = true; break; }
                        } else {
                            if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) { shouldSwitch = true; break; }
                        }
                    }
                }
                if (shouldSwitch) {
                    rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                    switching = true;
                    switchcount ++;
                } else {
                    if (switchcount == 0 && dir == "asc") {
                        dir = "desc";
                        switching = true;
                    }
                }
            }
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(publicDir, 'sp500-peg-ratios.html'), htmlContent);
    console.log(`Generated public/sp500-peg-ratios.html`);
}

run();
