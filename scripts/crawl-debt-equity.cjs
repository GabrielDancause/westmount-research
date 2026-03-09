const fs = require('fs');
const yahooFinance = require('yahoo-finance2').default;

const yf = new yahooFinance({ suppressNotices: ['yahooSurvey'] });

async function run() {
    console.log("Reading tickers.json...");
    let tickers = [];
    try {
        tickers = JSON.parse(fs.readFileSync('tickers.json'));
    } catch(e) {
        console.error("Could not read tickers.json", e);
        return;
    }

    const data = [];
    let processed = 0;

    // We only need 100+, let's try to do top 250 just in case some fail or have no debt
    // Wait, the instructions say "80+ companies minimum" and "aim for 100+".
    // Let's process the first 250 tickers to ensure we get enough data.

    for (const ticker of tickers.slice(0, 300)) {
        try {
            console.log(`Fetching ${ticker} (${processed+1}/300)...`);

            const summary = await yf.quoteSummary(ticker.replace('.', '-'), {
                modules: ['summaryProfile', 'financialData', 'price']
            });

            const profile = summary.summaryProfile || {};
            const fin = summary.financialData || {};
            const price = summary.price || {};

            if (!fin.totalDebt || !fin.debtToEquity) {
                console.log(`Skipping ${ticker} - missing debt data.`);
                continue;
            }

            const company = price.shortName || price.longName || ticker;
            const sector = profile.sector || profile.sectorKey || 'Unknown';
            const debtToEquity = fin.debtToEquity; // This is a percentage usually, e.g. 102.63
            const totalDebt = fin.totalDebt;
            const cash = fin.totalCash;
            const currentRatio = fin.currentRatio || null;
            const marketCap = price.marketCap || fin.marketCap || null;

            // Wait a sec, yahoo debtToEquity is usually totalDebt / totalEquity * 100. Let's keep it as is or divide by 100?
            // "debtToEquity: total debt / total equity" -> ratio, not %. Let's divide by 100 to get true ratio.
            const debtToEquityRatio = debtToEquity / 100;

            // To get interest expense and EBIT, let's use fundamentalsTimeSeries
            let ebit = null;
            let interestExpense = null;
            let totalEquity = null;

            try {
                const fund = await yf.fundamentalsTimeSeries(ticker.replace('.', '-'), {
                    period1: '2023-01-01',
                    module: 'all'
                });

                if (fund && fund.length > 0) {
                    fund.sort((a,b) => new Date(b.date) - new Date(a.date));
                    for (const item of fund) {
                        if (ebit === null && item.EBIT !== undefined) ebit = item.EBIT;
                        if (interestExpense === null && item.interestExpense !== undefined) interestExpense = item.interestExpense;
                        if (totalEquity === null && item.stockholdersEquity !== undefined) totalEquity = item.stockholdersEquity;
                    }
                }
            } catch (e) {
                console.log(`Could not fetch fundamentals for ${ticker}`);
            }

            if (totalEquity === null) {
                // Approximate total equity if not found in fundamentals
                if (debtToEquityRatio !== 0) {
                    totalEquity = totalDebt / debtToEquityRatio;
                }
            }

            // Sometimes equity is negative. Let's handle it.
            // Wait, if debtToEquity from Yahoo is negative, it usually means negative equity.

            let icr = null;
            if (ebit !== null && interestExpense !== null && interestExpense !== 0) {
                icr = ebit / interestExpense;
            } else if (fin.ebitda !== undefined && interestExpense !== null && interestExpense !== 0) {
                // fallback to EBITDA if EBIT is missing
                icr = fin.ebitda / interestExpense;
            }

            // Constraints:
            // debtToEquity: -10 to 100 (negative equity = flag)
            // interestCoverageRatio: -10 to 200
            let finalDte = debtToEquityRatio;
            if (finalDte < -10) finalDte = -10;
            if (finalDte > 100) finalDte = 100;

            if (icr !== null) {
                if (icr < -10) icr = -10;
                if (icr > 200) icr = 200;
            }

            const netDebt = (totalDebt && cash !== undefined) ? (totalDebt - cash) : null;

            data.push({
                ticker: ticker,
                company: company,
                sector: sector,
                debtToEquity: finalDte,
                totalDebtB: totalDebt ? totalDebt / 1e9 : null,
                totalEquityB: totalEquity ? totalEquity / 1e9 : null,
                interestCoverageRatio: icr,
                netDebtB: netDebt !== null ? netDebt / 1e9 : null,
                cashB: cash !== undefined ? cash / 1e9 : null,
                currentRatio: currentRatio,
                marketCapB: marketCap ? marketCap / 1e9 : null,
                creditRating: null
            });

            processed++;
            if (data.length >= 130) {
                console.log("Reached 130 companies. Stopping.");
                break;
            }

        } catch (e) {
            console.error(`Error for ${ticker}: ${e.message}`);
        }

        // slight delay to prevent rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    // Create data directory if it doesn't exist
    if (!fs.existsSync('data')) {
        fs.mkdirSync('data');
    }

    fs.writeFileSync('data/debt-to-equity.json', JSON.stringify(data, null, 2));
    console.log(`Saved ${data.length} companies to data/debt-to-equity.json`);
}

run();