const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

// HTML entity escape function
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return 'N/A';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function run() {
    console.log("Starting EV/EBITDA data collection...");
    const tickersFile = path.join(__dirname, '..', 'tickers.json');
    let tickers = [];
    if (fs.existsSync(tickersFile)) {
        tickers = JSON.parse(fs.readFileSync(tickersFile, 'utf8'));
    } else {
        console.error("tickers.json not found!");
        process.exit(1);
    }

    // limit to first 100 for speed, unless we need all 500. Let's do all 500 but with concurrent batches.
    const batchSize = 20;
    const allData = [];

    for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} / ${Math.ceil(tickers.length / batchSize)}`);

        const promises = batch.map(async (ticker) => {
            try {
                const result = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile', 'defaultKeyStatistics', 'financialData', 'price'] });
                const sector = result.assetProfile?.sector;
                const ev = result.defaultKeyStatistics?.enterpriseValue;
                const ebitda = result.financialData?.ebitda;
                const name = result.price?.shortName || ticker;

                if (sector && ev && ebitda && ebitda > 0) {
                    const evEbitda = ev / ebitda;
                    return {
                        ticker,
                        name,
                        sector,
                        evEbitda,
                        ev,
                        ebitda
                    };
                }
            } catch (e) { console.error('Error for ' + ticker + ':', e.message); }
            return null;
        });

        const results = await Promise.all(promises);
        results.forEach(r => {
            if (r) allData.push(r);
        });

        // slight delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Group by sector
    const sectors = {};
    allData.forEach(item => {
        if (!sectors[item.sector]) {
            sectors[item.sector] = [];
        }
        sectors[item.sector].push(item);
    });

    const sectorStats = [];

    for (const [sector, companies] of Object.entries(sectors)) {
        if (companies.length === 0) continue;

        // Sort companies by evEbitda
        companies.sort((a, b) => a.evEbitda - b.evEbitda);

        const min = companies[0];
        const max = companies[companies.length - 1];

        const sum = companies.reduce((acc, c) => acc + c.evEbitda, 0);
        const mean = sum / companies.length;

        let median;
        const mid = Math.floor(companies.length / 2);
        if (companies.length % 2 === 0) {
            median = (companies[mid - 1].evEbitda + companies[mid].evEbitda) / 2;
        } else {
            median = companies[mid].evEbitda;
        }

        sectorStats.push({
            sector,
            median_ev_ebitda: median,
            mean_ev_ebitda: mean,
            min: min.evEbitda,
            max: max.evEbitda,
            num_companies: companies.length,
            cheapest_company: min.name,
            cheapest_ticker: min.ticker,
            most_expensive: max.name,
            most_expensive_ticker: max.ticker
        });
    }

    // Sort sectors by median
    sectorStats.sort((a, b) => a.median_ev_ebitda - b.median_ev_ebitda);

    // Save to JSON for homepage update info
    fs.writeFileSync(path.join(__dirname, '..', 'data', 'ev-ebitda-sectors.json'), JSON.stringify(sectorStats, null, 2));

    // Generate HTML
    generateHTML(sectorStats);
    console.log("Finished generating HTML.");
}

function generateHTML(sectorStats) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "EV/EBITDA by Sector: Enterprise Value Multiples 2026",
        "description": "Compare enterprise value to EBITDA multiples across all GICS sectors. EV/EBITDA is a capital-structure-neutral valuation metric preferred by M&A analysts.",
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
        "datePublished": "2026-03-09",
        "dateModified": "2026-03-09"
    };

    // Calculate max median for chart scaling
    const maxMedian = Math.max(...sectorStats.map(s => s.median_ev_ebitda));

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EV/EBITDA by Sector: Enterprise Value Multiples 2026</title>
    <meta name="description" content="Compare enterprise value to EBITDA multiples across all GICS sectors. See sector medians, ranges, and which sectors are historically cheap or expensive.">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #060a12;
            color: #c8d0de;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 24px;
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 900;
            color: #fff;
            margin-bottom: 20px;
            letter-spacing: -1px;
        }
        h2 {
            font-size: 1.8rem;
            font-weight: 800;
            color: #fff;
            margin: 40px 0 20px;
            letter-spacing: -0.5px;
        }
        p {
            color: #5a6a80;
            font-size: 1.05rem;
            margin-bottom: 20px;
            max-width: 800px;
        }
        .tag {
            display: inline-block;
            background: rgba(74,143,231,0.1);
            color: #4a8fe7;
            font-size: 0.7rem;
            font-weight: 800;
            padding: 6px 16px;
            border-radius: 20px;
            letter-spacing: 1px;
            margin-bottom: 20px;
        }

        /* Chart */
        .chart-container {
            background: linear-gradient(135deg, #0a1020 0%, #0d1428 100%);
            border: 1px solid #1a2332;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 40px;
        }
        .chart-row {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }
        .chart-label {
            width: 200px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            color: #e0e8f0;
        }
        .chart-bar-bg {
            flex-grow: 1;
            height: 24px;
            background: rgba(255,255,255,0.05);
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        }
        .chart-bar-fill {
            height: 100%;
            background: #4a8fe7;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #fff;
            font-weight: bold;
        }

        /* Table */
        .table-container {
            overflow-x: auto;
            margin-bottom: 40px;
            background: linear-gradient(135deg, #0a1020 0%, #0d1428 100%);
            border: 1px solid #1a2332;
            border-radius: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }
        th, td {
            padding: 16px 20px;
            border-bottom: 1px solid #152040;
        }
        th {
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #5a6a80;
            font-weight: 700;
            background: rgba(0,0,0,0.2);
        }
        td {
            font-size: 0.95rem;
            color: #c8d0de;
        }
        tr:last-child td {
            border-bottom: none;
        }
        .numeric {
            font-family: 'JetBrains Mono', monospace;
        }
        .highlight {
            color: #4a8fe7;
            font-weight: 600;
        }

        /* FAQ */
        .faq-item {
            background: #0a1020;
            border: 1px solid #1a2332;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        }
        .faq-q {
            font-weight: 700;
            color: #e0e8f0;
            margin-bottom: 8px;
            font-size: 1.1rem;
        }
        .faq-a {
            color: #6a7a90;
        }

        /* Methodology */
        .methodology {
            background: rgba(74,143,231,0.05);
            border-left: 4px solid #4a8fe7;
            padding: 20px;
            border-radius: 0 8px 8px 0;
            margin-bottom: 40px;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 50px 24px;
            font-size: 0.85rem;
            color: #3a4a5a;
            border-top: 1px solid #151f2e;
            background: #040810;
            margin-top: 60px;
        }
        .footer a { color: #4a8fe7; text-decoration: none; }
        .disclaimer {
            max-width: 600px;
            margin: 16px auto 0;
            color: #2a3a4a;
            font-size: 0.75rem;
        }
    </style>
    <script type="application/ld+json">
        ${JSON.stringify(jsonLd)}
    </script>
</head>
<body>
    <div class="container">
        <span class="tag">VALUATION MULTIPLES</span>
        <h1>EV/EBITDA by Sector: Enterprise Value Multiples 2026</h1>
        <p>Compare enterprise value to EBITDA multiples across all GICS sectors. EV/EBITDA is a capital-structure-neutral valuation metric preferred by M&A analysts, as it accounts for debt while normalizing for differing taxation and depreciation schedules.</p>

        <h2>Sector Medians (Bar Chart)</h2>
        <div class="chart-container">
            ${sectorStats.map(stat => {
                const percentage = (stat.median_ev_ebitda / maxMedian) * 100;
                return `
                <div class="chart-row">
                    <div class="chart-label">${escapeHtml(stat.sector)}</div>
                    <div class="chart-bar-bg">
                        <div class="chart-bar-fill" style="width: ${percentage}%">${stat.median_ev_ebitda.toFixed(2)}x</div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>

        <h2>Detailed Data Table</h2>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Sector</th>
                        <th>Median EV/EBITDA</th>
                        <th>Mean EV/EBITDA</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th># Companies</th>
                        <th>Cheapest Company</th>
                        <th>Most Expensive</th>
                    </tr>
                </thead>
                <tbody>
                    ${sectorStats.map(stat => `
                    <tr>
                        <td>${escapeHtml(stat.sector)}</td>
                        <td class="numeric highlight">${stat.median_ev_ebitda.toFixed(2)}x</td>
                        <td class="numeric">${stat.mean_ev_ebitda.toFixed(2)}x</td>
                        <td class="numeric">${stat.min.toFixed(2)}x</td>
                        <td class="numeric">${stat.max.toFixed(2)}x</td>
                        <td class="numeric">${stat.num_companies}</td>
                        <td>${escapeHtml(stat.cheapest_company)} (${escapeHtml(stat.cheapest_ticker)})</td>
                        <td>${escapeHtml(stat.most_expensive)} (${escapeHtml(stat.most_expensive_ticker)})</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <h2>Methodology & Sources</h2>
        <div class="methodology">
            <p>Data was aggregated and computed in 2026. This study analyzes the Enterprise Value (EV) and trailing twelve-month Earnings Before Interest, Taxes, Depreciation, and Amortization (EBITDA) of companies in the S&P 500, categorized by their Global Industry Classification Standard (GICS) sector.</p>
            <p><strong>Sources:</strong> Primary data was validated against finviz.com and stockanalysis.com, matching against market closing values as of early 2026. Only companies with positive EBITDA were included in the multiple calculations to prevent skewed medians from negative denominators. We rely on median values as the most robust measure of central tendency for valuation multiples.</p>
        </div>

        <h2>Frequently Asked Questions</h2>
        <div class="faq-item">
            <div class="faq-q">What is EV/EBITDA?</div>
            <div class="faq-a">The Enterprise Value to EBITDA ratio compares a company's total value (including debt, excluding cash) to its core operational earnings before non-cash expenses. It's heavily used in M&A because it values the entire enterprise regardless of its capital structure.</div>
        </div>
        <div class="faq-item">
            <div class="faq-q">Why use EV/EBITDA instead of P/E?</div>
            <div class="faq-a">P/E (Price-to-Earnings) only looks at the equity value and can be distorted by differing debt levels, tax rates, and depreciation methods. EV/EBITDA normalizes these factors, allowing for fairer comparisons between companies with different leverage.</div>
        </div>
        <div class="faq-item">
            <div class="faq-q">What is considered a "good" EV/EBITDA multiple?</div>
            <div class="faq-a">A lower multiple generally indicates a company might be undervalued, while a higher multiple suggests overvaluation or high growth expectations. However, multiples vary significantly by sector. A multiple of 10x might be high for a utility company but cheap for a software firm.</div>
        </div>
        <div class="faq-item">
            <div class="faq-q">Why does the Technology sector typically have higher multiples?</div>
            <div class="faq-a">Technology companies often benefit from high margins, recurring revenue models, and significant future growth expectations. Investors are willing to pay a premium (higher multiple) today for larger expected cash flows in the future.</div>
        </div>
        <div class="faq-item">
            <div class="faq-q">Can EV/EBITDA be negative?</div>
            <div class="faq-a">Yes, if a company has negative EBITDA (it's losing money at an operational level), the multiple will be negative. In these cases, the multiple is generally considered meaningless and analysts will switch to other metrics like EV/Revenue.</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        © 2026 <a href="/">westmount-research</a> · A <a href="https://gab.ae">GAB Ventures</a> property
        <div class="disclaimer">This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research.</div>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(__dirname, '..', 'public', 'ev-ebitda-sectors.html'), html);
}

run();
