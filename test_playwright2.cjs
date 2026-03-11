const { chromium } = require('playwright');
const http = require('http');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');

const serve = serveStatic('public');
const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res)));
server.listen(3000, async () => {
    console.log('Server running on port 3000');

    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Test Bond Yield Calculator
    await page.goto('http://localhost:3000/bond-yield-calculator.html');
    await page.screenshot({ path: 'bond_yield_calc_dates.png', fullPage: true });

    await browser.close();
    server.close();
});
