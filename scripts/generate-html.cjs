const fs = require('fs');
const path = require('path');

// 1. Read components
const htmlTemplate = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const interactiveLogic = fs.readFileSync(path.join(__dirname, 'interactive-logic.js'), 'utf8');
const dataJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'dividend-yield-vs-growth.json'), 'utf8'));

// 2. Prepare FAQ content
const faqs = [
    {
        q: "What is a 'dividend sweet spot' in the stock market?",
        a: "A 'dividend sweet spot' refers to a stock that offers both a higher-than-average current dividend yield and a higher-than-average dividend growth rate. In our analysis of the S&P 500, these are companies that sit in the High Yield / High Growth quadrant, meaning they provide immediate income while consistently growing their payouts to outpace inflation."
    },
    {
        q: "What is a 'yield trap' and how can I avoid it?",
        a: "A 'yield trap' is a stock that lures investors with a very high dividend yield, but suffers from stagnant or declining dividend growth, often due to underlying business struggles. You can avoid them by looking at the company's 5-year dividend growth rate and payout ratio. If the yield is high but the growth is negative or near zero, it may be a trap."
    },
    {
        q: "How do you calculate the 5-year dividend growth rate?",
        a: "The 5-year dividend growth rate is calculated using the Compound Annual Growth Rate (CAGR) formula. We take the total dividends paid in the most recent full year, divide it by the total dividends paid exactly 5 years prior, and then raise that figure to the power of 1/5 before subtracting 1. This smooths out any single-year anomalies."
    },
    {
        q: "Why do some high-growth companies have low dividend yields?",
        a: "Companies in the 'Low Yield / High Growth' quadrant (often called 'Growers') usually reinvest a larger portion of their earnings back into the business to fuel expansion rather than paying it out immediately. Over time, their rapid dividend increases can lead to a high 'yield on cost' for long-term investors, even if the initial yield seems low."
    },
    {
        q: "Is a high payout ratio a bad sign for dividend investors?",
        a: "Not necessarily, but it requires caution. A very high payout ratio (often above 80%) means the company is using most of its earnings to pay dividends, leaving little room for error or future increases. However, certain sectors like Utilities and REITs naturally operate with higher payout ratios due to their predictable cash flows and regulatory structures."
    }
];

let faqHtml = '';
let faqJsonLdElements = [];

faqs.forEach(faq => {
    faqHtml += `
    <div class="faq-item">
        <h3>${faq.q}</h3>
        <p style="color: #8a9bb0;">${faq.a}</p>
    </div>`;

    faqJsonLdElements.push({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
        }
    });
});

// 3. Prepare JSON-LD schemas
const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Dividend Yield vs Growth Rate: S&P 500 Analysis 2026",
    "description": "An in-depth analysis of S&P 500 companies comparing dividend yield against 5-year dividend growth rate.",
    "author": {
        "@type": "Organization",
        "name": "Westmount Research",
        "url": "https://westmountresearch.com"
    },
    "publisher": {
        "@type": "Organization",
        "name": "Westmount Research",
        "logo": {
            "@type": "ImageObject",
            "url": "https://westmountresearch.com/logo.png"
        }
    },
    "datePublished": "2026-03-09T00:00:00Z"
};

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqJsonLdElements
};

const schemasHtml = `
<script type="application/ld+json">
${JSON.stringify(articleSchema, null, 2)}
</script>
<script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
</script>
`;

// 4. Inject into HTML
let finalHtml = htmlTemplate;

// Inject FAQ html
finalHtml = finalHtml.replace('<!-- Injected via JS -->', faqHtml); // Need to be specific
finalHtml = finalHtml.replace('<div id="faq-container">\n            <!-- Injected via JS -->\n        </div>', `<div id="faq-container">${faqHtml}</div>`);

// Inject Data
const dataInjection = `
<script>
    window.__APP_META__ = ${JSON.stringify(dataJson.metadata)};
    window.__APP_DATA__ = ${JSON.stringify(dataJson.data)};
</script>
`;
finalHtml = finalHtml.replace('<!-- DATA_INJECTION_POINT -->', () => dataInjection);

// Inject Interactive Logic
finalHtml = finalHtml.replace('<!-- SCRIPT_INJECTION_POINT -->', () => interactiveLogic);

// Inject JSON-LD into Head
finalHtml = finalHtml.replace('</head>', () => `${schemasHtml}\n</head>`);

// Write Final output
const outputPath = path.join(__dirname, '..', 'public', 'dividend-yield-vs-growth.html');
fs.writeFileSync(outputPath, finalHtml);

console.log(`Generated HTML at: ${outputPath}`);
