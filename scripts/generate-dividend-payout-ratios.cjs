const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

const TICKERS_FILE = path.join(__dirname, '../tickers.json');
const OUTPUT_FILE = path.join(__dirname, '../public/dividend-payout-ratios.html');

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPercent(num) {
  if (num === null || num === undefined) return 'N/A';
  return (num * 100).toFixed(2) + '%';
}

function formatMoney(num) {
  if (num === null || num === undefined) return 'N/A';
  return '$' + num.toFixed(2);
}

function getRiskColor(ratio) {
  if (ratio === null || ratio === undefined) return 'inherit';
  if (ratio > 0.8) return '#ef4444'; // red
  if (ratio >= 0.6) return '#eab308'; // yellow
  return '#22c55e'; // green
}

async function run() {
  let tickers = [];
  try {
    tickers = JSON.parse(fs.readFileSync(TICKERS_FILE, 'utf-8'));
  } catch (e) {
    console.error("Could not read tickers.json", e);
    process.exit(1);
  }

  tickers = [...new Set(tickers)];

  const data = [];
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    try {
      console.log(`Fetching ${ticker} (${i+1}/${tickers.length})...`);
      const result = await yahooFinance.quoteSummary(ticker, { modules: ['summaryDetail', 'defaultKeyStatistics', 'assetProfile'] });

      const summary = result.summaryDetail || {};
      const stats = result.defaultKeyStatistics || {};
      const profile = result.assetProfile || {};

      const payoutRatio = summary.payoutRatio;
      const annualDiv = summary.dividendRate || summary.trailingAnnualDividendRate;
      const eps = stats.trailingEps || stats.forwardEps;

      // Only include companies that pay a dividend
      if (annualDiv && annualDiv > 0 && payoutRatio !== undefined && payoutRatio !== null) {
        let compName = ticker;
        try {
           const quote = await yahooFinance.quote(ticker);
           compName = quote.shortName || summary.longName || ticker;
        } catch (e) {
           compName = summary.longName || ticker;
        }

        data.push({
          ticker,
          company: compName,
          sector: profile.sector || 'Unknown',
          dividend_yield: summary.dividendYield || summary.trailingAnnualDividendYield || null,
          eps: eps || null,
          annual_dividend: annualDiv || null,
          payout_ratio: payoutRatio,
          years_paying: null, // Data not easily available via basic YF quoteSummary
          dividend_growth_5yr: summary.fiveYearAvgDividendYield || null
        });
      }
    } catch (e) {
      console.log(`Error fetching ${ticker}: ${e.message}`);
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 50));
  }

  // Sort by payout ratio descending
  data.sort((a, b) => b.payout_ratio - a.payout_ratio);

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dividend Payout Ratio Analysis 2026 | Westmount Fundamentals</title>
    <meta name="description" content="Analyzing S&amp;P 500 dividend sustainability. Companies ranked by payout ratio to identify the safest yields and the biggest risk of dividend cuts.">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #060a12;
            color: #c8d0de;
            line-height: 1.6;
        }
        header {
            text-align: center;
            padding: 80px 24px 60px;
            background: linear-gradient(180deg, #0a1628 0%, #060a12 100%);
            border-bottom: 1px solid #152040;
        }
        h1 { font-size: 2.5rem; font-weight: 900; color: #fff; margin-bottom: 16px; letter-spacing: -1px; }
        .subtitle { color: #4a8fe7; font-size: 1.1rem; font-weight: 600; margin-bottom: 24px; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }

        .card {
            background: #0a1020;
            border: 1px solid #152040;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 40px;
        }

        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th {
            padding: 16px;
            border-bottom: 1px solid #152040;
            color: #5a6a80;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            background: #060a12;
        }
        td {
            padding: 16px;
            border-bottom: 1px solid #152040;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
        }
        tr:hover td { background: rgba(74, 143, 231, 0.05); }
        .ticker { color: #4a8fe7; font-weight: bold; }
        .company-name { font-family: 'Inter', sans-serif; font-weight: 600; color: #fff; }
        .sector-badge {
            display: inline-block;
            padding: 4px 8px;
            background: rgba(90, 106, 128, 0.2);
            border-radius: 4px;
            font-size: 0.75rem;
            color: #c8d0de;
        }

        h2 { font-size: 1.8rem; color: #fff; margin: 40px 0 20px; }
        p { margin-bottom: 16px; color: #8a9bb0; }

        .faq-item { margin-bottom: 24px; }
        .faq-q { font-weight: 700; color: #fff; margin-bottom: 8px; font-size: 1.1rem; }
        .faq-a { color: #8a9bb0; }

        .footer {
            text-align: center;
            padding: 40px 24px;
            font-size: 0.85rem;
            color: #3a4a5a;
            border-top: 1px solid #152040;
            background: #040810;
        }
        .footer a { color: #4a8fe7; text-decoration: none; }
        .disclaimer { max-width: 800px; margin: 16px auto 0; color: #2a3a4a; font-size: 0.75rem; }
    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Dividend Payout Ratio Analysis 2026",
      "description": "Analyzing S&P 500 dividend sustainability by payout ratios.",
      "author": {
        "@type": "Organization",
        "name": "Westmount Fundamentals"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Westmount Fundamentals",
        "logo": {
          "@type": "ImageObject",
          "url": "https://westmountfundamentals.com/favicon.svg"
        }
      },
      "datePublished": "2026-01-01",
      "dateModified": "2026-01-01"
    }
    </script>
</head>
<body>

<header>
    <h1>Dividend Payout Ratio Analysis 2026</h1>
    <div class="subtitle">Ranking S&amp;P 500 Companies by Dividend Sustainability</div>
    <p style="max-width: 600px; margin: 0 auto; color: #8a9bb0;">
        A company's dividend payout ratio measures the percentage of its net income distributed as dividends.
        A ratio above 100% means the company is paying out more than it earns, which is generally unsustainable long-term.
    </p>
</header>

<div class="container">
    <div class="card">
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Company</th>
                        <th>Sector</th>
                        <th>Div Yield</th>
                        <th>EPS</th>
                        <th>Annual Div</th>
                        <th>Payout Ratio</th>
                        <th>5Y Div Gr.</th>
                        <th>Yrs Paying</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                    <tr>
                        <td class="ticker">${escapeHtml(item.ticker)}</td>
                        <td><div class="company-name">${escapeHtml(item.company)}</div></td>
                        <td><span class="sector-badge">${escapeHtml(item.sector)}</span></td>
                        <td>${formatPercent(item.dividend_yield)}</td>
                        <td>${formatMoney(item.eps)}</td>
                        <td>${formatMoney(item.annual_dividend)}</td>
                        <td style="color: ${getRiskColor(item.payout_ratio)}; font-weight: bold;">${formatPercent(item.payout_ratio)}</td>
                        <td>${item.dividend_growth_5yr !== null ? escapeHtml(item.dividend_growth_5yr) + '%' : 'N/A'}</td>
                        <td>${item.years_paying !== null ? escapeHtml(item.years_paying) : 'N/A'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <div class="card">
        <h2>Methodology</h2>
        <p>This study analyzes dividend-paying companies within the S&amp;P 500. Financial data is sourced from real-time market APIs. The primary metric of focus is the <strong>Payout Ratio</strong>, calculated as Annual Dividend per Share divided by Earnings per Share (EPS).</p>
        <p>Risk tiers are defined as follows:
            <span style="color: #22c55e; font-weight: bold;">Green (&lt;60%)</span> indicates a healthy, sustainable dividend with room for growth.
            <span style="color: #eab308; font-weight: bold;">Yellow (60%-80%)</span> suggests a high payout that may restrict future increases.
            <span style="color: #ef4444; font-weight: bold;">Red (&gt;80%)</span> flags a potentially unsustainable dividend, especially if it exceeds 100%, meaning the company is paying out more than its net income.
        </p>
    </div>

    <div class="card">
        <h2>Frequently Asked Questions</h2>

        <div class="faq-item">
            <div class="faq-q">What is a good dividend payout ratio?</div>
            <div class="faq-a">Generally, a payout ratio between 35% and 55% is considered healthy and appropriate. It shows the company is sharing profits with investors while retaining enough capital to reinvest in the business. Ratios above 75% start to become risky, and anything over 100% is usually unsustainable.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">Why would a company have a payout ratio over 100%?</div>
            <div class="faq-a">A ratio over 100% means the company is paying out more in dividends than it earns in net income. This can happen during temporary earnings slumps, or due to large non-cash accounting charges (like depreciation) that lower EPS but not actual cash flow. Real Estate Investment Trusts (REITs) and Master Limited Partnerships (MLPs) often have ratios over 100% because their cash flow significantly exceeds their accounting net income.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">Can a high payout ratio predict a dividend cut?</div>
            <div class="faq-a">Yes, a consistently high or rising payout ratio (especially >100%) is one of the strongest warning signs of an impending dividend cut. If earnings don't recover, the company will eventually have to reduce the dividend to preserve cash.</div>
        </div>
    </div>
</div>

<div class="footer">
    © 2026 <a href="/">westmount-research</a> · A <a href="https://gab.ae">GAB Ventures</a> property
    <div class="disclaimer">This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research. All data is provided "as is" and may be delayed or inaccurate. Past performance does not guarantee future results.</div>
</div>

</body>
</html>`;

  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Generated HTML with ${data.length} companies at ${OUTPUT_FILE}`);
}

run().catch(console.error);
