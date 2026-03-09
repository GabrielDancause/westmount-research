const fs = require('fs');
const path = require('path');

// Target 150+ companies from the S&P 500
const companies = [
  {"ticker":"MMM","company":"3M","sector":"Industrials"},
  {"ticker":"AOS","company":"A. O. Smith","sector":"Industrials"},
  {"ticker":"ABT","company":"Abbott Laboratories","sector":"Health Care"},
  {"ticker":"ABBV","company":"AbbVie","sector":"Health Care"},
  {"ticker":"ACN","company":"Accenture","sector":"Information Technology"},
  {"ticker":"ADBE","company":"Adobe Inc.","sector":"Information Technology"},
  {"ticker":"AMD","company":"Advanced Micro Devices","sector":"Information Technology"},
  {"ticker":"AES","company":"AES Corporation","sector":"Utilities"},
  {"ticker":"AFL","company":"Aflac","sector":"Financials"},
  {"ticker":"A","company":"Agilent Technologies","sector":"Health Care"},
  {"ticker":"APD","company":"Air Products and Chemicals","sector":"Materials"},
  {"ticker":"ABNB","company":"Airbnb","sector":"Consumer Discretionary"},
  {"ticker":"AKAM","company":"Akamai Technologies","sector":"Information Technology"},
  {"ticker":"ALB","company":"Albemarle Corporation","sector":"Materials"},
  {"ticker":"ARE","company":"Alexandria Real Estate Equities","sector":"Real Estate"},
  {"ticker":"ALGN","company":"Align Technology","sector":"Health Care"},
  {"ticker":"ALLE","company":"Allegion","sector":"Industrials"},
  {"ticker":"LNT","company":"Alliant Energy","sector":"Utilities"},
  {"ticker":"ALL","company":"Allstate","sector":"Financials"},
  {"ticker":"GOOGL","company":"Alphabet Inc. (Class A)","sector":"Communication Services"},
  {"ticker":"GOOG","company":"Alphabet Inc. (Class C)","sector":"Communication Services"},
  {"ticker":"MO","company":"Altria","sector":"Consumer Staples"},
  {"ticker":"AMZN","company":"Amazon","sector":"Consumer Discretionary"},
  {"ticker":"AMCR","company":"Amcor","sector":"Materials"},
  {"ticker":"AEE","company":"Ameren","sector":"Utilities"},
  {"ticker":"AEP","company":"American Electric Power","sector":"Utilities"},
  {"ticker":"AXP","company":"American Express","sector":"Financials"},
  {"ticker":"AIG","company":"American International Group","sector":"Financials"},
  {"ticker":"AMT","company":"American Tower","sector":"Real Estate"},
  {"ticker":"AWK","company":"American Water Works","sector":"Utilities"},
  {"ticker":"AMP","company":"Ameriprise Financial","sector":"Financials"},
  {"ticker":"AME","company":"Ametek","sector":"Industrials"},
  {"ticker":"AMGN","company":"Amgen","sector":"Health Care"},
  {"ticker":"APH","company":"Amphenol","sector":"Information Technology"},
  {"ticker":"ADI","company":"Analog Devices","sector":"Information Technology"},
  {"ticker":"AON","company":"Aon","sector":"Financials"},
  {"ticker":"APA","company":"APA Corporation","sector":"Energy"},
  {"ticker":"APO","company":"Apollo Global Management","sector":"Financials"},
  {"ticker":"AAPL","company":"Apple Inc.","sector":"Information Technology"},
  {"ticker":"AMAT","company":"Applied Materials","sector":"Information Technology"},
  {"ticker":"APP","company":"AppLovin","sector":"Information Technology"},
  {"ticker":"APTV","company":"Aptiv","sector":"Consumer Discretionary"},
  {"ticker":"ACGL","company":"Arch Capital Group","sector":"Financials"},
  {"ticker":"ADM","company":"Archer-Daniels-Midland","sector":"Consumer Staples"},
  {"ticker":"ARES","company":"Ares Management","sector":"Financials"},
  {"ticker":"ANET","company":"Arista Networks","sector":"Information Technology"},
  {"ticker":"AJG","company":"Arthur J. Gallagher & Co.","sector":"Financials"},
  {"ticker":"AIZ","company":"Assurant","sector":"Financials"},
  {"ticker":"T","company":"AT&T","sector":"Communication Services"},
  {"ticker":"ATO","company":"Atmos Energy","sector":"Utilities"},
  {"ticker":"ADSK","company":"Autodesk","sector":"Information Technology"},
  {"ticker":"ADP","company":"Automatic Data Processing","sector":"Industrials"},
  {"ticker":"AZO","company":"AutoZone","sector":"Consumer Discretionary"},
  {"ticker":"AVB","company":"AvalonBay Communities","sector":"Real Estate"},
  {"ticker":"AVY","company":"Avery Dennison","sector":"Materials"},
  {"ticker":"AXON","company":"Axon Enterprise","sector":"Industrials"},
  {"ticker":"BKR","company":"Baker Hughes","sector":"Energy"},
  {"ticker":"BALL","company":"Ball Corporation","sector":"Materials"},
  {"ticker":"BAC","company":"Bank of America","sector":"Financials"},
  {"ticker":"BAX","company":"Baxter International","sector":"Health Care"},
  {"ticker":"BDX","company":"Becton Dickinson","sector":"Health Care"},
  {"ticker":"BRK.B","company":"Berkshire Hathaway","sector":"Financials"},
  {"ticker":"BBY","company":"Best Buy","sector":"Consumer Discretionary"},
  {"ticker":"TECH","company":"Bio-Techne","sector":"Health Care"},
  {"ticker":"BIIB","company":"Biogen","sector":"Health Care"},
  {"ticker":"BLK","company":"BlackRock","sector":"Financials"},
  {"ticker":"BX","company":"Blackstone Inc.","sector":"Financials"},
  {"ticker":"BK","company":"BNY Mellon","sector":"Financials"},
  {"ticker":"BA","company":"Boeing","sector":"Industrials"},
  {"ticker":"BKNG","company":"Booking Holdings","sector":"Consumer Discretionary"},
  {"ticker":"BSX","company":"Boston Scientific","sector":"Health Care"},
  {"ticker":"BMY","company":"Bristol Myers Squibb","sector":"Health Care"},
  {"ticker":"AVGO","company":"Broadcom Inc.","sector":"Information Technology"},
  {"ticker":"BR","company":"Broadridge Financial Solutions","sector":"Industrials"},
  {"ticker":"BRO","company":"Brown & Brown","sector":"Financials"},
  {"ticker":"BF.B","company":"Brown–Forman","sector":"Consumer Staples"},
  {"ticker":"BLDR","company":"Builders FirstSource","sector":"Industrials"},
  {"ticker":"BG","company":"Bunge Global SA","sector":"Consumer Staples"},
  {"ticker":"BXP","company":"BXP Inc.","sector":"Real Estate"},
  {"ticker":"CHRW","company":"C.H. Robinson","sector":"Industrials"},
  {"ticker":"CDNS","company":"Cadence Design Systems","sector":"Information Technology"},
  {"ticker":"CPT","company":"Camden Property Trust","sector":"Real Estate"},
  {"ticker":"CPB","company":"Campbell Soup Company","sector":"Consumer Staples"},
  {"ticker":"COF","company":"Capital One","sector":"Financials"},
  {"ticker":"CAH","company":"Cardinal Health","sector":"Health Care"},
  {"ticker":"CCL","company":"Carnival","sector":"Consumer Discretionary"},
  {"ticker":"CARR","company":"Carrier Global","sector":"Industrials"},
  {"ticker":"CVNA","company":"Carvana","sector":"Consumer Discretionary"},
  {"ticker":"CAT","company":"Caterpillar Inc.","sector":"Industrials"},
  {"ticker":"CBOE","company":"Cboe Global Markets","sector":"Financials"},
  {"ticker":"CBRE","company":"CBRE Group","sector":"Real Estate"},
  {"ticker":"CDW","company":"CDW","sector":"Information Technology"},
  {"ticker":"COR","company":"Cencora","sector":"Health Care"},
  {"ticker":"CNC","company":"Centene Corporation","sector":"Health Care"},
  {"ticker":"CNP","company":"CenterPoint Energy","sector":"Utilities"},
  {"ticker":"CF","company":"CF Industries","sector":"Materials"},
  {"ticker":"CRL","company":"Charles River Laboratories","sector":"Health Care"},
  {"ticker":"SCHW","company":"Charles Schwab Corporation","sector":"Financials"},
  {"ticker":"CHTR","company":"Charter Communications","sector":"Communication Services"},
  {"ticker":"CVX","company":"Chevron Corporation","sector":"Energy"},
  {"ticker":"CMG","company":"Chipotle Mexican Grill","sector":"Consumer Discretionary"},
  {"ticker":"CB","company":"Chubb Limited","sector":"Financials"},
  {"ticker":"CHD","company":"Church & Dwight","sector":"Consumer Staples"},
  {"ticker":"CIEN","company":"Ciena","sector":"Information Technology"},
  {"ticker":"CI","company":"Cigna","sector":"Health Care"},
  {"ticker":"CINF","company":"Cincinnati Financial","sector":"Financials"},
  {"ticker":"CTAS","company":"Cintas","sector":"Industrials"},
  {"ticker":"CSCO","company":"Cisco","sector":"Information Technology"},
  {"ticker":"C","company":"Citigroup","sector":"Financials"},
  {"ticker":"CFG","company":"Citizens Financial Group","sector":"Financials"},
  {"ticker":"CLX","company":"Clorox","sector":"Consumer Staples"},
  {"ticker":"CME","company":"CME Group","sector":"Financials"},
  {"ticker":"CMS","company":"CMS Energy","sector":"Utilities"},
  {"ticker":"KO","company":"Coca-Cola Company (The)","sector":"Consumer Staples"},
  {"ticker":"CTSH","company":"Cognizant","sector":"Information Technology"},
  {"ticker":"CL","company":"Colgate-Palmolive","sector":"Consumer Staples"},
  {"ticker":"CMCSA","company":"Comcast","sector":"Communication Services"},
  {"ticker":"CAG","company":"Conagra Brands","sector":"Consumer Staples"},
  {"ticker":"COP","company":"ConocoPhillips","sector":"Energy"},
  {"ticker":"ED","company":"Consolidated Edison","sector":"Utilities"},
  {"ticker":"STZ","company":"Constellation Brands","sector":"Consumer Staples"},
  {"ticker":"CEG","company":"Constellation Energy","sector":"Utilities"},
  {"ticker":"COO","company":"CooperCompanies","sector":"Health Care"},
  {"ticker":"CPRT","company":"Copart","sector":"Industrials"},
  {"ticker":"GLW","company":"Corning Inc.","sector":"Information Technology"},
  {"ticker":"CPAY","company":"Corpay","sector":"Financials"},
  {"ticker":"CTVA","company":"Corteva","sector":"Materials"},
  {"ticker":"CSGP","company":"CoStar Group","sector":"Real Estate"},
  {"ticker":"COST","company":"Costco","sector":"Consumer Staples"},
  {"ticker":"CTRA","company":"Coterra","sector":"Energy"},
  {"ticker":"CRWD","company":"CrowdStrike","sector":"Information Technology"},
  {"ticker":"CCI","company":"Crown Castle","sector":"Real Estate"},
  {"ticker":"CSX","company":"CSX Corporation","sector":"Industrials"},
  {"ticker":"CMI","company":"Cummins","sector":"Industrials"},
  {"ticker":"CVS","company":"CVS Health","sector":"Health Care"},
  {"ticker":"DHR","company":"Danaher Corporation","sector":"Health Care"},
  {"ticker":"DRI","company":"Darden Restaurants","sector":"Consumer Discretionary"},
  {"ticker":"DVA","company":"DaVita Inc.","sector":"Health Care"},
  {"ticker":"DAY","company":"Dayforce","sector":"Industrials"},
  {"ticker":"DECK","company":"Deckers Brands","sector":"Consumer Discretionary"},
  {"ticker":"DE","company":"John Deere","sector":"Industrials"},
  {"ticker":"DAL","company":"Delta Air Lines","sector":"Industrials"},
  {"ticker":"DVN","company":"Devon Energy","sector":"Energy"},
  {"ticker":"DXCM","company":"Dexcom","sector":"Health Care"},
  {"ticker":"FANG","company":"Diamondback Energy","sector":"Energy"},
  {"ticker":"DLR","company":"Digital Realty","sector":"Real Estate"},
  {"ticker":"DFS","company":"Discover Financial","sector":"Financials"},
  {"ticker":"DG","company":"Dollar General","sector":"Consumer Discretionary"},
  {"ticker":"DLTR","company":"Dollar Tree","sector":"Consumer Discretionary"}
];

async function generateHtml(data) {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Institutional Ownership: Most & Least Owned Stocks 2026</title>
    <meta name="description" content="Discover which stocks institutions love and avoid in 2026. High institutional ownership means smart money conviction, while low ownership reveals overlooked opportunities.">
    <link rel="canonical" href="https://westmountresearch.com/institutional-ownership">
    <style>
        body {
            background-color: #060a12;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        header {
            background-color: #04070d;
            padding: 2rem;
            text-align: center;
            border-bottom: 2px solid #4a8fe7;
        }
        h1, h2, h3 {
            color: #4a8fe7;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
            background-color: #0a111e;
            border-radius: 8px;
            overflow: hidden;
        }
        th, td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #1a2639;
        }
        th {
            background-color: #0d172a;
            color: #4a8fe7;
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        tr:hover {
            background-color: #121c2d;
        }
        .accent {
            color: #4a8fe7;
        }
        .faq, .methodology, .disclaimer {
            margin-top: 3rem;
            padding: 2rem;
            background-color: #0a111e;
            border-radius: 8px;
        }
        .faq-item {
            margin-bottom: 1.5rem;
        }
        .faq-item h3 {
            margin-bottom: 0.5rem;
            color: #ffffff;
        }
        footer {
            text-align: center;
            padding: 2rem;
            background-color: #04070d;
            margin-top: 3rem;
            border-top: 1px solid #1a2639;
        }
        a {
            color: #4a8fe7;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Institutional Ownership: Most & Least Owned Stocks 2026",
      "description": "Comprehensive 2026 study on institutional ownership across top US stocks, detailing smart money conviction and potential overlooked opportunities.",
      "author": {
        "@type": "Organization",
        "name": "Westmount Research"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Westmount Research",
        "logo": {
          "@type": "ImageObject",
          "url": "https://westmountresearch.com/logo.png"
        }
      },
      "datePublished": "2026-01-01",
      "dateModified": "2026-01-01"
    }
    </script>
</head>
<body>

<header>
    <h1>Institutional Ownership: Most & Least Owned Stocks 2026</h1>
    <p>A Westmount Research Study</p>
</header>

<div class="container">
    <p>Which stocks do institutions love? Which do they avoid? High institutional ownership indicates smart money conviction, whereas low ownership may signal potential overlooked opportunities. Our 2026 study breaks down the data.</p>

    <div style="overflow-x: auto;">
        <table>
            <thead>
                <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Sector</th>
                    <th>Inst. Ownership (%)</th>
                    <th>Number of Inst.</th>
                    <th>Top Holder</th>
                    <th>Top Holder (%)</th>
                    <th>Insider Ownership (%)</th>
                    <th>Market Cap ($B)</th>
                    <th>P/E Ratio</th>
                    <th>Short Interest (%)</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                <tr>
                    <td><strong>${d.ticker}</strong></td>
                    <td>${d.company}</td>
                    <td>${d.sector}</td>
                    <td class="accent">${d.instOwnershipPct !== null ? d.instOwnershipPct.toFixed(2) + '%' : 'N/A'}</td>
                    <td>${d.numberOfInstitutions !== null ? d.numberOfInstitutions.toLocaleString() : 'N/A'}</td>
                    <td>${d.topHolder || 'N/A'}</td>
                    <td>${d.topHolderPct !== null ? d.topHolderPct.toFixed(2) + '%' : 'N/A'}</td>
                    <td>${d.insiderOwnershipPct !== null ? d.insiderOwnershipPct.toFixed(2) + '%' : 'N/A'}</td>
                    <td>${d.marketCapB !== null ? '$' + d.marketCapB.toFixed(2) : 'N/A'}</td>
                    <td>${d.peRatio !== null ? d.peRatio.toFixed(2) : 'N/A'}</td>
                    <td>${d.shortInterestPct !== null ? d.shortInterestPct.toFixed(2) + '%' : 'N/A'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="faq">
        <h2>Frequently Asked Questions</h2>

        <div class="faq-item">
            <h3>What does high institutional ownership mean?</h3>
            <p>High institutional ownership typically signifies that large financial entities (like mutual funds, pension funds, and hedge funds) have strong conviction in a company's fundamentals and future prospects. It implies a vote of confidence from the "smart money."</p>
        </div>

        <div class="faq-item">
            <h3>Which stocks have the highest institutional ownership?</h3>
            <p>Typically, large-cap, established companies in the S&P 500 feature the highest institutional ownership percentages, often exceeding 80%. See our data table above for the exact 2026 figures.</p>
        </div>

        <div class="faq-item">
            <h3>Is high institutional ownership good?</h3>
            <p>Generally, yes. It indicates professional endorsement and provides stock stability. However, extremely high ownership (e.g., >90%) can lead to heightened volatility if multiple institutions decide to sell simultaneously ("crowded trade").</p>
        </div>

        <div class="faq-item">
            <h3>What stocks do hedge funds own?</h3>
            <p>Hedge funds frequently target technology, healthcare, and consumer discretionary sectors, seeking high-growth opportunities or mispriced assets. Look at the "Top Holder" column in our table to see major institutional players.</p>
        </div>

        <div class="faq-item">
            <h3>What percentage of stocks are owned by institutions?</h3>
            <p>In the modern U.S. stock market, institutions collectively own approximately 70-80% of the market value of publicly traded companies, a figure that continues to remain strong in 2026.</p>
        </div>
    </div>

    <div class="methodology">
        <h2>Methodology</h2>
        <p>Data for this 2026 study was sourced directly from public financial APIs including Yahoo Finance. Our analysis encompasses top US equities, evaluating institutional percentages, top holders, and relevant valuation metrics. We prioritize verifiable, null-over-fake data processing. Invalid ownership percentages were bounded to standard constraints (0-100% for institutions, 0-80% for insiders).</p>
    </div>

    <div class="disclaimer">
        <h2>Disclaimer</h2>
        <p>The information provided in this study is for educational and informational purposes only and does not constitute financial or investment advice. Westmount Research is not a registered investment advisor. Always conduct your own due diligence before making investment decisions.</p>
    </div>
</div>

<footer>
    <p>&copy; 2026 Westmount Research. All rights reserved.</p>
</footer>

</body>
</html>`;

    fs.mkdirSync(path.join(__dirname, '../public'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '../public/institutional-ownership.html'), htmlContent);
    console.log('Successfully generated public/institutional-ownership.html');
}

async function run() {
  const { default: YahooFinance } = await import('yahoo-finance2');
  const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

  let validCount = 0;
  let finalData = [];

  for (let i = 0; i < companies.length; i++) {
    // We only need 80+, but let's grab around 100 just to be safe
    if (validCount >= 100) break;

    const comp = companies[i];
    console.log(`Fetching ${comp.ticker}... (${validCount} / 100)`);
    try {
        const result = await yahooFinance.quoteSummary(comp.ticker.replace('.', '-'), {
            modules: [
                'summaryDetail', 'defaultKeyStatistics', 'price',
                'institutionOwnership', 'majorHoldersBreakdown'
            ]
        });

        let instOwnershipPct = null;
        if (result.majorHoldersBreakdown && result.majorHoldersBreakdown.institutionsPercentHeld !== undefined) {
             instOwnershipPct = result.majorHoldersBreakdown.institutionsPercentHeld * 100;
             if (instOwnershipPct > 100) instOwnershipPct = 100;
             if (instOwnershipPct < 0) instOwnershipPct = 0;
        }

        let insiderOwnershipPct = null;
        if (result.majorHoldersBreakdown && result.majorHoldersBreakdown.insidersPercentHeld !== undefined) {
            insiderOwnershipPct = result.majorHoldersBreakdown.insidersPercentHeld * 100;
            if (insiderOwnershipPct > 80) insiderOwnershipPct = 80;
            if (insiderOwnershipPct < 0) insiderOwnershipPct = 0;
        }

        let numberOfInstitutions = null;
        if (result.majorHoldersBreakdown && result.majorHoldersBreakdown.institutionsCount !== undefined) {
            numberOfInstitutions = result.majorHoldersBreakdown.institutionsCount;
        }

        let topHolder = null;
        let topHolderPct = null;
        if (result.institutionOwnership && result.institutionOwnership.ownershipList && result.institutionOwnership.ownershipList.length > 0) {
             const top = result.institutionOwnership.ownershipList.sort((a,b) => b.pctHeld - a.pctHeld)[0];
             topHolder = top.organization || null;
             if (top.pctHeld !== undefined) {
                 topHolderPct = top.pctHeld * 100;
             }
        }

        let marketCapB = null;
        if (result.price && result.price.marketCap !== undefined) {
            marketCapB = result.price.marketCap / 1e9;
        } else if (result.summaryDetail && result.summaryDetail.marketCap !== undefined) {
            marketCapB = result.summaryDetail.marketCap / 1e9;
        }

        let peRatio = null;
        if (result.summaryDetail && result.summaryDetail.trailingPE !== undefined) {
            peRatio = result.summaryDetail.trailingPE;
        }

        let shortInterestPct = null;
        if (result.defaultKeyStatistics && result.defaultKeyStatistics.shortPercentOfFloat !== undefined) {
            shortInterestPct = result.defaultKeyStatistics.shortPercentOfFloat * 100;
        }

        // Ensure we only include valid stocks with essential data
        if (instOwnershipPct !== null && marketCapB !== null && instOwnershipPct >= 0) {
            const data = {
                 ticker: comp.ticker,
                 company: comp.company,
                 sector: comp.sector,
                 instOwnershipPct,
                 numberOfInstitutions,
                 topHolder,
                 topHolderPct,
                 insiderOwnershipPct,
                 marketCapB,
                 peRatio,
                 shortInterestPct
            };
            finalData.push(data);
            validCount++;
        }
    } catch(e) {
        console.error(`Error for ${comp.ticker}: ${e.message}`);
    }
  }

  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../data/institutional-ownership.json'), JSON.stringify(finalData, null, 2));
  console.log(`Saved ${finalData.length} records to data/institutional-ownership.json`);

  await generateHtml(finalData);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
