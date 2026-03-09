const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function run() {
  const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
  const btcData = await btcRes.json();
  console.log(btcData);
}

run();
