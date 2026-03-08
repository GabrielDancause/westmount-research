#!/usr/bin/env python3
"""Crawl S&P 500 PEG ratios from finviz using web_fetch-style parsing."""
import json
import urllib.request
import time
import re

TICKERS = [
    "NVDA","AAPL","MSFT","AMZN","GOOGL","META","AVGO","TSLA","WMT",
    "LLY","JPM","XOM","V","JNJ","MA","COST","ORCL","NFLX","MU","ABBV","CVX",
    "PLTR","PG","HD","BAC","GE","KO","CAT","AMD","CSCO","MRK","RTX","PM",
    "UNH","AMAT","MS","LRCX","WFC","TMUS","GS","IBM","MCD","LIN","PEP",
    "INTC","VZ","GEV","AXP","T","AMGN","ABT","NEE","CRM","TMO","C","BA",
    "DIS","GILD","TJX","KLAC","TXN","ISRG","APP","ANET","SCHW","APH","DE",
    "UBER","LMT","ADI","PFE","UNP","HON","BLK","QCOM","BKNG","COP","WELL",
    "LOW","SYK","DHR","SPGI","ETN","PANW","INTU","ACN","NOW","CB","NEM",
    "PLD","PGR","BMY","HCA","COF","MDT","PH","ADBE","VRTX","CEG","CMCSA",
    "CME","SBUX","MCK","MO","SO","CRWD","NOC","BSX","GLW","DUK","HWM","WM",
    "CVS","GD","DELL","ICE","TT","EQIX","ADP","WMB","AMT","UPS","BX","MAR",
    "FCX","FDX","NKE","SNPS","MCO","PNC","CDNS","SHW","KKR","CTAS","USB",
    "JCI","PWR","MMM","REGN","ITW","ABNB","ECL","ORLY","BK","EMR","MSI",
    "RCL","CL","MDLZ","KMI","CMI","CSX","MNST","TDG","AON","CI","RSG",
    "AEP","CRH","EOG","SLB","ROST","HLT","LHX","NSC","GM","VLO","PSX",
    "TRV","MPC","ELV","PCAR","SPG","APO","DASH","WBD","HOOD",
    "DG","D","SRE","FAST","FIS","NXPI","AIG","AFL","ALL","FTNT",
    "URI","HSY","MCHP","ED","EW","IDXX","OTIS","FICO","GIS","VRSK","F",
    "IQV","MSCI","CTVA","EA","GEHC","YUM","CPAY",
    "HES","WEC","ODFL","EXC","PPG","KEYS","ROP","AWK","CBRE","XEL",
    "DOW","BDX","KHC","DVN","A","ANSS","HAL","TTWO","LULU",
    "CARR","MTB","TSCO","DAL","AME","FTV","CHD","TROW","HUBB","MKC",
    "ON","MPWR","CDW","BR","GPN","HPQ","TYL","WST","IT",
    "SWK","BIIB","LVS","ZBRA","WAT","PODD","TER","NTAP","GRMN","TRGP",
    "BRO","WAB","STE","IRM","PHM","AXON","VLTO","EFX","AVB","POOL",
    "TPL","MAS","FE","EIX","K","DOV","DKNG","LYB","ZBH","LDOS",
    "ES","HOLX","CLX","SYF","WRB","VICI","ALGN","PKG","NDAQ","RF",
    "CF","IP","STT","CNP","SMCI","MRO","AES","WY","DTE","IFF",
    "MOH","TXT","BAX","NTRS","CBOE","COO","PFG","CMS","KEY","CINF",
    "HBAN","FITB","SNA","NI","LYV","JBHT","GL","FOXA","PAYC","CTRA"
]

# S&P 500 weights from slickcharts (top ~180)
WEIGHTS = {
    "NVDA":7.08,"AAPL":6.19,"MSFT":4.97,"AMZN":3.75,"GOOGL":3.06,"META":2.67,
    "AVGO":2.57,"TSLA":2.44,"WMT":1.62,"LLY":1.45,"JPM":1.28,"XOM":1.03,
    "V":1.00,"JNJ":0.95,"MA":0.76,"COST":0.73,"ORCL":0.72,"NFLX":0.68,
    "MU":0.68,"ABBV":0.67,"CVX":0.62,"PLTR":0.62,"PG":0.58,"HD":0.58,
    "BAC":0.57,"GE":0.56,"KO":0.54,"CAT":0.52,"AMD":0.51,"CSCO":0.51,
    "MRK":0.47,"RTX":0.46,"PM":0.43,"UNH":0.43,"AMAT":0.42,"MS":0.42,
    "LRCX":0.41,"WFC":0.41,"TMUS":0.40,"GS":0.40,"IBM":0.40,"MCD":0.38,
    "LIN":0.37,"PEP":0.36,"INTC":0.36,"VZ":0.35,"GEV":0.35,"AXP":0.34,
    "T":0.33,"AMGN":0.33,"ABT":0.31,"NEE":0.31,"CRM":0.31,"TMO":0.31,
    "C":0.31,"BA":0.30,"DIS":0.29,"GILD":0.29,"TJX":0.29,"KLAC":0.29,
    "TXN":0.29,"ISRG":0.29,"APP":0.28,"ANET":0.27,"SCHW":0.27,"APH":0.27,
    "DE":0.26,"UBER":0.25,"LMT":0.25,"ADI":0.25,"PFE":0.25,"UNP":0.25,
    "HON":0.24,"BLK":0.24,"QCOM":0.24,"BKNG":0.24,"COP":0.23,"WELL":0.23,
    "LOW":0.23,"SYK":0.23,"DHR":0.23,"SPGI":0.22,"ETN":0.22,"PANW":0.22,
    "INTU":0.22,"ACN":0.22,"NOW":0.21,"CB":0.21,"NEM":0.21,"PLD":0.20,
    "PGR":0.20,"BMY":0.20,"HCA":0.20,"COF":0.19,"MDT":0.19,"PH":0.19,
    "ADBE":0.19,"VRTX":0.19,"CEG":0.19,"CMCSA":0.19,"CME":0.19
}

def fetch_finviz(ticker):
    """Fetch from finviz and parse the text output."""
    url = f"https://finviz.com/quote.ashx?t={ticker}&p=d"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            text = resp.read().decode("utf-8", errors="replace")
        
        def find_val(label):
            # Match patterns like: PEG2.47 or P/E32.57 in the text
            patterns = [
                f'{re.escape(label)}([\\d.-]+)',
                f'{re.escape(label)}\\s*([\\d.-]+)',
            ]
            for pat in patterns:
                m = re.search(pat, text)
                if m:
                    try:
                        v = float(m.group(1))
                        return v
                    except:
                        pass
            return None
        
        # Extract sector/industry from page
        sector = None
        industry = None
        sm = re.search(r'class="[^"]*snapshot-td2-cp[^"]*"[^>]*>([^<]+)<', text)
        if sm:
            sector = sm.group(1).strip()
        
        # Company name from title
        company = None
        tm = re.search(r'<title>([^|<]+)', text)
        if tm:
            company = tm.group(1).strip().replace(' Stock Price and Quote', '').strip()
        
        return {
            "ticker": ticker,
            "company": company,
            "sector": sector,
            "peRatio": find_val("P/E"),
            "forwardPe": find_val("Forward P/E"),
            "pegRatio": find_val("PEG"),
            "epsGrowthNext5yr": find_val("EPS next 5Y"),
            "epsGrowthPast5yr": find_val("EPS past 5Y"),
            "dividendYield": find_val("Dividend %"),
            "beta": find_val("Beta"),
            "price": find_val("Price"),
            "weightPct": WEIGHTS.get(ticker),
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}

results = []
errors = 0
total = len(TICKERS)

for i, ticker in enumerate(TICKERS):
    if (i+1) % 25 == 0 or i == 0:
        print(f"[{i+1}/{total}]...", flush=True)
    
    data = fetch_finviz(ticker)
    if "error" not in data:
        results.append(data)
    else:
        errors += 1
    
    time.sleep(0.4)

# Sort by PEG (ascending, nulls last)
results.sort(key=lambda x: (x.get("pegRatio") is None, x.get("pegRatio") or 999))

# Compute stats
pegs = [r["pegRatio"] for r in results if r.get("pegRatio") and 0 < r["pegRatio"] < 50]
pes = [r["peRatio"] for r in results if r.get("peRatio") and 0 < r["peRatio"] < 500]

study = {
    "crawlDate": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "methodology": f"Financial data scraped from Finviz for {len(results)} S&P 500 companies. PEG = P/E ratio divided by estimated 5-year EPS growth rate. Lower PEG suggests better value relative to growth. Negative PEG values (from negative growth estimates) are included but flagged.",
    "totalCompanies": len(results),
    "companiesWithPeg": len(pegs),
    "medianPeg": round(sorted(pegs)[len(pegs)//2], 2) if pegs else None,
    "meanPeg": round(sum(pegs)/len(pegs), 2) if pegs else None,
    "medianPe": round(sorted(pes)[len(pes)//2], 2) if pes else None,
    "source": "finviz.com",
    "results": results
}

with open("data/sp500-peg-ratios.json", "w") as f:
    json.dump(study, f, indent=2)

print(f"\n✅ {len(results)} companies crawled ({errors} errors)")
print(f"📊 Companies with PEG data: {len(pegs)}/{len(results)}")
if pegs:
    print(f"📊 Median PEG: {study['medianPeg']}")
    print(f"📊 Mean PEG: {study['meanPeg']}")
    print(f"📊 Median P/E: {study['medianPe']}")
    # Top 5 most undervalued
    print("\n🏆 Top 5 lowest PEG (most undervalued):")
    for r in results[:5]:
        if r.get("pegRatio"):
            print(f"  {r['ticker']:6} PEG={r['pegRatio']:.2f} P/E={r.get('peRatio','?')}")
