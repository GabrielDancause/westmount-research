#!/usr/bin/env python3
"""Crawl S&P 500 constituents with weights and market data for concentration study."""

import json, time, re, urllib.request, urllib.error, ssl, os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

def fetch(url, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                return resp.read().decode('utf-8', errors='replace')
        except Exception as e:
            if attempt < retries:
                time.sleep(2)
            else:
                print(f"  Failed: {url} — {e}")
                return None

def parse_slickcharts(html):
    """Parse the slickcharts S&P 500 table."""
    results = []
    # Find table rows
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)
    for row in rows:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        if len(cells) >= 4:
            # Extract rank, company, ticker, weight
            rank_match = re.search(r'(\d+)', cells[0])
            if not rank_match:
                continue
            rank = int(rank_match.group(1))
            
            # Company name - may be in an <a> tag
            company = re.sub(r'<[^>]+>', '', cells[1]).strip()
            
            # Ticker - may be in an <a> tag
            ticker = re.sub(r'<[^>]+>', '', cells[2]).strip()
            
            # Weight
            weight_match = re.search(r'([\d.]+)', cells[3])
            weight = float(weight_match.group(1)) if weight_match else None
            
            # Price (if available, cell 4)
            price = None
            if len(cells) > 4:
                price_match = re.search(r'([\d,.]+)', cells[4].replace(',', ''))
                if price_match:
                    try:
                        price = float(price_match.group(1).replace(',', ''))
                    except:
                        pass
            
            if ticker and weight and rank <= 510:
                results.append({
                    'rank': rank,
                    'ticker': ticker,
                    'company': company,
                    'weightPct': weight,
                    'priceUSD': price,
                })
    return results

print("Step 1: Fetching S&P 500 from slickcharts.com...")
html = fetch('https://www.slickcharts.com/sp500')
companies = []
if html:
    companies = parse_slickcharts(html)
    print(f"  Got {len(companies)} companies from slickcharts")
else:
    print("  slickcharts failed")

# If slickcharts didn't work well, try stockanalysis
if len(companies) < 100:
    print("Step 1b: Trying stockanalysis.com...")
    html2 = fetch('https://stockanalysis.com/list/sp-500-stocks/')
    if html2:
        # Try to extract from stockanalysis
        tickers_found = re.findall(r'/stocks/([a-z]+)/"[^>]*>([A-Z]+)</a>', html2, re.IGNORECASE)
        print(f"  Found {len(tickers_found)} tickers from stockanalysis")

print(f"\nTotal companies from weight source: {len(companies)}")

# Save raw weights
raw_path = os.path.join(DATA_DIR, 'market-concentration-raw.json')
with open(raw_path, 'w') as f:
    json.dump(companies, f, indent=2)
print(f"Saved raw data to {raw_path}")

# Step 2: Enrich with finviz data (sector, market cap, P/E)
# We'll batch in groups using finviz screener
print("\nStep 2: Enriching with finviz data...")

# First get all S&P 500 from finviz with key metrics
finviz_data = {}
# Finviz overview page for S&P 500, paginated
for page_start in range(1, 600, 20):
    url = f'https://finviz.com/screener.ashx?v=111&f=idx_sp500&r={page_start}'
    time.sleep(0.6)
    html = fetch(url)
    if not html:
        continue
    
    # Parse table rows - look for ticker links
    # Finviz table has: No, Ticker, Company, Sector, Industry, Country, Market Cap, P/E, Price, Change, Volume
    table_rows = re.findall(r'<tr[^>]*class="[^"]*screener-body-table-nw[^"]*"[^>]*>(.*?)</tr>', html, re.DOTALL)
    if not table_rows:
        # Try alternate pattern
        table_rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)
    
    found_this_page = 0
    for row in table_rows:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        if len(cells) >= 10:
            ticker_match = re.search(r'>([A-Z]{1,5})</a>', cells[1])
            if not ticker_match:
                continue
            ticker = ticker_match.group(1)
            
            company_text = re.sub(r'<[^>]+>', '', cells[2]).strip()
            sector_text = re.sub(r'<[^>]+>', '', cells[3]).strip()
            industry_text = re.sub(r'<[^>]+>', '', cells[4]).strip()
            
            # Market cap
            mcap_text = re.sub(r'<[^>]+>', '', cells[6]).strip()
            mcap_b = None
            if mcap_text and mcap_text != '-':
                try:
                    if 'T' in mcap_text:
                        mcap_b = float(mcap_text.replace('T', '')) * 1000
                    elif 'B' in mcap_text:
                        mcap_b = float(mcap_text.replace('B', ''))
                    elif 'M' in mcap_text:
                        mcap_b = float(mcap_text.replace('M', '')) / 1000
                except:
                    pass
            
            # P/E
            pe_text = re.sub(r'<[^>]+>', '', cells[7]).strip()
            pe = None
            if pe_text and pe_text != '-':
                try:
                    pe = float(pe_text)
                except:
                    pass
            
            # Price
            price_text = re.sub(r'<[^>]+>', '', cells[8]).strip()
            price = None
            if price_text and price_text != '-':
                try:
                    price = float(price_text.replace(',', ''))
                except:
                    pass
            
            # Change
            change_text = re.sub(r'<[^>]+>', '', cells[9]).strip()
            
            finviz_data[ticker] = {
                'company': company_text,
                'sector': sector_text,
                'industry': industry_text,
                'marketCapB': mcap_b,
                'peRatio': pe,
                'priceUSD': price,
            }
            found_this_page += 1
    
    print(f"  Page r={page_start}: {found_this_page} stocks (total: {len(finviz_data)})")
    if found_this_page == 0:
        break

print(f"\nFinviz enrichment: {len(finviz_data)} stocks")

# Step 3: Merge data
print("\nStep 3: Merging data...")
for c in companies:
    ticker = c['ticker']
    if ticker in finviz_data:
        fv = finviz_data[ticker]
        c['sector'] = fv.get('sector')
        c['industry'] = fv.get('industry')
        if fv.get('marketCapB'):
            c['marketCapB'] = fv['marketCapB']
        if fv.get('peRatio'):
            c['peRatio'] = fv['peRatio']
        if fv.get('priceUSD') and not c.get('priceUSD'):
            c['priceUSD'] = fv['priceUSD']
        if fv.get('company') and (not c.get('company') or len(fv['company']) > len(c.get('company', ''))):
            c['company'] = fv['company']

# For companies not in slickcharts but in finviz, add them with null weight
if len(companies) < 400:
    existing_tickers = {c['ticker'] for c in companies}
    for ticker, fv in finviz_data.items():
        if ticker not in existing_tickers:
            companies.append({
                'rank': None,
                'ticker': ticker,
                'company': fv.get('company', ticker),
                'weightPct': None,
                'priceUSD': fv.get('priceUSD'),
                'sector': fv.get('sector'),
                'industry': fv.get('industry'),
                'marketCapB': fv.get('marketCapB'),
                'peRatio': fv.get('peRatio'),
            })

# Sort by weight (desc), nulls at end
companies.sort(key=lambda x: -(x.get('weightPct') or 0))

# Re-rank
for i, c in enumerate(companies):
    if c.get('weightPct'):
        c['rank'] = i + 1

# Compute concentration metrics
weights = [c['weightPct'] for c in companies if c.get('weightPct')]
top5 = sum(weights[:5]) if len(weights) >= 5 else None
top10 = sum(weights[:10]) if len(weights) >= 10 else None
top20 = sum(weights[:20]) if len(weights) >= 20 else None
top50 = sum(weights[:50]) if len(weights) >= 50 else None
bottom_count = max(0, len(weights) - 10)
bottom_weight = sum(weights[10:]) if len(weights) > 10 else None

# Sector concentration
sector_weights = {}
sector_counts = {}
for c in companies:
    s = c.get('sector')
    w = c.get('weightPct', 0) or 0
    if s:
        sector_weights[s] = sector_weights.get(s, 0) + w
        sector_counts[s] = sector_counts.get(s, 0) + 1

sector_breakdown = []
for s in sorted(sector_weights.keys(), key=lambda x: -sector_weights[x]):
    sector_breakdown.append({
        'sector': s,
        'weightPct': round(sector_weights[s], 2),
        'count': sector_counts[s],
    })

# Build final JSON
output = {
    'crawlDate': '2026-03-09',
    'methodology': 'S&P 500 constituent weights from SlickCharts.com. Financial metrics (sector, P/E, market cap) from Finviz screener. All data represents a point-in-time snapshot.',
    'totalCompanies': len([c for c in companies if c.get('weightPct')]),
    'concentration': {
        'top5WeightPct': round(top5, 2) if top5 else None,
        'top10WeightPct': round(top10, 2) if top10 else None,
        'top20WeightPct': round(top20, 2) if top20 else None,
        'top50WeightPct': round(top50, 2) if top50 else None,
        'bottomRemaining': {
            'count': bottom_count,
            'weightPct': round(bottom_weight, 2) if bottom_weight else None,
        },
    },
    'sectorBreakdown': sector_breakdown,
    'results': companies,
}

out_path = os.path.join(DATA_DIR, 'market-concentration.json')
with open(out_path, 'w') as f:
    json.dump(output, f, indent=2)
print(f"\nSaved {len(companies)} companies to {out_path}")
print(f"Concentration: Top 5={top5:.1f}%, Top 10={top10:.1f}%, Top 20={top20:.1f}%")
print(f"Sectors: {len(sector_breakdown)}")
