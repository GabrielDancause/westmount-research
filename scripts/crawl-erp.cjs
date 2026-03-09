const fs = require('fs');
const https = require('https');
const { JSDOM } = require('jsdom');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default({ suppressNotices: ['yahooSurvey'] });

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseMultplTable(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const rows = Array.from(doc.querySelectorAll('tr'));
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const tds = rows[i].querySelectorAll('td');
    if (tds.length === 2) {
      const date = tds[0].textContent.trim();
      const val = parseFloat(tds[1].textContent.replace(/[^\d.-]/g, ''));
      result.push({ date, val });
    }
  }
  return result;
}

async function scrapeFred(series) {
  const html = await fetchHtml(`https://fred.stlouisfed.org/series/${series}`);
  const match = html.match(/<span class="series-meta-observation-value">([0-9.]+)/);
  return match ? parseFloat(match[1]) : null;
}

async function getSectorData() {
  const sectors = [
    { symbol: 'XLK', name: 'Information Technology' },
    { symbol: 'XLV', name: 'Health Care' },
    { symbol: 'XLF', name: 'Financials' },
    { symbol: 'XLY', name: 'Consumer Discretionary' },
    { symbol: 'XLC', name: 'Communication Services' },
    { symbol: 'XLI', name: 'Industrials' },
    { symbol: 'XLP', name: 'Consumer Staples' },
    { symbol: 'XLE', name: 'Energy' },
    { symbol: 'XLRE', name: 'Real Estate' },
    { symbol: 'XLU', name: 'Utilities' },
    { symbol: 'XLB', name: 'Materials' },
  ];

  const results = [];
  for (const sector of sectors) {
    try {
      const q = await yahooFinance.quote(sector.symbol);
      const pe = q.trailingPE;
      if (pe) {
        results.push({
          sector: sector.name,
          sectorPe: pe,
          sectorEarningsYield: (1 / pe) * 100
        });
      } else {
        results.push({
          sector: sector.name,
          sectorPe: null,
          sectorEarningsYield: null
        });
      }
    } catch (e) {
      console.error(`Error fetching ${sector.symbol}:`, e.message);
      results.push({
        sector: sector.name,
        sectorPe: null,
        sectorEarningsYield: null
      });
    }
  }
  return results;
}

async function run() {
  console.log('Fetching multpl data...');
  const eyHtml = await fetchHtml('https://www.multpl.com/s-p-500-earnings-yield/table/by-year');
  const eyData = parseMultplTable(eyHtml);

  const peHtml = await fetchHtml('https://www.multpl.com/s-p-500-pe-ratio/table/by-year');
  const peData = parseMultplTable(peHtml);

  const trHtml = await fetchHtml('https://www.multpl.com/10-year-treasury-rate/table/by-year');
  const trData = parseMultplTable(trHtml);

  const dyHtml = await fetchHtml('https://www.multpl.com/s-p-500-dividend-yield/table/by-year');
  const dyData = parseMultplTable(dyHtml);

  console.log('Fetching FRED data...');
  const treasury2yr = await scrapeFred('DGS2');

  // Current values (assuming the top row of "by-year" is current or closest to current, normally they put current at the top, sometimes with †)
  const sp500EarningsYield = eyData.length > 0 ? eyData[0].val : null;
  const sp500Pe = peData.length > 0 ? peData[0].val : null;
  const treasury10yr = trData.length > 0 ? trData[0].val : null;
  const sp500DividendYield = dyData.length > 0 ? dyData[0].val : null;

  const equityRiskPremium = (sp500EarningsYield !== null && treasury10yr !== null) ? sp500EarningsYield - treasury10yr : null;
  const yieldCurveSpread = (treasury10yr !== null && treasury2yr !== null) ? treasury10yr - treasury2yr : null;
  const totalYield = (sp500EarningsYield !== null && sp500DividendYield !== null) ? sp500EarningsYield + sp500DividendYield : null;

  console.log('Fetching sector data...');
  const sectorDataRaw = await getSectorData();
  const sectorData = sectorDataRaw.map(s => ({
    ...s,
    sectorVsBonds: (s.sectorEarningsYield !== null && treasury10yr !== null) ? s.sectorEarningsYield - treasury10yr : null
  }));

  // Historical context (10 data points across years)
  // The table has Jan 1 data for past years. We want 2016-2026.
  const historical = [];
  for (let year = 2026; year >= 2016; year--) {
    const yStr = year.toString();
    const eyRow = eyData.find(d => d.date.includes(yStr) && d.date.includes('Jan 1'));
    const trRow = trData.find(d => d.date.includes(yStr) && d.date.includes('Jan 1'));
    if (eyRow && trRow) {
      historical.push({
        year,
        earningsYield: eyRow.val,
        treasury10yr: trRow.val,
        equityRiskPremium: eyRow.val - trRow.val
      });
    } else {
      // Fallback: pick the first one matching the year
      const eyRowFall = eyData.find(d => d.date.includes(yStr));
      const trRowFall = trData.find(d => d.date.includes(yStr));
      if (eyRowFall && trRowFall) {
        historical.push({
          year,
          earningsYield: eyRowFall.val,
          treasury10yr: trRowFall.val,
          equityRiskPremium: eyRowFall.val - trRowFall.val
        });
      }
    }
  }

  const data = {
    current: {
      sp500EarningsYield,
      sp500Pe,
      treasury10yr,
      equityRiskPremium,
      treasury2yr,
      yieldCurveSpread,
      sp500DividendYield,
      totalYield
    },
    sectors: sectorData,
    historical
  };

  fs.writeFileSync('data/equity-risk-premium.json', JSON.stringify(data, null, 2));
  console.log('Saved to data/equity-risk-premium.json');

  generateHtml(data);
}

function generateHtml(data) {
  const { current, sectors, historical } = data;

  const erpColor = current.equityRiskPremium >= 0 ? '#4caf50' : '#f44336';
  const erpStatus = current.equityRiskPremium >= 0 ? 'Positive' : 'Negative';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Earnings Yield vs Bond Yield: Is the Stock Market Fairly Valued? (2026) | Westmount Research</title>
  <meta name="description" content="A comprehensive analysis of the S&P 500 Equity Risk Premium. We compare the S&P 500 earnings yield to the 10-year Treasury yield to see if the stock market is overvalued compared to bonds.">
  <link rel="canonical" href="https://westmountresearch.com/equity-risk-premium">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #060a12;
      color: #c8d0de;
      line-height: 1.6;
    }
    header {
      background: linear-gradient(180deg, #0a1628 0%, #060a12 100%);
      padding: 60px 24px 40px;
      text-align: center;
      border-bottom: 1px solid #152040;
    }
    .tag {
      color: #4a8fe7;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 16px;
      display: inline-block;
      background: rgba(74, 143, 231, 0.1);
      padding: 6px 12px;
      border-radius: 4px;
    }
    h1 {
      font-size: 2.8rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 20px;
      line-height: 1.2;
    }
    .subtitle {
      color: #5a6a80;
      font-size: 1.1rem;
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .card {
      background: #0a1020;
      border: 1px solid #152040;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    .card-title {
      color: #5a6a80;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .card-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: #4a8fe7;
      font-family: 'JetBrains Mono', monospace;
    }
    .highlight {
      color: ${erpColor};
    }
    h2 {
      font-size: 2rem;
      color: #fff;
      margin: 40px 0 20px;
      border-bottom: 1px solid #152040;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
      background: #0a1020;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #152040;
    }
    th, td {
      padding: 14px 20px;
      text-align: left;
      border-bottom: 1px solid #152040;
    }
    th {
      background: #0d1428;
      color: #fff;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
    }
    td {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.95rem;
    }
    tr:last-child td { border-bottom: none; }
    .faq {
      margin-bottom: 40px;
    }
    .faq-item {
      margin-bottom: 24px;
      background: #0a1020;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #152040;
    }
    .faq-q {
      font-weight: 600;
      color: #fff;
      font-size: 1.1rem;
      margin-bottom: 12px;
    }
    .faq-a {
      color: #a0aec0;
    }
    .methodology {
      background: #0a1020;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #152040;
      font-size: 0.9rem;
      color: #5a6a80;
      margin-bottom: 40px;
    }
    footer {
      text-align: center;
      padding: 40px 24px;
      border-top: 1px solid #152040;
      font-size: 0.85rem;
      color: #5a6a80;
    }
    a {
      color: #4a8fe7;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Earnings Yield vs Bond Yield: Is the Stock Market Fairly Valued?",
    "author": {
      "@type": "Organization",
      "name": "Westmount Research"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Westmount Research"
    },
    "datePublished": "2026-03-09"
  }
  </script>
</head>
<body>
  <header>
    <div class="tag">Original Research 2026</div>
    <h1>Earnings Yield vs Bond Yield</h1>
    <p class="subtitle">Comparing S&P 500 earnings yields to the 10-year Treasury to determine if stocks are fairly valued or if bonds are more attractive.</p>
  </header>

  <div class="container">
    <div class="grid-3">
      <div class="card">
        <div class="card-title">S&P 500 Earnings Yield</div>
        <div class="card-value">${current.sp500EarningsYield ? current.sp500EarningsYield.toFixed(2) + '%' : 'N/A'}</div>
        <div style="font-size: 0.8rem; color: #5a6a80; margin-top: 8px;">Inverse of P/E (${current.sp500Pe ? current.sp500Pe.toFixed(2) : 'N/A'})</div>
      </div>
      <div class="card">
        <div class="card-title">10-Year Treasury Yield</div>
        <div class="card-value">${current.treasury10yr ? current.treasury10yr.toFixed(2) + '%' : 'N/A'}</div>
        <div style="font-size: 0.8rem; color: #5a6a80; margin-top: 8px;">Risk-Free Rate Benchmark</div>
      </div>
      <div class="card" style="border-color: ${erpColor};">
        <div class="card-title">Equity Risk Premium</div>
        <div class="card-value highlight">${current.equityRiskPremium !== null ? (current.equityRiskPremium > 0 ? '+' : '') + current.equityRiskPremium.toFixed(2) + '%' : 'N/A'}</div>
        <div style="font-size: 0.8rem; color: #5a6a80; margin-top: 8px;">Earnings Yield minus 10-Yr Treasury</div>
      </div>
    </div>

    <p style="margin-bottom: 40px; font-size: 1.1rem; color: #c8d0de;">
      Currently, the S&P 500 is trading at a P/E ratio of <strong>${current.sp500Pe ? current.sp500Pe.toFixed(2) : 'N/A'}</strong>, which translates to an earnings yield of <strong>${current.sp500EarningsYield ? current.sp500EarningsYield.toFixed(2) + '%' : 'N/A'}</strong>.
      Meanwhile, the 10-year Treasury note yields <strong>${current.treasury10yr ? current.treasury10yr.toFixed(2) + '%' : 'N/A'}</strong>.
      This creates an Equity Risk Premium (ERP) of <strong>${current.equityRiskPremium !== null ? current.equityRiskPremium.toFixed(2) + '%' : 'N/A'}</strong>, meaning that investors are being compensated ${current.equityRiskPremium !== null ? Math.abs(current.equityRiskPremium).toFixed(2) + '%' : 'N/A'} ${current.equityRiskPremium >= 0 ? 'more' : 'less'} to hold equities over risk-free bonds.
      Historically, a negative ERP has signaled that bonds may be a safer and more attractive bet than stocks.
    </p>

    <h2>GICS Sector Breakdown vs Bonds</h2>
    <table>
      <thead>
        <tr>
          <th>Sector</th>
          <th>P/E Ratio</th>
          <th>Earnings Yield</th>
          <th>Sector ERP (vs 10yr)</th>
        </tr>
      </thead>
      <tbody>
        ${sectors.map(s => `
        <tr>
          <td style="font-family: 'Inter', sans-serif;">${s.sector}</td>
          <td>${s.sectorPe ? s.sectorPe.toFixed(2) : 'N/A'}</td>
          <td>${s.sectorEarningsYield !== null ? s.sectorEarningsYield.toFixed(2) + '%' : 'N/A'}</td>
          <td style="color: ${s.sectorVsBonds >= 0 ? '#4caf50' : '#f44336'}">${s.sectorVsBonds !== null ? (s.sectorVsBonds > 0 ? '+' : '') + s.sectorVsBonds.toFixed(2) + '%' : 'N/A'}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <h2>Historical Equity Risk Premium (2016-2026)</h2>
    <table>
      <thead>
        <tr>
          <th>Year</th>
          <th>S&P 500 Earnings Yield</th>
          <th>10-Year Treasury Yield</th>
          <th>Equity Risk Premium</th>
        </tr>
      </thead>
      <tbody>
        ${historical.map(h => `
        <tr>
          <td style="font-family: 'Inter', sans-serif;">${h.year}</td>
          <td>${h.earningsYield !== null ? h.earningsYield.toFixed(2) + '%' : 'N/A'}</td>
          <td>${h.treasury10yr !== null ? h.treasury10yr.toFixed(2) + '%' : 'N/A'}</td>
          <td style="color: ${h.equityRiskPremium >= 0 ? '#4caf50' : '#f44336'}">${h.equityRiskPremium !== null ? (h.equityRiskPremium > 0 ? '+' : '') + h.equityRiskPremium.toFixed(2) + '%' : 'N/A'}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <h2>Frequently Asked Questions</h2>
    <div class="faq">
      <div class="faq-item">
        <div class="faq-q">What is the equity risk premium?</div>
        <div class="faq-a">The equity risk premium (ERP) is the excess return that investing in the stock market provides over a risk-free rate, such as government bonds. In this study, we calculate it by subtracting the 10-year Treasury yield from the S&P 500 earnings yield.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Is the stock market overvalued compared to bonds?</div>
        <div class="faq-a">When the equity risk premium is negative, it implies that stocks are expensive relative to the yield you can get from "risk-free" government bonds. Currently, the ERP is <strong>${current.equityRiskPremium !== null ? current.equityRiskPremium.toFixed(2) + '%' : 'N/A'}</strong>, suggesting that bonds might be ${current.equityRiskPremium < 0 ? 'more attractive' : 'less attractive'} than equities right now.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">What is earnings yield?</div>
        <div class="faq-a">Earnings yield is the inverse of the Price-to-Earnings (P/E) ratio. It shows the percentage of a company's earnings per share relative to its stock price. For example, a P/E ratio of 20 equals an earnings yield of 5% (1 / 20 = 0.05).</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">What does a negative equity risk premium mean?</div>
        <div class="faq-a">A negative equity risk premium means that the earnings yield of the stock market is lower than the yield on risk-free government bonds. This often happens in late-stage bull markets or periods of high inflation when interest rates rise significantly. It indicates that investors are taking on stock market risk without being adequately compensated with higher yields.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Should I buy bonds or stocks in 2026?</div>
        <div class="faq-a">While Westmount Research does not provide investment advice, current data shows that the 10-year Treasury yields ${current.treasury10yr ? current.treasury10yr.toFixed(2) + '%' : 'N/A'}, while the S&P 500 earnings yield is ${current.sp500EarningsYield ? current.sp500EarningsYield.toFixed(2) + '%' : 'N/A'}. Many analysts suggest shifting a portion of portfolios toward fixed income when the ERP compresses or turns negative.</div>
      </div>
    </div>

    <div class="methodology">
      <strong>Methodology:</strong> We utilize S&P 500 Historical P/E and Earnings Yield data aggregated by multpl.com, which calculates the earnings yield as the trailing twelve month (TTM) earnings divided by the index price. Treasury yields are sourced directly from Federal Reserve Economic Data (FRED) and historical archives. Sector P/E ratios are estimated using trailing P/E ratios of representative SPDR ETFs (e.g., XLK, XLV, XLF) via Yahoo Finance API. All calculations are real-time snapshots or 1st of year historical figures.
    </div>
  </div>

  <footer>
    <p>© 2026 <a href="/">westmount-research</a></p>
    <p style="margin-top: 10px; font-size: 0.75rem;">Disclaimer: This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research.</p>
  </footer>
</body>
</html>`;

  fs.writeFileSync('public/equity-risk-premium.html', html);
  console.log('Saved to public/equity-risk-premium.html');
}

run();
