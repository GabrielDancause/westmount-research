const fs = require('fs');
const path = require('path');

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function formatCurrency(amount) {
  if (amount === null) return 'N/A';
  if (amount >= 1e9) return '$' + (amount / 1e9).toFixed(2) + 'B';
  if (amount >= 1e6) return '$' + (amount / 1e6).toFixed(2) + 'M';
  return '$' + amount.toLocaleString();
}

function formatPercent(amount) {
  if (amount === null) return 'N/A';
  const prefix = amount > 0 ? '+' : '';
  return prefix + amount.toFixed(1) + '%';
}

function main() {
  const dataPath = path.join(__dirname, '..', 'data', 'ceo_comp.json');
  if (!fs.existsSync(dataPath)) {
    console.error("Data file not found. Run get_ceo_comp.cjs first.");
    return;
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const xData = data.map(d => d.total_comp);
  const yData = data.map(d => d.stock_return_3yr);

  // Scatter Plot parameters
  const minX = Math.min(...xData) * 0.9;
  const maxX = Math.max(...xData) * 1.1;
  const minY = Math.min(...yData) - 10;
  const maxY = Math.max(...yData) + 10;

  const width = 800;
  const height = 400;
  const padding = 50;

  const points = data.map(d => {
    const cx = padding + ((d.total_comp - minX) / (maxX - minX)) * (width - 2 * padding);
    const cy = height - padding - ((d.stock_return_3yr - minY) / (maxY - minY)) * (height - 2 * padding);
    return { cx, cy, label: d.ticker, name: d.ceo_name };
  });

  const svgContent = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; background: #0a1020; border-radius: 8px; border: 1px solid #152040;">
      <!-- Grid lines -->
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#152040" stroke-width="1" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#152040" stroke-width="1" />
      <text x="${width / 2}" y="${height - 10}" fill="#5a6a80" font-size="12" text-anchor="middle">Total Compensation ($)</text>
      <text x="15" y="${height / 2}" fill="#5a6a80" font-size="12" text-anchor="middle" transform="rotate(-90, 15, ${height / 2})">3-Year Stock Return (%)</text>
      <!-- Points -->
      ${points.map(p => `<circle cx="${p.cx}" cy="${p.cy}" r="5" fill="#4a8fe7" opacity="0.7"><title>${escapeHtml(p.label)}: ${escapeHtml(p.name)}</title></circle>
        <text x="${p.cx + 7}" y="${p.cy + 4}" fill="#c8d0de" font-size="10">${escapeHtml(p.label)}</text>`).join('\n')}
    </svg>
  `;

  let tableRows = '';
  data.forEach((d, i) => {
    tableRows += `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(d.ceo_name)}</strong><br><span style="font-size: 0.8em; color: #5a6a80;">${escapeHtml(d.company)} (${escapeHtml(d.ticker)})</span></td>
        <td style="color: #4a8fe7; font-weight: bold;">${formatCurrency(d.total_comp)}</td>
        <td style="color: ${d.stock_return_3yr >= 0 ? '#4caf50' : '#f44336'};">${formatPercent(d.stock_return_3yr)}</td>
        <td>${escapeHtml(d.sector)}</td>
      </tr>
    `;
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "CEO Compensation vs Stock Performance 2026",
    "description": "Compare CEO total compensation to stock returns. Do the highest-paid CEOs deliver better returns? Plot compensation vs 3-year stock performance for top 50 paid CEOs.",
    "author": {
      "@type": "Organization",
      "name": "Westmount Fundamentals"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Westmount Fundamentals"
    },
    "datePublished": new Date().toISOString()
  };

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CEO Compensation vs Stock Performance 2026 | Westmount Fundamentals</title>
    <meta name="description" content="Compare CEO total compensation to stock returns. Do the highest-paid CEOs deliver better returns?">
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd)}
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #060a12;
          color: #c8d0de;
          line-height: 1.6;
        }
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        h1 {
          font-size: 2.5rem;
          color: #fff;
          margin-bottom: 20px;
          text-align: center;
        }
        p {
          margin-bottom: 20px;
        }
        .plot-container {
          margin: 40px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 40px 0;
          background: #0a1020;
          border-radius: 8px;
          overflow: hidden;
        }
        th, td {
          padding: 15px;
          text-align: left;
          border-bottom: 1px solid #152040;
        }
        th {
          background: #152040;
          color: #fff;
          font-weight: bold;
        }
        tr:hover {
          background: rgba(74, 143, 231, 0.05);
        }
        .faq, .methodology {
          background: #0a1020;
          padding: 30px;
          border-radius: 8px;
          border: 1px solid #152040;
          margin-bottom: 40px;
        }
        h2 {
          color: #4a8fe7;
          margin-bottom: 20px;
        }
        h3 {
          color: #fff;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        .footer {
            text-align: center;
            padding: 40px 20px;
            font-size: 0.85rem;
            color: #5a6a80;
            border-top: 1px solid #152040;
            margin-top: 60px;
        }
        .disclaimer {
            max-width: 600px;
            margin: 10px auto;
            font-size: 0.75rem;
        }
        a {
            color: #4a8fe7;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>CEO Compensation vs Stock Performance 2026</h1>
        <p>A deep dive into the top 50 highest-paid CEOs in the S&P 500 and their corresponding 3-year stock returns. Does exorbitant pay translate to outsized returns for shareholders?</p>

        <div class="plot-container">
            <h2>Compensation vs 3-Year Return</h2>
            ${svgContent}
        </div>

        <h2>Top 50 Highest Paid CEOs</h2>
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>CEO / Company</th>
                    <th>Total Comp</th>
                    <th>3-Year Return</th>
                    <th>Sector</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>

        <div class="faq">
            <h2>Frequently Asked Questions</h2>
            <h3>Do higher-paid CEOs deliver better returns?</h3>
            <p>Our data suggests there is little correlation between the highest-paid CEOs and superior stock performance. Many CEOs earning top-tier compensation have overseen average or below-average returns.</p>
            <h3>What makes up total compensation?</h3>
            <p>Total compensation typically includes a base salary, stock awards, options, non-equity incentive plan compensation, and other benefits. Stock awards often make up the vast majority of CEO pay.</p>
        </div>

        <div class="methodology">
            <h2>Methodology</h2>
            <p>Data was gathered using Yahoo Finance APIs representing the S&P 500 universe. Total compensation figures reflect the most recent fiscal year available (typically 2025). The 3-year stock return was calculated comparing the closing price 3 years prior to the current price.</p>
        </div>
    </div>

    <div class="footer">
        © 2026 <a href="/">westmount-research</a>
        <div class="disclaimer">This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research.</div>
    </div>
</body>
</html>`;

  const outputPath = path.join(__dirname, '..', 'public', 'ceo-compensation.html');
  fs.writeFileSync(outputPath, htmlContent);
  console.log(`Generated HTML at ${outputPath}`);
}

main();