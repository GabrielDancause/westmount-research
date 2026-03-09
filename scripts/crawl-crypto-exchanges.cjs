const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

async function run() {
  let btcPriceInUsd = 0;
  try {
    const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const btcData = await btcRes.json();
    btcPriceInUsd = btcData.bitcoin.usd;
    console.log(`Current BTC Price: $${btcPriceInUsd}`);
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    btcPriceInUsd = 60000; // Fallback
  }

  let page = 1;
  let allExchanges = [];

  while (true) {
    console.log(`Fetching page ${page}...`);
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/exchanges?page=${page}&per_page=100`);

      if (response.status === 429) {
          console.log('Rate limited! Waiting 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          continue;
      }

      const exchanges = await response.json();

      if (!exchanges || exchanges.length === 0) {
        console.log('No more exchanges, stopping pagination');
        break;
      }

      for (const ex of exchanges) {
        allExchanges.push({
          name: ex.name,
          id: ex.id,
          rank: ex.trust_score_rank || null,
          volume24hBTC: ex.trade_volume_24h_btc || null,
          volume24hUSD: ex.trade_volume_24h_btc ? ex.trade_volume_24h_btc * btcPriceInUsd : null,
          trustScore: ex.trust_score || null,
          yearEstablished: ex.year_established || null,
          country: ex.country || null,
          hasKYC: null, // API doesn't provide this clearly
          spotTradingPairs: null, // Not provided directly in this endpoint
          url: ex.url || null
        });
      }

      page++;

      // Add delay
      await new Promise(resolve => setTimeout(resolve, 3000)); // Be gentle to the API
    } catch (error) {
      console.error(`Error on page ${page}:`, error);
      break; // stop on other errors
    }
  }

  console.log(`Total exchanges collected: ${allExchanges.length}`);

  const crawlDate = new Date().toISOString().split('T')[0];
  const pagesProcessed = page - 1;

  const finalData = {
    crawlDate: crawlDate,
    methodology: `Paginated through CoinGecko API pages 1-${pagesProcessed} until no more results.`,
    pagesProcessed: pagesProcessed,
    totalExchanges: allExchanges.length,
    results: allExchanges
  };

  fs.writeFileSync('data/crypto-exchanges.json', JSON.stringify(finalData, null, 2));
  console.log('Saved data to data/crypto-exchanges.json');

  // HTML Generation

  let largestExchange = allExchanges.length > 0 ? allExchanges.reduce((prev, current) => {
      return (prev.volume24hBTC > current.volume24hBTC) ? prev : current
  }) : {name: 'N/A'};

  let countries = new Set();
  allExchanges.forEach(ex => {
      if (ex.country) countries.add(ex.country);
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cryptocurrency Exchanges Comprehensive List</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0a0b10;
            color: #ffffff;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #f39c12;
            text-align: center;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background-color: #111318;
            border: 1px solid #1e2030;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #f39c12;
        }
        .stat-label {
            font-size: 0.9em;
            color: #a0a0a0;
            margin-top: 5px;
        }
        .methodology {
            background-color: #111318;
            border: 1px solid #1e2030;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 40px;
        }
        .methodology h2 {
            color: #f39c12;
            margin-top: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background-color: #111318;
            border-radius: 8px;
            overflow: hidden;
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #1e2030;
        }
        th {
            background-color: #1e2030;
            color: #f39c12;
            font-weight: bold;
        }
        tr:last-child td {
            border-bottom: none;
        }
        tr:hover {
            background-color: #1a1c23;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cryptocurrency Exchanges Comprehensive List</h1>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${allExchanges.length}</div>
                <div class="stat-label">Total Exchanges Found</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${pagesProcessed}</div>
                <div class="stat-label">Pages Processed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${largestExchange.name}</div>
                <div class="stat-label">Largest by Volume</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${countries.size}</div>
                <div class="stat-label">Countries Represented</div>
            </div>
        </div>

        <div class="methodology">
            <h2>Methodology</h2>
            <p>${finalData.methodology}</p>
            <p>Data was collected on ${crawlDate} by querying the CoinGecko API starting at page 1 and continuously following the next pages until an empty result was returned, ensuring a comprehensive dataset beyond just the top exchanges.</p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Trust Score</th>
                    <th>24h Vol (BTC)</th>
                    <th>Country</th>
                    <th>Year Est.</th>
                </tr>
            </thead>
            <tbody>
                ${allExchanges.slice(0, 50).map(ex => `
                <tr>
                    <td>${ex.rank || '-'}</td>
                    <td>${ex.name}</td>
                    <td>${ex.trustScore || '-'}</td>
                    <td>${ex.volume24hBTC ? ex.volume24hBTC.toFixed(2) : '-'}</td>
                    <td>${ex.country || '-'}</td>
                    <td>${ex.yearEstablished || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        <p style="text-align: center; color: #a0a0a0; margin-top: 20px;">Showing top 50 exchanges. Full data contains ${allExchanges.length} records.</p>
    </div>
</body>
</html>`;

  fs.writeFileSync('public/crypto-exchange-test.html', htmlContent);
  console.log('Saved HTML to public/crypto-exchange-test.html');
}

run();
