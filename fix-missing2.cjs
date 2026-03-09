const fs = require('fs');

async function run() {
    const file = 'data/dividend-yield-vs-growth.json';
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    // Fall back to 0 for consecutive years if null after fixing
    // And for missing5y, also fallback to 0 or null is fine.

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Ready.`);
}
run();
