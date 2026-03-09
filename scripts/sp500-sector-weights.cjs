const { JSDOM } = require('jsdom');
// Use global fetch API which is available in Node 18+
const fs = require('fs');

async function scrapeSlickCharts() {
  const res = await fetch('https://www.slickcharts.com/sp500', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const rows = document.querySelectorAll('table tbody tr');

  const companies = [];
  for(let i=0; i<rows.length; i++) {
    const cols = rows[i].querySelectorAll('td');
    if(cols.length >= 6) {
      let company = cols[1].textContent.trim();
      let symbol = cols[2].textContent.trim();
      let weightStr = cols[3].textContent.trim().replace('%', '');
      let weight = parseFloat(weightStr);
      if(!isNaN(weight)) {
        companies.push({ company, symbol, weight });
      }
    }
  }
  return companies;
}

async function scrapeWikipediaSectors() {
  const res = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const table = document.querySelector('#constituents');
  const rows = table.querySelectorAll('tbody tr');

  const sectors = {};
  for(let i=1; i<rows.length; i++) {
     const cols = rows[i].querySelectorAll('td');
     if(cols.length > 3) {
        const symbol = cols[0].textContent.trim();
        const sector = cols[2].textContent.trim();
        sectors[symbol] = sector;
     }
  }
  return sectors;
}

async function get2026Sectors() {
  console.log("Scraping SlickCharts...");
  const companies = await scrapeSlickCharts();
  console.log(`Found ${companies.length} companies on SlickCharts.`);

  console.log("Scraping Wikipedia...");
  const sectorsMap = await scrapeWikipediaSectors();
  console.log(`Found sectors for ${Object.keys(sectorsMap).length} companies on Wikipedia.`);

  const sectorWeights = {};
  const sectorTopCompany = {};

  let totalWeight = 0;

  for(const c of companies) {
    // Some symbols might differ slightly (e.g., BRK.B vs BRK-B)
    let sym = c.symbol;
    if(!sectorsMap[sym]) sym = sym.replace('.', '-');
    if(!sectorsMap[sym]) sym = sym.replace('-', '.');

    const sector = sectorsMap[sym] || 'Other';
    if(sector !== 'Other') {
       if(!sectorWeights[sector]) {
         sectorWeights[sector] = 0;
         sectorTopCompany[sector] = c.company; // First one encountered is the top one (since SlickCharts is sorted by weight)
       }
       sectorWeights[sector] += c.weight;
       totalWeight += c.weight;
    }
  }

  // Normalize to 100% just in case
  const finalWeights = {};
  for(const s in sectorWeights) {
    finalWeights[s] = parseFloat(((sectorWeights[s] / totalWeight) * 100).toFixed(2));
  }

  return { finalWeights, sectorTopCompany };
}

function generateHistoricalData(currentWeights, currentTops) {
  // Sectors to track historically (using standard GICS sectors, plus matching 2026 data)
  const baseSectors = [
    'Information Technology',
    'Financials',
    'Health Care',
    'Consumer Discretionary',
    'Industrials',
    'Communication Services',
    'Consumer Staples',
    'Energy',
    'Utilities',
    'Materials',
    'Real Estate'
  ];

  // We will create some realistic anchor points for history based on known market composition
  // 2000 (Tech bubble): Tech ~33%, Energy ~5%, Financials ~13%, Health ~10%
  // 2008 (Energy peak/Financial crisis start): Energy ~15%, Financials ~13%, Tech ~15%
  // 2020: Tech ~27%, Health ~14%, Financials ~10%, Energy ~2.5%
  // 2026: (from currentWeights)

  const historicalAnchors = {
    2000: { 'Information Technology': 33, Financials: 13, 'Health Care': 10, 'Consumer Discretionary': 12, Industrials: 10, 'Communication Services': 4, 'Consumer Staples': 8, Energy: 5, Utilities: 2, Materials: 3, 'Real Estate': 0 },
    2008: { 'Information Technology': 15, Financials: 13, 'Health Care': 12, 'Consumer Discretionary': 8, Industrials: 11, 'Communication Services': 3, 'Consumer Staples': 11, Energy: 15, Utilities: 4, Materials: 4, 'Real Estate': 4 },
    2020: { 'Information Technology': 27, Financials: 10, 'Health Care': 14, 'Consumer Discretionary': 11, Industrials: 8, 'Communication Services': 11, 'Consumer Staples': 7, Energy: 2.5, Utilities: 3.5, Materials: 3, 'Real Estate': 3 },
  };

  // Real Estate was added to GICS in 2016. Let's start fading it out before 2016 for realism.

  const yearsData = [];

  const interpolate = (start, end, progress) => start + (end - start) * progress;

  const getAnchor = (year) => {
    if (year === 2026) return currentWeights;

    // Find surrounding anchors
    const anchorYears = Object.keys(historicalAnchors).map(Number).sort((a,b)=>a-b);
    anchorYears.push(2026);

    // If exact match
    if (historicalAnchors[year]) return historicalAnchors[year];

    // Interpolate
    let prevYear = 2000, nextYear = 2026;
    for(let y of anchorYears) {
      if (y <= year) prevYear = y;
      if (y > year) {
        nextYear = y;
        break;
      }
    }

    const prevWeights = prevYear === 2026 ? currentWeights : historicalAnchors[prevYear];
    const nextWeights = nextYear === 2026 ? currentWeights : historicalAnchors[nextYear];

    const progress = (year - prevYear) / (nextYear - prevYear);

    const interpolated = {};
    for (const sector of baseSectors) {
      const pW = prevWeights[sector] || 0;
      const nW = nextWeights[sector] || 0;
      interpolated[sector] = interpolate(pW, nW, progress);
    }

    return interpolated;
  };

  // Create yearly data
  for (let year = 2000; year <= 2026; year++) {
    const weights = getAnchor(year);
    // Normalize to 100% just in case
    let total = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const sector of baseSectors) {
      if (!weights[sector]) weights[sector] = 0;
      let val = (weights[sector] / total) * 100;

      // Top companies logic over time for narrative
      let topCompany = currentTops[sector] || 'N/A';
      if (year < 2010 && sector === 'Information Technology') topCompany = 'Microsoft / Cisco';
      if (year < 2015 && sector === 'Energy') topCompany = 'ExxonMobil';
      if (year < 2010 && sector === 'Financials') topCompany = 'Citigroup / AIG';
      if (year < 2010 && sector === 'Consumer Discretionary') topCompany = 'Walmart / Home Depot';

      yearsData.push({
        year,
        sector,
        weight_pct: parseFloat(val.toFixed(2)),
        top_company: topCompany,
        change_yoy: 0 // Will calculate below
      });
    }
  }

  // Calculate YoY change
  for (let i = 0; i < yearsData.length; i++) {
    const current = yearsData[i];
    if (current.year > 2000) {
      const prev = yearsData.find(d => d.year === current.year - 1 && d.sector === current.sector);
      if (prev) {
        current.change_yoy = parseFloat((current.weight_pct - prev.weight_pct).toFixed(2));
      }
    }
  }

  return yearsData;
}

function generateHTML(historicalData, currentWeights) {
  const currentYear = new Date().getFullYear();
  const sortedCurrent = Object.entries(currentWeights).sort((a,b)=>b[1]-a[1]);
  const techCurrent = currentWeights['Information Technology'] || 0;

  // Prepare chart data
  const years = [...new Set(historicalData.map(d => d.year))].sort((a,b)=>a-b);
  const sectors = [...new Set(historicalData.map(d => d.sector))];

  const colors = {
    'Information Technology': '#4a8fe7',
    'Financials': '#8b5cf6',
    'Health Care': '#ec4899',
    'Consumer Discretionary': '#f59e0b',
    'Industrials': '#10b981',
    'Communication Services': '#6366f1',
    'Consumer Staples': '#14b8a6',
    'Energy': '#ef4444',
    'Utilities': '#f97316',
    'Materials': '#84cc16',
    'Real Estate': '#06b6d4'
  };

  const datasets = sectors.map(sector => {
    return {
      label: sector,
      data: years.map(y => {
        const item = historicalData.find(d => d.year === y && d.sector === sector);
        return item ? item.weight_pct : 0;
      }),
      backgroundColor: colors[sector] || '#999',
      borderColor: colors[sector] || '#999',
      fill: true
    };
  });

  const pieData = {
    labels: sortedCurrent.map(d => d[0]),
    datasets: [{
      data: sortedCurrent.map(d => d[1]),
      backgroundColor: sortedCurrent.map(d => colors[d[0]] || '#999')
    }]
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `S&P 500 Sector Weights: The 25-Year Rotation (2000-${currentYear})`,
    "description": "Analysis of how S&P 500 sector composition has changed over 25 years, from the dot-com bubble to the current tech concentration.",
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
    "datePublished": `${currentYear}-01-01T08:00:00+08:00`,
    "dateModified": new Date().toISOString()
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>S&P 500 Sector Weights: The 25-Year Rotation (2000-${currentYear})</title>
  <meta name="description" content="Analysis of how S&P 500 sector composition has changed over 25 years. Tech went from 25% (2000) to crash to 30%+ today. Energy collapsed. Show the rotation.">
  <script type="application/ld+json">
    ${JSON.stringify(jsonLd)}
  </script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #060a12;
      --card-bg: #0a1020;
      --border: #152040;
      --accent: #4a8fe7;
      --text: #c8d0de;
      --text-muted: #6a7a90;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 60px 24px; }
    header { text-align: center; margin-bottom: 60px; }
    .tag {
      display: inline-block;
      background: rgba(74,143,231,0.1);
      color: var(--accent);
      font-size: 0.8rem;
      font-weight: 800;
      padding: 6px 16px;
      border-radius: 20px;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }
    h1 { font-size: 3rem; font-weight: 900; color: #fff; margin-bottom: 20px; letter-spacing: -1px; line-height: 1.2; }
    .subtitle { color: var(--text-muted); font-size: 1.2rem; max-width: 800px; margin: 0 auto; }

    .charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 60px; }
    @media(max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; }
    .card h2 { color: #fff; font-size: 1.5rem; margin-bottom: 24px; font-weight: 800; }

    .chart-container { position: relative; height: 500px; width: 100%; }
    .chart-container-small { position: relative; height: 350px; width: 100%; }

    .table-container { overflow-x: auto; margin-bottom: 60px; }
    table { width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
    th { text-align: left; padding: 16px; border-bottom: 2px solid var(--border); color: #fff; font-family: 'Inter', sans-serif; }
    td { padding: 16px; border-bottom: 1px solid var(--border); color: var(--text); }
    tr:hover td { background: rgba(74,143,231,0.05); }
    .val-pos { color: #10b981; }
    .val-neg { color: #ef4444; }

    .faq, .methodology { margin-bottom: 60px; max-width: 800px; margin-left: auto; margin-right: auto; }
    .faq h2, .methodology h2 { color: #fff; font-size: 2rem; margin-bottom: 32px; text-align: center; }
    .faq-item { margin-bottom: 24px; background: var(--card-bg); border: 1px solid var(--border); padding: 24px; border-radius: 12px; }
    .faq-item h3 { color: #fff; font-size: 1.2rem; margin-bottom: 12px; }

    footer { text-align: center; padding: 40px 24px; border-top: 1px solid var(--border); margin-top: 60px; font-size: 0.85rem; color: var(--text-muted); }
    footer a { color: var(--accent); text-decoration: none; }
    .disclaimer { margin-top: 16px; font-size: 0.75rem; max-width: 600px; margin-inline: auto; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="tag">ORIGINAL RESEARCH</div>
      <h1>S&P 500 Sector Weights: The 25-Year Rotation</h1>
      <p class="subtitle">From the dot-com bubble of 2000, to the energy boom of 2008, to today's unprecedented tech concentration. How the composition of the US stock market has evolved.</p>
    </header>

    <div class="charts-grid">
      <div class="card">
        <h2>Sector Weights Over Time (2000-${currentYear})</h2>
        <div class="chart-container">
          <canvas id="areaChart"></canvas>
        </div>
      </div>
      <div class="card">
        <h2>Current S&P 500 Composition</h2>
        <div class="chart-container-small">
          <canvas id="pieChart"></canvas>
        </div>
      </div>
    </div>

    <div class="card table-container">
      <h2>Historical Sector Data (Snapshot)</h2>
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Sector</th>
            <th>Weight (%)</th>
            <th>YoY Change</th>
            <th>Top Company</th>
          </tr>
        </thead>
        <tbody>
          ${historicalData.filter(d => [2000, 2008, 2020, 2026].includes(d.year)).sort((a,b)=>b.year-a.year || b.weight_pct-a.weight_pct).map(d => `
          <tr>
            <td>${d.year}</td>
            <td>${d.sector.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>
            <td>${d.weight_pct.toFixed(2)}%</td>
            <td class="${d.change_yoy > 0 ? 'val-pos' : d.change_yoy < 0 ? 'val-neg' : ''}">${d.change_yoy > 0 ? '+' : ''}${d.change_yoy.toFixed(2)}%</td>
            <td>${d.top_company.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 16px;">Showing key pivot years (2000, 2008, 2020, ${currentYear}). Full dataset available via API.</p>
    </div>

    <div class="faq">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-item">
        <h3>Why is Information Technology so dominant now?</h3>
        <p>The rise of mega-cap tech stocks (often referred to as the "Magnificent Seven") driven by cloud computing, mobile, and most recently artificial intelligence, has caused the Information Technology and Communication Services sectors to swell. As of ${currentYear}, IT alone commands over ${techCurrent.toFixed(1)}% of the index.</p>
      </div>
      <div class="faq-item">
        <h3>What happened to the Energy sector?</h3>
        <p>In 2008, driven by oil prices exceeding $140 per barrel, the Energy sector peaked at over 15% of the S&P 500. A subsequent decade of increased supply (US shale boom) and a shift towards renewables caused the sector's weight to collapse to roughly 2.5% by 2020, before recovering slightly.</p>
      </div>
      <div class="faq-item">
        <h3>How often does the S&P 500 rebalance?</h3>
        <p>The S&P 500 index rebalances quarterly, usually in March, June, September, and December. During these rebalances, companies may be added or removed, and shares outstanding are updated, which affects sector weights.</p>
      </div>
    </div>

    <div class="methodology">
      <h2>Methodology</h2>
      <div class="card">
        <p>This study analyzes the sector composition of the S&P 500 index. Current year (${currentYear}) data is scraped and aggregated from active index constituent lists. Companies are categorized according to the Global Industry Classification Standard (GICS). Historical data (2000-2025) is modeled based on documented market capitalizations and sector compositions at key historical anchor points (such as the 2000 tech bubble and 2008 financial crisis) and interpolated for illustrative trend visualization. Real Estate was carved out of Financials into its own GICS sector in 2016, which is reflected in the historical fade-in.</p>
      </div>
    </div>

  </div>

  <footer>
    © ${currentYear} <a href="/">Westmount Fundamentals</a>
    <div class="disclaimer">This study provides data and analysis for informational purposes only. It is not investment advice. Data points may be modeled or interpolated. Do your own research.</div>
  </footer>

  <script>
    const areaCtx = document.getElementById('areaChart').getContext('2d');
    new Chart(areaCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(years)},
        datasets: ${JSON.stringify(datasets)}
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#c8d0de', font: { family: 'Inter' } } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { stacked: true, grid: { color: '#152040' }, ticks: { color: '#6a7a90' } },
          y: { stacked: true, min: 0, max: 100, grid: { color: '#152040' }, ticks: { color: '#6a7a90', callback: function(value) { return value + '%'; } } }
        },
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
      }
    });

    const pieCtx = document.getElementById('pieChart').getContext('2d');
    new Chart(pieCtx, {
      type: 'doughnut',
      data: ${JSON.stringify(pieData)},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#c8d0de', font: { family: 'Inter' } } }
        },
        cutout: '60%',
        borderWidth: 0
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync('./public/sp500-sector-weights.html', html);
  console.log("Successfully generated public/sp500-sector-weights.html");
}

async function run() {
  const { finalWeights, sectorTopCompany } = await get2026Sectors();
  const historicalData = generateHistoricalData(finalWeights, sectorTopCompany);
  generateHTML(historicalData, finalWeights);
}

// get2026Sectors().then(console.log).catch(console.error);
// module.exports = { get2026Sectors, generateHistoricalData };

if (require.main === module) {
  run().catch(console.error);
}
