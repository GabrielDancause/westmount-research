const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('public/bond-yield-calculator.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;

// Wait a bit for DOMContentLoaded
setTimeout(() => {
  try {
    const doc = window.document;

    // Set some test values
    doc.getElementById('face-value').value = '1000';
    doc.getElementById('current-price').value = '950';
    doc.getElementById('coupon-rate').value = '4.5';
    doc.getElementById('years-maturity').value = '10';
    doc.getElementById('payment-freq').value = '2'; // semi-annual

    // Submit form
    doc.getElementById('bond-form').dispatchEvent(new window.Event('submit'));

    // Check YTM (Should be approx 5.14%)
    const ytmStr = doc.getElementById('res-ytm').textContent;
    console.log('YTM String:', ytmStr);
    assert(ytmStr.includes('5.14'), `Expected YTM to be ~5.14%, got ${ytmStr}`);

    // Check Current Yield (4.5% of 1000 is 45, 45/950 = 4.737%)
    const cyStr = doc.getElementById('res-cy').textContent;
    console.log('Current Yield String:', cyStr);
    assert(cyStr.includes('4.73'), `Expected CY to be ~4.73%, got ${cyStr}`);

    // Test comparison list
    doc.getElementById('btn-save').click();
    const rows = doc.querySelectorAll('#comp-table tbody tr');
    assert.strictEqual(rows.length, 1, 'Expected 1 row in comparison table');

    console.log("All bond calculator tests passed.");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}, 500);
