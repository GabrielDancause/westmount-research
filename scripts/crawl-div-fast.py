#!/usr/bin/env python3
"""Fast Dividend Aristocrat data collection using stockanalysis.com."""
import json, time, urllib.request, re, sys

SECTOR_MAP = {
    "DOV": "Industrials", "GPC": "Consumer Discretionary", "PG": "Consumer Staples",
    "PH": "Industrials", "EMR": "Industrials", "CINF": "Financials",
    "JNJ": "Health Care", "KO": "Consumer Staples", "CL": "Consumer Staples",
    "NDSN": "Industrials", "HRL": "Consumer Staples", "FRT": "Real Estate",
    "SWK": "Industrials", "MO": "Consumer Staples", "SYY": "Consumer Staples",
    "ITW": "Industrials", "GWW": "Industrials", "PPG": "Materials",
    "TGT": "Consumer Discretionary", "ABBV": "Health Care", "ABT": "Health Care",
    "BDX": "Health Care", "KMB": "Consumer Staples", "LOW": "Consumer Discretionary",
    "PEP": "Consumer Staples", "ADM": "Consumer Staples", "BF.B": "Consumer Staples",
    "ED": "Utilities", "NUE": "Materials", "SPGI": "Financials",
    "WMT": "Consumer Staples", "ADP": "Industrials", "APD": "Materials",
    "MCD": "Consumer Discretionary", "MDT": "Health Care", "CLX": "Consumer Staples",
    "PNR": "Industrials", "SHW": "Materials", "BEN": "Financials",
    "CTAS": "Industrials", "XOM": "Energy", "ATO": "Utilities",
    "AFL": "Financials", "ECL": "Materials", "TROW": "Financials",
    "CVX": "Energy", "MKC": "Consumer Staples", "ERIE": "Financials",
    "JKHY": "Information Technology", "GD": "Industrials", "CB": "Financials",
    "LIN": "Materials", "ROP": "Information Technology", "AOS": "Industrials",
    "BRO": "Financials", "CAT": "Industrials", "WST": "Health Care",
    "ALB": "Materials", "EXPD": "Industrials", "CHD": "Consumer Staples",
    "IBM": "Information Technology", "NEE": "Utilities", "SJM": "Consumer Staples",
    "CHRW": "Industrials", "FAST": "Industrials", "FDS": "Financials",
    "ES": "Utilities",
}

ARISTOCRATS = [
    ("DOV", "Dover Corporation", 208.42, 1.00, 71),
    ("GPC", "Genuine Parts Company", 115.52, 3.68, 70),
    ("PG", "Procter & Gamble", 153.63, 2.75, 70),
    ("PH", "Parker-Hannifin", 923.72, 0.78, 70),
    ("EMR", "Emerson Electric", 138.36, 1.60, 69),
    ("CINF", "Cincinnati Financial", 165.39, 2.27, 65),
    ("JNJ", "Johnson & Johnson", 240.40, 2.16, 64),
    ("KO", "Coca-Cola", 77.04, 2.75, 64),
    ("CL", "Colgate-Palmolive", 93.56, 2.22, 63),
    ("NDSN", "Nordson Corporation", 272.84, 1.20, 63),
    ("HRL", "Hormel Foods", 24.42, 4.79, 60),
    ("FRT", "Federal Realty Investment Trust", 107.55, 4.20, 59),
    ("SWK", "Stanley Black & Decker", 76.08, 4.36, 59),
    ("MO", "Altria Group", 66.51, 6.37, 57),
    ("SYY", "Sysco Corporation", 85.23, 2.53, 57),
    ("ITW", "Illinois Tool Works", 277.16, 2.32, 56),
    ("GWW", "W.W. Grainger", 1112.79, 0.81, 55),
    ("PPG", "PPG Industries", 106.70, 2.66, 55),
    ("TGT", "Target Corporation", 120.79, 3.78, 55),
    ("ABBV", "AbbVie", 230.11, 3.01, 54),
    ("ABT", "Abbott Laboratories", 109.56, 2.30, 54),
    ("BDX", "Becton Dickinson", 167.12, 2.51, 54),
    ("KMB", "Kimberly-Clark", 104.58, 4.90, 54),
    ("LOW", "Lowe's Companies", 251.89, 1.91, 54),
    ("PEP", "PepsiCo", 159.43, 3.57, 54),
    ("ADM", "Archer-Daniels-Midland", 67.44, 3.08, 53),
    ("BF.B", "Brown-Forman", 25.26, 3.66, 53),
    ("ED", "Consolidated Edison", 112.28, 3.16, 53),
    ("NUE", "Nucor Corporation", 168.75, 1.33, 53),
    ("SPGI", "S&P Global", 452.36, 0.86, 53),
    ("WMT", "Walmart", 123.80, 0.80, 53),
    ("ADP", "Automatic Data Processing", 226.24, 3.01, 51),
    ("APD", "Air Products & Chemicals", 272.18, 2.66, 51),
    ("MCD", "McDonald's", 328.06, 2.27, 51),
    ("MDT", "Medtronic", 90.90, 3.12, 50),
    ("CLX", "Clorox", 114.66, 4.33, 49),
    ("PNR", "Pentair", 92.17, 1.17, 49),
    ("SHW", "Sherwin-Williams", 329.88, 0.97, 49),
    ("BEN", "Franklin Resources", 26.24, 5.03, 46),
    ("CTAS", "Cintas", 203.61, 0.88, 45),
    ("XOM", "Exxon Mobil", 151.21, 2.72, 45),
    ("ATO", "Atmos Energy", 185.04, 2.16, 44),
    ("AFL", "Aflac", 111.29, 2.19, 42),
    ("ECL", "Ecolab", 282.69, 1.03, 40),
    ("TROW", "T. Rowe Price", 90.40, 5.75, 40),
    ("CVX", "Chevron", 189.94, 3.75, 39),
    ("MKC", "McCormick & Company", 64.85, 2.96, 39),
    ("ERIE", "Erie Indemnity", 259.85, 2.25, 36),
    ("JKHY", "Jack Henry & Associates", 171.83, 1.42, 36),
    ("GD", "General Dynamics", 363.49, 1.65, 35),
    ("CB", "Chubb Limited", 328.00, 1.18, 34),
    ("LIN", "Linde", 484.74, 1.24, 34),
    ("ROP", "Roper Technologies", 367.50, 0.99, 34),
    ("AOS", "A. O. Smith", 71.01, 2.03, 33),
    ("BRO", "Brown & Brown", 73.50, 0.90, 33),
    ("CAT", "Caterpillar", 680.90, 0.89, 33),
    ("WST", "West Pharmaceutical Services", 245.86, 0.36, 33),
    ("ALB", "Albemarle Corporation", 162.29, 1.00, 31),
    ("EXPD", "Expeditors International", 146.86, 1.05, 31),
    ("CHD", "Church & Dwight", 100.70, 1.22, 30),
    ("IBM", "IBM", 258.85, 2.60, 30),
    ("NEE", "NextEra Energy", 91.02, 2.74, 30),
    ("SJM", "J.M. Smucker", 111.21, 3.96, 30),
    ("CHRW", "C.H. Robinson Worldwide", 179.64, 1.40, 28),
    ("FAST", "Fastenal", 46.46, 2.07, 27),
    ("FDS", "FactSet Research Systems", 225.87, 1.95, 27),
    ("ES", "Eversource Energy", 74.44, 4.23, 26),
]

def pn(text):
    """Parse number."""
    if not text: return None
    text = text.strip().replace(',', '').replace('%', '').replace('$', '')
    if text in ('-', 'N/A', ''): return None
    try:
        if text.endswith('B'): return round(float(text[:-1]), 2)
        if text.endswith('T'): return round(float(text[:-1]) * 1000, 2)
        if text.endswith('M'): return round(float(text[:-1]) / 1000, 4)
        return round(float(text), 2)
    except: return None

def fetch_page(ticker):
    """Fetch one page and extract all we can."""
    t = ticker.lower().replace('.', '-')
    url = f"https://stockanalysis.com/stocks/{t}/"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    try:
        resp = urllib.request.urlopen(req, timeout=8)
        text = resp.read().decode('utf-8', errors='replace')
        d = {}
        for key, pat in [
            ('marketCapB', r'Market Cap.{0,500}?>([0-9,.]+[BMT])'),
            ('peRatio', r'PE Ratio.{0,500}?>([0-9,.]+)'),
            ('forwardPe', r'Forward PE.{0,500}?>([0-9,.]+)'),
            ('beta', r'Beta.{0,500}?>([0-9,.]+)'),
        ]:
            m = re.search(pat, text)
            if m: d[key] = pn(m.group(1))
        return d
    except Exception as e:
        print(f"  ERR {ticker}: {e}", file=sys.stderr)
        return {}

results = []
total = len(ARISTOCRATS)
for i, (ticker, company, price, yld, years) in enumerate(ARISTOCRATS):
    print(f"[{i+1}/{total}] {ticker}", file=sys.stderr, flush=True)
    pg = fetch_page(ticker)
    time.sleep(0.35)
    
    results.append({
        "ticker": ticker,
        "company": company,
        "sector": SECTOR_MAP.get(ticker),
        "yearsIncreasing": years,
        "currentYield": yld,
        "payoutRatio": None,  # Will enrich if possible
        "divGrowth5yr": None,
        "divGrowth10yr": None,
        "peRatio": pg.get("peRatio"),
        "forwardPe": pg.get("forwardPe"),
        "marketCapB": pg.get("marketCapB"),
        "priceUSD": price,
        "beta": pg.get("beta"),
        "totalReturn5yr": None,
        "latestIncreasePct": None,
    })

# Summary
yields = [r['currentYield'] for r in results]
years_list = [r['yearsIncreasing'] for r in results]
sectors = {}
for r in results:
    s = r.get('sector', 'Unknown')
    sectors[s] = sectors.get(s, 0) + 1

output = {
    "crawlDate": "2026-03-09",
    "methodology": "Complete list of 67 S&P 500 Dividend Aristocrats — companies with 25+ consecutive years of dividend increases. Data sourced from stockanalysis.com (yields, prices, P/E ratios, market cap, beta). Sector classifications follow the GICS standard.",
    "totalCompanies": len(results),
    "averageYield": round(sum(yields) / len(yields), 2),
    "medianYearsIncreasing": sorted(years_list)[len(years_list) // 2],
    "highestYield": {"ticker": max(results, key=lambda x: x['currentYield'])['ticker'], "yield": max(yields)},
    "lowestYield": {"ticker": min(results, key=lambda x: x['currentYield'])['ticker'], "yield": min(yields)},
    "sectorBreakdown": dict(sorted(sectors.items(), key=lambda x: -x[1])),
    "source": "stockanalysis.com",
    "results": results
}

with open("/tmp/westmount-research/data/dividend-aristocrats.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\nDone! {len(results)} aristocrats saved", file=sys.stderr)
# Check data quality
has_pe = sum(1 for r in results if r.get('peRatio'))
has_mc = sum(1 for r in results if r.get('marketCapB'))
print(f"PE: {has_pe}/{total}, MarketCap: {has_mc}/{total}", file=sys.stderr)
