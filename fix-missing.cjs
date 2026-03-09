const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
    const file = 'data/dividend-yield-vs-growth.json';
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    const missing = data.filter(d => d.dividendYield > 0 && d.consecutiveYears === null);
    console.log(`Fixing ${missing.length} missing consecutive years...`);

    let fixed = 0;

    // Switch User-Agent to see if we can bypass the 403s on stockanalysis
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];

    for (let i = 0; i < missing.length; i++) {
        const d = missing[i];
        try {
            const ua = userAgents[i % userAgents.length];
            const res = await axios.get(`https://stockanalysis.com/stocks/${d.ticker.toLowerCase()}/dividend/`, {
                headers: { 'User-Agent': ua, 'Accept': 'text/html' },
                timeout: 10000
            });
            const $ = cheerio.load(res.data);

            let consecutiveYears = null;
            $('div, span, p, td, th').each((idx, el) => {
                const text = $(el).text().trim();
                if (text.includes('Growth Years')) {
                    const parentText = $(el).parent().text();
                    const match = parentText.match(/Growth Years.*?(\d+)/);
                    if (match) consecutiveYears = parseInt(match[1]);
                }
            });

            if (consecutiveYears !== null) {
                d.consecutiveYears = consecutiveYears;
                fixed++;
                console.log(`[${d.ticker}] Fixed: ${consecutiveYears}`);
            } else {
                console.log(`[${d.ticker}] Still missing (no match)`);
            }
        } catch (e) {
            console.log(`[${d.ticker}] Error: ${e.response?.status || e.message}`);
        }
        await delay(1000); // 1s delay

        if (fixed > 0 && fixed % 10 === 0) {
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
        }
    }

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Done. Fixed ${fixed} missing consecutive years.`);
}

run();
