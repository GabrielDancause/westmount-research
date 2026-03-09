import fs from 'fs';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function run() {
  const companies = JSON.parse(fs.readFileSync('companies.json'));
  let validCount = 0;
  let finalData = [];

  for(let i = 0; i < 5; i++) {
    const comp = companies[i];
    console.log(`Fetching ${comp.ticker}...`);
    try {
        const result = await yahooFinance.quoteSummary(comp.ticker.replace('.', '-'), {
            modules: [
                'summaryDetail', 'defaultKeyStatistics', 'price',
                'institutionOwnership', 'majorHoldersBreakdown'
            ]
        });

        let instOwnershipPct = null;
        if(result.majorHoldersBreakdown && result.majorHoldersBreakdown.institutionsPercentHeld !== undefined){
             instOwnershipPct = (result.majorHoldersBreakdown.institutionsPercentHeld * 100);
             if (instOwnershipPct > 100) instOwnershipPct = 100;
             if (instOwnershipPct < 0) instOwnershipPct = 0;
        }

        let insiderOwnershipPct = null;
        if(result.majorHoldersBreakdown && result.majorHoldersBreakdown.insidersPercentHeld !== undefined){
            insiderOwnershipPct = (result.majorHoldersBreakdown.insidersPercentHeld * 100);
            if (insiderOwnershipPct > 80) insiderOwnershipPct = 80;
            if (insiderOwnershipPct < 0) insiderOwnershipPct = 0;
        }

        let numberOfInstitutions = null;
        if(result.majorHoldersBreakdown && result.majorHoldersBreakdown.institutionsCount !== undefined){
            numberOfInstitutions = result.majorHoldersBreakdown.institutionsCount;
        }

        let topHolder = null;
        let topHolderPct = null;
        if(result.institutionOwnership && result.institutionOwnership.ownershipList && result.institutionOwnership.ownershipList.length > 0){
             const top = result.institutionOwnership.ownershipList.sort((a,b) => b.pctHeld - a.pctHeld)[0];
             topHolder = top.organization;
             topHolderPct = top.pctHeld * 100;
        }

        let marketCapB = null;
        if(result.price && result.price.marketCap !== undefined){
            marketCapB = result.price.marketCap / 1e9;
        } else if (result.summaryDetail && result.summaryDetail.marketCap !== undefined){
            marketCapB = result.summaryDetail.marketCap / 1e9;
        }

        let peRatio = null;
        if(result.summaryDetail && result.summaryDetail.trailingPE !== undefined){
            peRatio = result.summaryDetail.trailingPE;
        }

        let shortInterestPct = null;
        if(result.defaultKeyStatistics && result.defaultKeyStatistics.shortPercentOfFloat !== undefined){
            shortInterestPct = result.defaultKeyStatistics.shortPercentOfFloat * 100;
        }

        const data = {
             ticker: comp.ticker,
             company: comp.company,
             sector: comp.sector,
             instOwnershipPct,
             numberOfInstitutions,
             topHolder,
             topHolderPct,
             insiderOwnershipPct,
             marketCapB,
             peRatio,
             shortInterestPct
        };

        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(`Error for ${comp.ticker}: ${e.message}`);
    }
  }
}
run();
