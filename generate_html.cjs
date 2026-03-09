const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/share-dilution.json', 'utf8'));

// Filter out companies that are missing a market cap or those where we can't be sure
const validData = data.filter(d => d.market_cap && d.shares_5yr_ago && d.shares_current);
validData.sort((a,b) => b.change_pct - a.change_pct);

const diluters = validData.filter(d => d.change_pct > 0);
const reducers = validData.filter(d => d.change_pct < 0).reverse();

function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toString();
}

const currentYear = new Date().getFullYear();

// Build HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Share Dilution Rankings 2026: The Worst Diluters vs. Best Reducers</title>
    <meta name="description" content="We tracked the 5-year share count changes for major US companies to find the worst stock diluters and the best share reducers in 2026.">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #060a12;
            color: #c8d0de;
            line-height: 1.6;
        }

        /* Layout */
        .container { max-width: 1000px; margin: 0 auto; padding: 40px 24px; }
        header { margin-bottom: 40px; text-align: center; }
        h1 { font-size: 2.5rem; font-weight: 900; color: #fff; margin-bottom: 16px; letter-spacing: -1px; }
        h2 { font-size: 1.8rem; font-weight: 800; color: #fff; margin: 40px 0 20px; border-bottom: 1px solid #152040; padding-bottom: 10px; }
        p.subtitle { font-size: 1.1rem; color: #5a6a80; max-width: 700px; margin: 0 auto; }

        /* Cards */
        .card {
            background: #0a1020;
            border: 1px solid #152040;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
        }

        /* Table */
        .table-wrapper { overflow-x: auto; margin-bottom: 40px; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th, td { padding: 12px 16px; border-bottom: 1px solid #152040; }
        th { font-size: 0.85rem; text-transform: uppercase; color: #5a6a80; font-weight: 700; letter-spacing: 0.5px; }
        td { font-size: 0.95rem; }
        tr:hover { background: rgba(74, 143, 231, 0.05); }
        .ticker { color: #4a8fe7; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .diluter-value { color: #f87171; font-weight: 700; }
        .reducer-value { color: #4ade80; font-weight: 700; }

        /* Nav/Breadcrumb */
        .breadcrumb { font-size: 0.85rem; margin-bottom: 20px; }
        .breadcrumb a { color: #4a8fe7; text-decoration: none; }
        .breadcrumb a:hover { text-decoration: underline; }

        /* Histogram placeholder styling */
        .histogram-container {
            display: flex;
            align-items: flex-end;
            height: 200px;
            gap: 4px;
            margin: 20px 0;
            padding-bottom: 20px;
            border-bottom: 1px solid #152040;
            overflow-x: auto;
        }
        .bar-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            min-width: 30px;
        }
        .bar {
            width: 100%;
            border-radius: 2px 2px 0 0;
            transition: height 0.3s;
        }
        .bar-label {
            font-size: 0.7rem;
            color: #5a6a80;
            margin-top: 8px;
            transform: rotate(-45deg);
            white-space: nowrap;
        }
        .bar.dilute { background: #f87171; }
        .bar.reduce { background: #4ade80; }

        /* FAQ */
        .faq-item { margin-bottom: 20px; }
        .faq-q { font-weight: 700; color: #fff; margin-bottom: 8px; }
        .faq-a { color: #c8d0de; font-size: 0.95rem; }

        /* Footer */
        footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #152040; text-align: center; font-size: 0.85rem; color: #5a6a80; }
        .disclaimer { margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="breadcrumb">
            <a href="/">← Back to Home</a>
        </div>

        <header>
            <h1>Share Dilution Rankings 2026</h1>
            <p class="subtitle">Tracking the 5-year share count changes for S&P 500 companies. Which companies are diluting shareholders, and which are buying back stock?</p>
        </header>

        <div class="card">
            <h2>The Dilution vs. Buyback Landscape</h2>
            <p>Over the past 5 years, we analyzed the share counts of ${validData.length} major companies. Here is the distribution of companies by their 5-year share count change:</p>

            <div class="histogram-container">
                <!-- Simple static histogram -->
                <div class="bar-group" title="Extreme Dilution (>50%)">
                    <div class="bar dilute" style="height: ${Math.max(10, diluters.filter(d=>d.change_pct>50).length * 2)}px;"></div>
                    <span class="bar-label">&gt;50%</span>
                </div>
                <div class="bar-group" title="High Dilution (20-50%)">
                    <div class="bar dilute" style="height: ${Math.max(10, diluters.filter(d=>d.change_pct<=50 && d.change_pct>20).length * 2)}px;"></div>
                    <span class="bar-label">20-50%</span>
                </div>
                <div class="bar-group" title="Moderate Dilution (5-20%)">
                    <div class="bar dilute" style="height: ${Math.max(10, diluters.filter(d=>d.change_pct<=20 && d.change_pct>5).length * 2)}px;"></div>
                    <span class="bar-label">5-20%</span>
                </div>
                <div class="bar-group" title="Low Dilution (0-5%)">
                    <div class="bar dilute" style="height: ${Math.max(10, diluters.filter(d=>d.change_pct<=5 && d.change_pct>0).length * 2)}px;"></div>
                    <span class="bar-label">0-5%</span>
                </div>
                <div class="bar-group" title="Low Reduction (-5-0%)">
                    <div class="bar reduce" style="height: ${Math.max(10, reducers.filter(d=>d.change_pct<0 && d.change_pct>=-5).length * 2)}px;"></div>
                    <span class="bar-label">-5-0%</span>
                </div>
                <div class="bar-group" title="Moderate Reduction (-20--5%)">
                    <div class="bar reduce" style="height: ${Math.max(10, reducers.filter(d=>d.change_pct<-5 && d.change_pct>=-20).length * 2)}px;"></div>
                    <span class="bar-label">-20 to -5%</span>
                </div>
                <div class="bar-group" title="High Reduction (<-20%)">
                    <div class="bar reduce" style="height: ${Math.max(10, reducers.filter(d=>d.change_pct<-20).length * 2)}px;"></div>
                    <span class="bar-label">&lt; -20%</span>
                </div>
            </div>
            <p style="font-size: 0.85rem; color: #5a6a80; text-align: center;">Distribution of 5-year share count change (%)</p>
        </div>

        <h2>Worst Share Diluters (5-Year Lookback)</h2>
        <p style="margin-bottom: 20px;">These companies have significantly increased their share count over the last 5 years, diluting existing shareholders' ownership stake.</p>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Sector</th>
                        <th>Shares 5 Yrs Ago</th>
                        <th>Current Shares</th>
                        <th>Change %</th>
                    </tr>
                </thead>
                <tbody>
                    ${diluters.slice(0, 50).map(d => `
                    <tr>
                        <td><span class="ticker">${d.ticker.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span> <br> <span style="font-size:0.8rem; color:#5a6a80;">${d.company.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span></td>
                        <td>${d.sector}</td>
                        <td>${formatNumber(d.shares_5yr_ago)}</td>
                        <td>${formatNumber(d.shares_current)}</td>
                        <td class="diluter-value">+${d.change_pct.toFixed(2)}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <h2>Best Share Reducers (5-Year Lookback)</h2>
        <p style="margin-bottom: 20px;">Conversely, these companies have actively bought back shares over the last 5 years, increasing the ownership stake of remaining shareholders.</p>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Sector</th>
                        <th>Shares 5 Yrs Ago</th>
                        <th>Current Shares</th>
                        <th>Change %</th>
                    </tr>
                </thead>
                <tbody>
                    ${reducers.slice(0, 50).map(d => `
                    <tr>
                        <td><span class="ticker">${d.ticker.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span> <br> <span style="font-size:0.8rem; color:#5a6a80;">${d.company.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span></td>
                        <td>${d.sector}</td>
                        <td>${formatNumber(d.shares_5yr_ago)}</td>
                        <td>${formatNumber(d.shares_current)}</td>
                        <td class="reducer-value">${d.change_pct.toFixed(2)}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>Frequently Asked Questions</h2>
            <div class="faq-item">
                <div class="faq-q">What is share dilution?</div>
                <div class="faq-a">Share dilution occurs when a company issues new shares of stock. This increases the total number of shares outstanding, which means each existing share represents a smaller percentage of ownership in the company.</div>
            </div>
            <div class="faq-item">
                <div class="faq-q">Why do companies dilute their shares?</div>
                <div class="faq-a">Companies often issue new shares to raise capital for expansion, pay down debt, or fund acquisitions. They may also issue shares as stock-based compensation for employees and executives.</div>
            </div>
            <div class="faq-item">
                <div class="faq-q">Is share reduction always good?</div>
                <div class="faq-a">Share reduction (via stock buybacks) increases the earnings per share and ownership percentage for remaining investors. However, if a company borrows heavily to fund buybacks instead of investing in growth, it could be a negative signal.</div>
            </div>
        </div>

        <div class="card" style="background: transparent; border: 1px solid #152040;">
            <h2>Methodology</h2>
            <p style="font-size: 0.9rem; color: #6a7a90;">We analyzed ${validData.length} S&P 500 constituents. We retrieved current outstanding shares and compared them to the basic average outstanding shares reported annually from approximately 5 years ago (using available financial filings around 2020-2021). The change percentage is calculated as <code>(Current Shares - Historical Shares) / Historical Shares * 100</code>. Corporate actions such as stock splits and reverse splits have been adjusted for in the data provider's figures.</p>
        </div>

        <footer>
            <div class="disclaimer">This information is for educational and informational purposes only and does not constitute financial advice. Data may not be fully complete or accurate due to reporting delays or calculation differences.</div>
            <div>&copy; ${currentYear} Westmount Research. All rights reserved.</div>
        </footer>
    </div>

    <!-- JSON-LD for SEO -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Share Dilution Rankings 2026: The Worst Diluters vs. Best Reducers",
      "description": "We tracked the 5-year share count changes for major US companies to find the worst stock diluters and the best share reducers in 2026.",
      "author": {
        "@type": "Organization",
        "name": "Westmount Research"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Westmount Research"
      },
      "datePublished": "${currentYear}-03-09"
    }
    </script>
</body>
</html>`;

fs.writeFileSync('public/share-dilution.html', html);
console.log('Successfully wrote public/share-dilution.html');
