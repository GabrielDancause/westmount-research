const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data-margins.json');
const outputPath = path.join(__dirname, '../public/profit-margins-industry.html');

const escapeHtml = (unsafe) => {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

const formatPercent = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return (val * 100).toFixed(1) + '%';
};

function generateHtml() {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const industries = data.industries;
    const currentYear = new Date().getFullYear();

    const chartData = industries.slice(0, 15).map(ind => ({
        label: ind.industry,
        data: ind.median_net_margin * 100,
        backgroundColor: '#4a8fe7'
    }));

    const chartDataJson = JSON.stringify(chartData);

    // Build the table rows
    let tableRows = '';
    industries.forEach((ind, i) => {
        tableRows += `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(ind.industry)}</strong><br><small style="color:#5a6a80;">${escapeHtml(ind.sector)}</small></td>
            <td style="color:#4a8fe7; font-weight:700;">${formatPercent(ind.median_net_margin)}</td>
            <td>${formatPercent(ind.median_operating_margin)}</td>
            <td>${ind.num_companies}</td>
            <td><small>${escapeHtml(ind.highest_margin_company)}</small></td>
            <td><small>${escapeHtml(ind.lowest_margin_company)}</small></td>
          </tr>
        `;
    });

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Profit Margins by Industry 2026",
        "description": "Compare net profit margins and operating margins across industries. Which industries are most/least profitable? Use S&P 500 data to show margins by GICS sector and sub-industry.",
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
        "datePublished": "2026-01-01",
        "dateModified": new Date().toISOString().split('T')[0]
    };

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profit Margins by Industry 2026 | Westmount Fundamentals</title>
    <meta name="description" content="Compare net profit margins and operating margins across industries. Which industries are most/least profitable? S&P 500 data by GICS sector and sub-industry.">

    <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
    </script>

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #060a12;
            color: #c8d0de;
            line-height: 1.6;
        }

        header {
            padding: 20px 24px;
            border-bottom: 1px solid #152040;
            display: flex;
            align-items: center;
        }

        .back-link {
            color: #5a6a80;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
        }

        .back-link:hover {
            color: #4a8fe7;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 24px;
        }

        .hero { text-align: center; margin-bottom: 60px; }
        .tagline { color: #4a8fe7; font-size: 0.85rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 2.5rem; font-weight: 900; color: #fff; margin-bottom: 20px; letter-spacing: -1px; }
        .hero p { color: #5a6a80; font-size: 1.1rem; max-width: 700px; margin: 0 auto; }

        .chart-container {
            background: #0a1020;
            border: 1px solid #152040;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 60px;
        }

        .chart-wrapper {
            position: relative;
            height: 400px;
            width: 100%;
        }

        .table-container {
            background: #0a1020;
            border: 1px solid #152040;
            border-radius: 12px;
            overflow-x: auto;
            margin-bottom: 60px;
        }

        table { width: 100%; border-collapse: collapse; text-align: left; }
        th {
            background: #0d1428;
            color: #fff;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 16px;
            border-bottom: 2px solid #152040;
            white-space: nowrap;
        }
        td {
            padding: 16px;
            border-bottom: 1px solid #152040;
            font-size: 0.95rem;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: rgba(74, 143, 231, 0.05); }

        .faq-section, .methodology-section {
            background: #0a1020;
            border: 1px solid #152040;
            border-radius: 12px;
            padding: 40px;
            margin-bottom: 40px;
        }

        h2 { font-size: 1.8rem; color: #fff; margin-bottom: 24px; }
        h3 { font-size: 1.2rem; color: #fff; margin-bottom: 12px; margin-top: 24px; }
        p { margin-bottom: 16px; color: #a0aec0; }

        .faq-item { margin-bottom: 24px; }
        .faq-item:last-child { margin-bottom: 0; }

        .footer {
            text-align: center;
            padding: 40px 24px;
            font-size: 0.85rem;
            color: #5a6a80;
            border-top: 1px solid #152040;
            background: #040810;
            margin-top: 60px;
        }

        .footer a { color: #4a8fe7; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }

        .disclaimer {
            max-width: 600px;
            margin: 16px auto 0;
            font-size: 0.75rem;
            line-height: 1.5;
        }
    </style>
    <!-- Chart.js for visualization -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <header>
        <a href="/" class="back-link">← Back to Westmount Fundamentals</a>
    </header>

    <div class="container">
        <div class="hero">
            <div class="tagline">Sector Analysis</div>
            <h1>Profit Margins by Industry 2026</h1>
            <p>An analysis of median net profit margins and operating margins across S&P 500 GICS sub-industries. Discover which sectors are the most and least profitable.</p>
        </div>

        <div class="chart-container">
            <h2 style="margin-bottom: 16px; font-size: 1.4rem; text-align: center;">Top 15 Most Profitable Industries (Median Net Margin)</h2>
            <div class="chart-wrapper">
                <canvas id="marginChart"></canvas>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Industry / Sector</th>
                        <th>Median Net Margin</th>
                        <th>Median Operating Margin</th>
                        <th>Companies Analysed</th>
                        <th>Highest Margin Company</th>
                        <th>Lowest Margin Company</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>

        <div class="methodology-section">
            <h2>Methodology</h2>
            <p>This study analyzes the profit margins of companies within the S&P 500 index. Financial data, including sector, industry, net profit margins, and operating margins, was sourced via the Yahoo Finance API for the constituents of the S&P 500 index.</p>
            <p>For each GICS sub-industry, we calculated the median net profit margin and median operating margin to minimize the distortion caused by outliers. Industries are ranked primarily by their median net profit margin.</p>
            <p><strong>Note:</strong> Data is fetched programmatically and represents the most recent trailing twelve months (TTM) financial data available as of the time of extraction.</p>
        </div>

        <div class="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div class="faq-item">
                <h3>What is the difference between net margin and operating margin?</h3>
                <p><strong>Operating margin</strong> measures the profit a company makes from its core operations, excluding interest and taxes, relative to its revenue. <strong>Net margin</strong> is the final percentage of profit after all expenses, including taxes, interest, and non-operating costs, have been deducted from revenue.</p>
            </div>
            <div class="faq-item">
                <h3>Why are medians used instead of averages?</h3>
                <p>We use median values instead of arithmetic means (averages) to prevent extreme outliers—such as a company with abnormally high one-time profits or severe losses—from skewing the industry's baseline profitability.</p>
            </div>
            <div class="faq-item">
                <h3>Which industry typically has the highest profit margins?</h3>
                <p>Typically, software, real estate investment trusts (REITs), and financial services exhibit the highest net margins due to their low variable costs and high operating leverage.</p>
            </div>
        </div>
    </div>

    <div class="footer">
        © ${currentYear} <a href="/">westmount-research</a> · A <a href="https://gab.ae">GAB Ventures</a> property
        <div class="disclaimer">This site provides data and analysis for informational purposes only. Nothing here constitutes investment advice. Do your own research.</div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const ctx = document.getElementById('marginChart').getContext('2d');
            const rawData = ${chartDataJson};

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: rawData.map(d => d.label),
                    datasets: [{
                        label: 'Median Net Margin (%)',
                        data: rawData.map(d => d.data),
                        backgroundColor: '#4a8fe7',
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#152040' },
                            ticks: {
                                color: '#a0aec0',
                                callback: function(value) { return value + '%'; }
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#a0aec0',
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(outputPath, htmlContent);
    console.log("HTML generated at " + outputPath);
}

generateHtml();
