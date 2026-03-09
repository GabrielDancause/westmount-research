const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

// HTML Escaping
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function formatCurrency(num) {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + num.toLocaleString();
}

function formatPercent(num) {
    if (num === null || num === undefined) return 'N/A';
    return (num * 100).toFixed(2) + '%';
}

async function run() {
    console.log("Starting script...");
    const tickersPath = path.join(__dirname, '../tickers.json');
    const tickers = JSON.parse(fs.readFileSync(tickersPath, 'utf-8'));

    const results = [];
    const batchSize = 10;

    for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} / ${Math.ceil(tickers.length / batchSize)}...`);

        await Promise.all(batch.map(async (ticker) => {
            try {
                const quote = await yahooFinance.quoteSummary(ticker, {
                    modules: ['summaryProfile', 'financialData', 'price', 'summaryDetail']
                });

                const fd = quote.financialData || {};
                const sp = quote.summaryProfile || {};
                const price = quote.price || {};
                const sd = quote.summaryDetail || {};

                const company = price.shortName || price.longName || null;
                const sector = sp.sector || null;
                const marketCap = price.marketCap || sd.marketCap || null;
                const freeCashFlow = fd.freeCashflow || null;
                const revenue = fd.totalRevenue || null;
                const dividendYield = sd.dividendYield || null;

                if (marketCap && freeCashFlow && marketCap > 0) {
                    const fcfYield = freeCashFlow / marketCap;
                    const fcfMargin = revenue ? freeCashFlow / revenue : null;

                    results.push({
                        ticker,
                        company: escapeHtml(company),
                        sector: escapeHtml(sector),
                        market_cap: marketCap,
                        free_cash_flow: freeCashFlow,
                        fcf_yield: fcfYield,
                        revenue: revenue,
                        fcf_margin: fcfMargin,
                        dividend_yield: dividendYield
                    });
                }
            } catch (err) {
                console.error(`Error fetching data for ${ticker}: ${err.message}`);
            }
        }));

        // Sleep to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
    }

    // Sort and filter top 50
    results.sort((a, b) => b.fcf_yield - a.fcf_yield);
    const top50 = results.slice(0, 50);

    const highestYield = top50[0] ? top50[0].fcf_yield : 0;

    fs.writeFileSync(path.join(__dirname, 'highest_yield.json'), JSON.stringify({ yield: highestYield }));

    // Sector chart data
    const sectorCounts = {};
    top50.forEach(r => {
        if (r.sector) {
            sectorCounts[r.sector] = (sectorCounts[r.sector] || 0) + 1;
        }
    });

    const sortedSectors = Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // top 5 sectors

    const maxSectorCount = sortedSectors.length > 0 ? sortedSectors[0][1] : 1;

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Free Cash Flow Yield: Top 50 S&P 500 Companies 2026</title>
    <meta name="description" content="Rankings of the top 50 S&P 500 companies by Free Cash Flow (FCF) Yield in 2026. Discover value stocks generating the most cash relative to their price.">
    <style>
        :root {
            --bg: #060a12;
            --card: #0a1020;
            --border: #152040;
            --accent: #4a8fe7;
            --text-main: #c8d0de;
            --text-muted: #5a6a80;
            --positive: #22c55e;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text-main); line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }

        /* Hero Section */
        header { text-align: center; margin-bottom: 60px; padding: 60px 0; border-bottom: 1px solid var(--border); }
        .tag { display: inline-block; background: rgba(74, 143, 231, 0.1); color: var(--accent); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; margin-bottom: 16px; }
        h1 { font-size: 3rem; font-weight: 900; color: #fff; margin-bottom: 16px; letter-spacing: -1px; }
        .subtitle { font-size: 1.2rem; color: var(--text-muted); max-width: 600px; margin: 0 auto; }

        /* Hero Stats */
        .hero-stats { display: flex; justify-content: center; gap: 40px; margin-top: 40px; }
        .stat-box { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; min-width: 200px; }
        .stat-value { font-size: 2.5rem; font-weight: 900; color: var(--accent); display: block; }
        .stat-label { font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

        /* Chart */
        .chart-section { margin-bottom: 60px; background: var(--card); padding: 40px; border-radius: 16px; border: 1px solid var(--border); }
        h2 { font-size: 2rem; color: #fff; margin-bottom: 24px; }
        .bar-container { margin-bottom: 16px; }
        .bar-label { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem; }
        .bar-wrapper { background: var(--border); height: 24px; border-radius: 12px; overflow: hidden; }
        .bar-fill { background: var(--accent); height: 100%; border-radius: 12px; transition: width 1s ease; }

        /* Table */
        .table-container { overflow-x: auto; margin-bottom: 60px; background: var(--card); border-radius: 16px; border: 1px solid var(--border); }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th { background: rgba(21, 32, 64, 0.5); padding: 16px 20px; font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); cursor: pointer; white-space: nowrap; }
        th:hover { color: #fff; }
        td { padding: 16px 20px; border-bottom: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(74, 143, 231, 0.05); }
        .ticker { font-weight: 700; color: #fff; }
        .company { font-family: 'Inter', sans-serif; }
        .yield-col { color: var(--accent); font-weight: 700; }

        /* FAQ */
        .faq, .methodology { margin-bottom: 60px; max-width: 800px; }
        .faq-item { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
        .faq-q { font-size: 1.2rem; font-weight: 700; color: #fff; margin-bottom: 12px; }
        .faq-a { color: var(--text-muted); line-height: 1.7; }

        .methodology p { margin-bottom: 16px; color: var(--text-muted); }

        footer { text-align: center; padding: 40px 0; border-top: 1px solid var(--border); color: var(--text-muted); font-size: 0.9rem; }
        footer a { color: var(--accent); text-decoration: none; }
    </style>
    <!-- JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Free Cash Flow Yield: Top 50 S&P 500 Companies 2026",
      "description": "Rankings of the top 50 S&P 500 companies by Free Cash Flow (FCF) Yield in 2026. Discover value stocks generating the most cash relative to their price.",
      "author": {
        "@type": "Organization",
        "name": "Westmount Fundamentals",
        "url": "https://westmountfundamentals.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Westmount Fundamentals",
        "logo": {
          "@type": "ImageObject",
          "url": "https://westmountfundamentals.com/favicon.svg"
        }
      },
      "datePublished": "2026-03-01",
      "dateModified": "2026-03-01",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://westmountfundamentals.com/free-cash-flow-yield"
      }
    }
    </script>
</head>
<body>

    <header>
        <div class="container">
            <span class="tag">ORIGINAL RESEARCH</span>
            <h1>Top 50 S&P 500 Companies by FCF Yield</h1>
            <p class="subtitle">Ranking the market's cash cows. Free Cash Flow Yield reveals how much actual cash a company generates relative to its valuation.</p>

            <div class="hero-stats">
                <div class="stat-box">
                    <span class="stat-value">${formatPercent(highestYield)}</span>
                    <span class="stat-label">Highest FCF Yield</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">50</span>
                    <span class="stat-label">Companies Tracked</span>
                </div>
            </div>
        </div>
    </header>

    <div class="container">
        <!-- Sector Chart -->
        <section class="chart-section">
            <h2>Top Sectors by FCF Yield Representation</h2>
            <div class="chart-container">
                ${sortedSectors.map(([sector, count]) => `
                <div class="bar-container">
                    <div class="bar-label">
                        <span>${sector}</span>
                        <span>${count} companies</span>
                    </div>
                    <div class="bar-wrapper">
                        <div class="bar-fill" style="width: ${(count / maxSectorCount) * 100}%"></div>
                    </div>
                </div>
                `).join('')}
            </div>
        </section>

        <!-- Table -->
        <section class="table-container">
            <table id="fcfTable">
                <thead>
                    <tr>
                        <th onclick="sortTable(0, 'str')">Ticker ↕</th>
                        <th onclick="sortTable(1, 'str')">Company ↕</th>
                        <th onclick="sortTable(2, 'str')">Sector ↕</th>
                        <th onclick="sortTable(3, 'num')">Market Cap ↕</th>
                        <th onclick="sortTable(4, 'num')">Free Cash Flow ↕</th>
                        <th onclick="sortTable(5, 'num')">FCF Yield ↕</th>
                        <th onclick="sortTable(6, 'num')">Revenue ↕</th>
                        <th onclick="sortTable(7, 'num')">FCF Margin ↕</th>
                        <th onclick="sortTable(8, 'num')">Div Yield ↕</th>
                    </tr>
                </thead>
                <tbody>
                    ${top50.map(r => `
                    <tr>
                        <td class="ticker">${r.ticker}</td>
                        <td class="company">${r.company || 'N/A'}</td>
                        <td>${r.sector || 'N/A'}</td>
                        <td data-val="${r.market_cap || 0}">${formatCurrency(r.market_cap)}</td>
                        <td data-val="${r.free_cash_flow || 0}">${formatCurrency(r.free_cash_flow)}</td>
                        <td class="yield-col" data-val="${r.fcf_yield || 0}">${formatPercent(r.fcf_yield)}</td>
                        <td data-val="${r.revenue || 0}">${formatCurrency(r.revenue)}</td>
                        <td data-val="${r.fcf_margin || 0}">${formatPercent(r.fcf_margin)}</td>
                        <td data-val="${r.dividend_yield || 0}">${formatPercent(r.dividend_yield)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </section>

        <!-- Methodology -->
        <section class="methodology">
            <h2>Methodology</h2>
            <p>This study ranks companies currently in the S&P 500 index by their Free Cash Flow Yield.</p>
            <p><strong>Free Cash Flow (FCF)</strong> is calculated as Operating Cash Flow minus Capital Expenditures. It represents the cash a company generates after maintaining or expanding its asset base.</p>
            <p><strong>FCF Yield</strong> is calculated by dividing the trailing 12-month Free Cash Flow by the current Market Capitalization. We prioritize null over estimated or fake data when figures are unavailable.</p>
        </section>

        <!-- FAQ -->
        <section class="faq">
            <h2>Frequently Asked Questions</h2>

            <div class="faq-item">
                <div class="faq-q">What is Free Cash Flow Yield?</div>
                <div class="faq-a">Free Cash Flow Yield is a financial solvency ratio that compares the free cash flow per share a company is expected to earn against its market value per share. It's calculated by taking the free cash flow and dividing it by the enterprise value or market cap.</div>
            </div>

            <div class="faq-item">
                <div class="faq-q">Why is FCF Yield better than Earnings Yield?</div>
                <div class="faq-a">Earnings (Net Income) can be heavily influenced by accounting practices, depreciation, and non-cash items. Free Cash Flow represents actual, cold hard cash entering the business, making it much harder to manipulate and a purer measure of profitability.</div>
            </div>

            <div class="faq-item">
                <div class="faq-q">What is a "good" FCF Yield?</div>
                <div class="faq-a">Generally, an FCF Yield above the risk-free rate (like the 10-year Treasury yield) plus an equity risk premium is considered good. Historically, a yield above 4-5% suggests a company might be undervalued, while anything above 8-10% is exceptionally high (though it may signal underlying risks).</div>
            </div>

            <div class="faq-item">
                <div class="faq-q">What does a negative FCF Yield mean?</div>
                <div class="faq-a">A negative FCF Yield means the company is burning more cash than it generates. This is common in fast-growing tech companies investing heavily in their future, but for mature companies, it can be a major red flag indicating financial distress.</div>
            </div>

            <div class="faq-item">
                <div class="faq-q">How does Warren Buffett use FCF?</div>
                <div class="faq-a">Warren Buffett famously uses what he calls "Owner Earnings," which is closely related to Free Cash Flow. He looks for companies that generate consistent, growing cash flows that don't require massive ongoing capital expenditures to maintain their competitive position.</div>
            </div>
        </section>
    </div>

    <footer>
        <div class="container">
            <p>© 2026 <a href="/">westmount-research</a> · A GAB Ventures property</p>
            <p style="font-size: 0.75rem; margin-top: 10px; color: #3a4a5a;">This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research.</p>
        </div>
    </footer>

    <!-- Sorting Script -->
    <script>
        let sortDirections = Array(9).fill(1);

        function sortTable(columnIndex, type) {
            const table = document.getElementById("fcfTable");
            const tbody = table.tBodies[0];
            const rows = Array.from(tbody.querySelectorAll("tr"));

            const direction = sortDirections[columnIndex];
            sortDirections[columnIndex] *= -1; // Toggle direction

            rows.sort((a, b) => {
                const aCell = a.cells[columnIndex];
                const bCell = b.cells[columnIndex];

                let aVal, bVal;

                if (type === 'num') {
                    aVal = parseFloat(aCell.getAttribute('data-val')) || 0;
                    bVal = parseFloat(bCell.getAttribute('data-val')) || 0;
                    return (aVal - bVal) * direction;
                } else {
                    aVal = aCell.textContent.trim().toLowerCase();
                    bVal = bCell.textContent.trim().toLowerCase();
                    if (aVal < bVal) return -1 * direction;
                    if (aVal > bVal) return 1 * direction;
                    return 0;
                }
            });

            tbody.append(...rows);
        }
    </script>
</body>
</html>`;

    const outPath = path.join(__dirname, '../public/free-cash-flow-yield.html');
    fs.writeFileSync(outPath, html);
    console.log(`Generated HTML saved to ${outPath}`);
}

run();
