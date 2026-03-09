const fs = require('fs');

const data = JSON.parse(fs.readFileSync('pb_data.json', 'utf8'));

// Filter out companies with invalid/null pb_ratio
const validData = data.filter(d => d.pb_ratio !== null && !isNaN(d.pb_ratio) && d.pb_ratio > 0);

// Sort by PB ratio ascending
validData.sort((a, b) => a.pb_ratio - b.pb_ratio);

// Group by sector
const sectors = {};
validData.forEach(d => {
    if (!sectors[d.sector]) {
        sectors[d.sector] = [];
    }
    sectors[d.sector].push(d);
});

// Calculate medians
const sectorMedians = [];
for (const [sector, companies] of Object.entries(sectors)) {
    const sorted = [...companies].sort((a, b) => a.pb_ratio - b.pb_ratio);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid].pb_ratio : (sorted[mid - 1].pb_ratio + sorted[mid].pb_ratio) / 2;
    sectorMedians.push({ sector, median, count: companies.length });
}

// Sort sector medians descending
sectorMedians.sort((a, b) => b.median - a.median);

const lowestPBRatio = validData[0].pb_ratio.toFixed(2);
const lowestCompany = validData[0].company;

const escapeHTML = (str) => {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
};

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Price-to-Book Ratio Rankings by Sector 2026",
    "description": "Analyze price-to-book (P/B) ratios across S&P 500 sectors. Discover deep value stocks with P/B below 1, sector medians, and outliers.",
    "author": {
        "@type": "Organization",
        "name": "Westmount Fundamentals"
    },
    "datePublished": new Date().toISOString().split('T')[0]
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Price-to-Book Ratio Rankings by Sector 2026 | Westmount Fundamentals</title>
    <meta name="description" content="Analyze price-to-book (P/B) ratios across S&P 500 sectors. Discover deep value stocks with P/B below 1, sector medians, and outliers.">

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
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 24px;
        }

        header {
            text-align: center;
            margin-bottom: 60px;
        }

        h1 {
            font-size: 3rem;
            font-weight: 900;
            color: #fff;
            margin-bottom: 20px;
            letter-spacing: -1px;
        }

        .subtitle {
            font-size: 1.2rem;
            color: #5a6a80;
            max-width: 800px;
            margin: 0 auto;
        }

        h2 {
            font-size: 2rem;
            color: #fff;
            margin: 40px 0 20px;
        }

        .card {
            background: #0a1020;
            border: 1px solid #152040;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 40px;
        }

        .chart-container {
            margin: 40px 0;
            padding: 20px;
            background: #0a1020;
            border: 1px solid #152040;
            border-radius: 12px;
        }

        .bar-chart {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .bar-row {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .bar-label {
            width: 200px;
            text-align: right;
            font-weight: bold;
            font-size: 0.9rem;
        }

        .bar-wrapper {
            flex-grow: 1;
            background: #152040;
            height: 24px;
            border-radius: 4px;
            overflow: hidden;
            display: flex;
            align-items: center;
        }

        .bar {
            height: 100%;
            background: #4a8fe7;
            display: flex;
            align-items: center;
            padding-left: 10px;
            color: #fff;
            font-size: 0.85rem;
            font-weight: bold;
            min-width: 40px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: #0a1020;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #152040;
        }

        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #152040;
        }

        th {
            background: #0d1428;
            color: #4a8fe7;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 1px;
            cursor: pointer;
        }

        th:hover {
            background: #152040;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: #0d1428;
        }

        .ticker {
            font-weight: bold;
            color: #fff;
        }

        .deep-value {
            color: #4a8fe7;
            font-weight: bold;
        }

        .faq-item {
            margin-bottom: 25px;
        }

        .faq-item h3 {
            color: #fff;
            margin-bottom: 10px;
            font-size: 1.2rem;
        }

        .footer {
            text-align: center;
            padding: 50px 24px;
            font-size: 0.85rem;
            color: #3a4a5a;
            border-top: 1px solid #152040;
            margin-top: 60px;
        }
        .footer a { color: #4a8fe7; text-decoration: none; }

        .methodology {
            font-size: 0.9rem;
            color: #6a7a90;
        }

        /* Table Sort Icons */
        th::after {
            content: '\\25B2\\25BC';
            font-size: 0.6em;
            margin-left: 5px;
            opacity: 0.3;
        }
        th.asc::after { content: '\\25B2'; opacity: 1; }
        th.desc::after { content: '\\25BC'; opacity: 1; }

    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Price-to-Book Ratio Rankings by Sector 2026</h1>
            <p class="subtitle">A comprehensive analysis of price-to-book (P/B) ratios across S&P 500 sectors. Discover potential deep value stocks trading below book value and analyze sector-wide valuation trends.</p>
        </header>

        <section class="card">
            <h2>Sector Medians Comparison</h2>
            <p>Comparing median Price-to-Book ratios across all GICS sectors. A lower P/B generally indicates a sector may be undervalued relative to its assets.</p>

            <div class="chart-container">
                <div class="bar-chart">
                    ${sectorMedians.map(s => {
                        const maxMedian = sectorMedians[0].median;
                        const width = (s.median / maxMedian) * 100;
                        return `
                        <div class="bar-row">
                            <div class="bar-label">${escapeHTML(s.sector)}</div>
                            <div class="bar-wrapper">
                                <div class="bar" style="width: ${width}%">${s.median.toFixed(2)}</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </section>

        <section>
            <h2>S&P 500 Companies by P/B Ratio</h2>
            <p style="margin-bottom: 15px">Showing ${validData.length} companies with available data. P/B ratios below 1.0 are highlighted as historical signals of deep value.</p>

            <div style="overflow-x: auto;">
                <table id="dataTable">
                    <thead>
                        <tr>
                            <th data-sort="ticker">Ticker</th>
                            <th data-sort="company">Company</th>
                            <th data-sort="sector">Sector</th>
                            <th data-sort="price">Price ($)</th>
                            <th data-sort="book_value">Book Value/Share ($)</th>
                            <th data-sort="pb_ratio" class="asc">P/B Ratio</th>
                            <th data-sort="roe">ROE (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${validData.map(d => `
                        <tr>
                            <td class="ticker">${escapeHTML(d.ticker)}</td>
                            <td>${escapeHTML(d.company)}</td>
                            <td>${escapeHTML(d.sector)}</td>
                            <td>${d.price !== null ? d.price.toFixed(2) : '-'}</td>
                            <td>${d.book_value_per_share !== null ? d.book_value_per_share.toFixed(2) : '-'}</td>
                            <td class="${d.pb_ratio < 1 ? 'deep-value' : ''}">${d.pb_ratio.toFixed(2)}</td>
                            <td>${d.roe !== null ? (d.roe * 100).toFixed(2) + '%' : '-'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <section class="card" style="margin-top: 60px;">
            <h2>Frequently Asked Questions</h2>

            <div class="faq-item">
                <h3>What is the Price-to-Book (P/B) ratio?</h3>
                <p>The Price-to-Book ratio compares a company's current market price to its book value per share. Book value is essentially the net asset value of a company (total assets minus total liabilities). It represents what would theoretically be left if the company liquidated all assets and paid off all debts.</p>
            </div>

            <div class="faq-item">
                <h3>Why is a P/B ratio below 1 significant?</h3>
                <p>A P/B ratio below 1 indicates that the stock is trading for less than the value of its assets. Historically, this is considered a signal of "deep value," suggesting the market may be undervaluing the company, or that there are fundamental issues with the business's ability to generate returns on its assets.</p>
            </div>

            <div class="faq-item">
                <h3>Why do some sectors have naturally higher P/B ratios?</h3>
                <p>Technology and healthcare companies often have high P/B ratios because their primary assets are intangible (intellectual property, patents, brand value, software), which aren't fully reflected on the balance sheet. In contrast, financial and industrial companies have significant tangible assets, leading to naturally lower P/B ratios.</p>
            </div>

            <div class="faq-item">
                <h3>Is a low P/B ratio always a good buy signal?</h3>
                <p>No. A low P/B can sometimes represent a "value trap." If a company has poor management, declining revenues, or assets that are incorrectly valued on the balance sheet (like obsolete inventory or bad loans), the low P/B is justified by poor fundamentals.</p>
            </div>

            <div class="faq-item">
                <h3>How does Return on Equity (ROE) relate to P/B?</h3>
                <p>ROE and P/B are closely related. A high ROE generally justifies a high P/B ratio because the company is efficiently generating profits from its equity. If a company has a low P/B but a high ROE, it might be an attractive value investment.</p>
            </div>
        </section>

        <section class="card">
            <h2>Methodology & Disclaimer</h2>
            <div class="methodology">
                <p><strong>Methodology:</strong> Data for this study was collected in early 2026 using financial data APIs including Yahoo Finance. The universe consists of currently active S&P 500 constituents. Companies missing valid Book Value or Market Price data were excluded from the analysis. Sector classifications follow standard GICS definitions provided by the data source. Sector medians are calculated using the available constituent data, minimizing the impact of extreme outliers.</p>
                <br>
                <p><strong>Disclaimer:</strong> The data and analysis provided in this report are for informational and educational purposes only. Westmount Fundamentals does not provide investment advice. Data may be delayed or contain errors. Always conduct your own due diligence before making investment decisions.</p>
            </div>
        </section>

        <div class="footer">
            © ${new Date().getFullYear()} <a href="/">westmount-research</a> · A <a href="https://gab.ae">GAB Ventures</a> property
        </div>
    </div>

    <script>
        // Table Sorting Logic
        document.addEventListener('DOMContentLoaded', function() {
            const table = document.getElementById('dataTable');
            const headers = table.querySelectorAll('th');
            const tbody = table.querySelector('tbody');

            let sortDirection = {};

            headers.forEach(header => {
                header.addEventListener('click', () => {
                    const sortKey = header.dataset.sort;

                    // Toggle sort direction
                    if (sortDirection[sortKey] === 'asc') {
                        sortDirection[sortKey] = 'desc';
                    } else {
                        sortDirection[sortKey] = 'asc';
                    }

                    const isAsc = sortDirection[sortKey] === 'asc';

                    // Reset all headers
                    headers.forEach(h => {
                        h.classList.remove('asc', 'desc');
                    });

                    // Set current header sort direction
                    header.classList.add(isAsc ? 'asc' : 'desc');

                    const rows = Array.from(tbody.querySelectorAll('tr'));

                    rows.sort((a, b) => {
                        let aVal, bVal;

                        // Get cell index
                        const cellIndex = Array.from(header.parentNode.children).indexOf(header);
                        const aCell = a.children[cellIndex].textContent.trim();
                        const bCell = b.children[cellIndex].textContent.trim();

                        // Parse values based on type
                        if (['price', 'book_value', 'pb_ratio', 'roe'].includes(sortKey)) {
                            aVal = parseFloat(aCell.replace(/[^0-9.-]/g, ''));
                            bVal = parseFloat(bCell.replace(/[^0-9.-]/g, ''));

                            // Handle NaNs
                            if (isNaN(aVal)) aVal = isAsc ? Infinity : -Infinity;
                            if (isNaN(bVal)) bVal = isAsc ? Infinity : -Infinity;
                        } else {
                            aVal = aCell.toLowerCase();
                            bVal = bCell.toLowerCase();
                        }

                        if (aVal < bVal) return isAsc ? -1 : 1;
                        if (aVal > bVal) return isAsc ? 1 : -1;
                        return 0;
                    });

                    rows.forEach(row => tbody.appendChild(row));
                });
            });
        });
    </script>
</body>
</html>`;

fs.writeFileSync('public/price-to-book.html', html);
console.log('Successfully generated public/price-to-book.html');
