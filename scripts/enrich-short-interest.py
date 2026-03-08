#!/usr/bin/env python3
"""Enrich short interest data with market cap, P/E, price from Yahoo Finance."""

import json
import time
import urllib.request
import urllib.error
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

# All stocks from highshortinterest.com
RAW_STOCKS = [
    {"ticker":"GRPN","company":"Groupon Inc","shortInterestPct":46.06,"floatM":23.39,"outstdM":40.75,"industry":"Retailers - Discount Stores"},
    {"ticker":"HTZ","company":"Hertz Global Holdings Inc","shortInterestPct":44.41,"floatM":124.38,"outstdM":311.59,"industry":"Passenger Transportation"},
    {"ticker":"BETR","company":"Better Home & Finance Holding Company","shortInterestPct":43.93,"floatM":4.17,"outstdM":9.86,"industry":"Financial Services"},
    {"ticker":"MPT","company":"Medical Properties Trust Inc","shortInterestPct":40.06,"floatM":494.23,"outstdM":601.50,"industry":"REITs - Specialized"},
    {"ticker":"HIMS","company":"Hims & Hers Health Inc","shortInterestPct":35.71,"floatM":206.02,"outstdM":219.27,"industry":"Health Care Providers & Services"},
    {"ticker":"AI","company":"C3.ai Inc","shortInterestPct":34.98,"floatM":120.90,"outstdM":137.25,"industry":"Software"},
    {"ticker":"IOVA","company":"Iovance Biotherapeutics Inc","shortInterestPct":34.61,"floatM":338.65,"outstdM":396.97,"industry":"Biotechnology"},
    {"ticker":"LCID","company":"Lucid Group Inc","shortInterestPct":34.10,"floatM":130.35,"outstdM":324.17,"industry":"Automobiles"},
    {"ticker":"PCT","company":"PureCycle Technologies Inc","shortInterestPct":32.96,"floatM":141.90,"outstdM":180.20,"industry":"Environmental Services"},
    {"ticker":"BOXL","company":"Boxlight Corporation","shortInterestPct":32.71,"floatM":0.93,"outstdM":0.95,"industry":"Technology Hardware"},
    {"ticker":"RXRX","company":"Recursion Pharmaceuticals Inc","shortInterestPct":32.69,"floatM":504.41,"outstdM":514.19,"industry":"Biotechnology"},
    {"ticker":"NVAX","company":"Novavax Inc","shortInterestPct":32.61,"floatM":163.70,"outstdM":163.50,"industry":"Biotechnology"},
    {"ticker":"SUGP","company":"SU Group Holdings Limited","shortInterestPct":32.46,"floatM":0.50,"outstdM":0.56,"industry":"Commercial Services"},
    {"ticker":"SOUN","company":"SoundHound AI Inc","shortInterestPct":31.74,"floatM":379.22,"outstdM":387.56,"industry":"IT Services & Consulting"},
    {"ticker":"SPHR","company":"Sphere Entertainment Co","shortInterestPct":29.98,"floatM":24.21,"outstdM":28.45,"industry":"Entertainment"},
    {"ticker":"MARA","company":"MARA Holdings Inc","shortInterestPct":28.85,"floatM":372.62,"outstdM":378.18,"industry":"Software"},
    {"ticker":"PLCE","company":"The Children's Place Inc","shortInterestPct":28.71,"floatM":9.20,"outstdM":22.17,"industry":"Specialty Retail"},
    {"ticker":"SPRY","company":"ARS Pharmaceuticals Inc","shortInterestPct":28.70,"floatM":70.41,"outstdM":98.85,"industry":"Biotechnology"},
    {"ticker":"ENVX","company":"Enovix Corp","shortInterestPct":28.63,"floatM":186.49,"outstdM":215.82,"industry":"Electrical Components"},
    {"ticker":"ROOT","company":"Root Inc","shortInterestPct":27.37,"floatM":8.55,"outstdM":13.70,"industry":"Insurance"},
    {"ticker":"CRML","company":"Critical Metals Corp","shortInterestPct":27.36,"floatM":49.38,"outstdM":117.90,"industry":"Metals & Mining"},
    {"ticker":"RILY","company":"B Riley Financial Inc","shortInterestPct":27.22,"floatM":20.68,"outstdM":31.22,"industry":"Investment Banking"},
    {"ticker":"ABSI","company":"Absci Corporation","shortInterestPct":27.13,"floatM":137.64,"outstdM":150.37,"industry":"Biotechnology"},
    {"ticker":"KSS","company":"Kohl's Corporation","shortInterestPct":27.06,"floatM":111.08,"outstdM":112.19,"industry":"Retailers - Department Stores"},
    {"ticker":"ACHC","company":"Acadia Healthcare Company Inc","shortInterestPct":26.98,"floatM":82.34,"outstdM":90.44,"industry":"Health Care Providers"},
    {"ticker":"LFVN","company":"LifeVantage Corporation","shortInterestPct":26.70,"floatM":10.46,"outstdM":12.79,"industry":"Personal Care Products"},
    {"ticker":"RUN","company":"Sunrun Inc","shortInterestPct":26.69,"floatM":212.51,"outstdM":232.04,"industry":"Renewable Energy"},
    {"ticker":"HYPD","company":"Hyperion DeFi Inc","shortInterestPct":26.19,"floatM":6.43,"outstdM":8.17,"industry":"Software"},
    {"ticker":"CRDF","company":"Cardiff Oncology Inc","shortInterestPct":26.19,"floatM":65.73,"outstdM":67.36,"industry":"Biotechnology"},
    {"ticker":"MNPR","company":"Monopar Therapeutics Inc","shortInterestPct":26.16,"floatM":4.73,"outstdM":6.68,"industry":"Biotechnology"},
    {"ticker":"OMER","company":"Omeros Corporation","shortInterestPct":25.85,"floatM":63.23,"outstdM":70.90,"industry":"Pharmaceuticals"},
    {"ticker":"EOSE","company":"Eos Energy Enterprises Inc","shortInterestPct":25.64,"floatM":299.83,"outstdM":324.10,"industry":"Electrical Components"},
    {"ticker":"FUN","company":"Six Flags Entertainment Corporation","shortInterestPct":25.57,"floatM":90.20,"outstdM":101.47,"industry":"Hotels, Restaurants & Leisure"},
    {"ticker":"INDI","company":"indie Semiconductor Inc","shortInterestPct":25.53,"floatM":199.75,"outstdM":202.61,"industry":"Semiconductors"},
    {"ticker":"KRUS","company":"Kura Sushi USA Inc","shortInterestPct":25.49,"floatM":6.78,"outstdM":11.11,"industry":"Restaurants & Bars"},
    {"ticker":"PLUG","company":"Plug Power Inc","shortInterestPct":25.18,"floatM":1380.00,"outstdM":1390.00,"industry":"Renewable Energy"},
    {"ticker":"TTEC","company":"TTEC Holdings Inc","shortInterestPct":25.05,"floatM":20.14,"outstdM":48.55,"industry":"Professional Services"},
    {"ticker":"WGS","company":"GeneDx Holdings Corp","shortInterestPct":24.94,"floatM":14.71,"outstdM":28.90,"industry":"Health Care Providers"},
    {"ticker":"SERV","company":"Serve Robotics Inc","shortInterestPct":24.88,"floatM":62.01,"outstdM":74.52,"industry":"Restaurants & Leisure"},
    {"ticker":"EVGO","company":"EVgo Inc","shortInterestPct":24.64,"floatM":127.65,"outstdM":135.18,"industry":"Utilities - Electric"},
    {"ticker":"AIRS","company":"AirSculpt Technologies Inc","shortInterestPct":24.41,"floatM":17.05,"outstdM":62.44,"industry":"Health Care Providers"},
    {"ticker":"BCRX","company":"BioCryst Pharmaceuticals Inc","shortInterestPct":23.96,"floatM":195.47,"outstdM":248.04,"industry":"Biotechnology"},
    {"ticker":"ASPI","company":"ASP Isotopes Inc","shortInterestPct":23.85,"floatM":88.08,"outstdM":125.11,"industry":"Chemicals"},
    {"ticker":"PGY","company":"Pagaya Technologies Ltd","shortInterestPct":23.84,"floatM":46.78,"outstdM":69.11,"industry":"Software"},
    {"ticker":"SANA","company":"Sana Biotechnology Inc","shortInterestPct":23.76,"floatM":156.96,"outstdM":266.37,"industry":"Biotechnology"},
    {"ticker":"BBAI","company":"BigBear.ai Holdings Inc","shortInterestPct":23.50,"floatM":433.34,"outstdM":457.89,"industry":"IT Services"},
    {"ticker":"STOK","company":"Stoke Therapeutics Inc","shortInterestPct":23.47,"floatM":40.85,"outstdM":57.12,"industry":"Biotechnology"},
    {"ticker":"BYRN","company":"Byrna Technologies Inc","shortInterestPct":23.34,"floatM":18.48,"outstdM":22.37,"industry":"Aerospace & Defense"},
    {"ticker":"ABCL","company":"AbCellera Biologics Inc","shortInterestPct":23.19,"floatM":204.33,"outstdM":299.34,"industry":"Life Sciences"},
    {"ticker":"CRMD","company":"CorMedix Inc","shortInterestPct":22.94,"floatM":78.14,"outstdM":78.79,"industry":"Pharmaceuticals"},
    {"ticker":"ATYR","company":"aTyr Pharma Inc","shortInterestPct":22.94,"floatM":95.53,"outstdM":97.99,"industry":"Biotechnology"},
    {"ticker":"VSTM","company":"Verastem Inc","shortInterestPct":22.92,"floatM":75.24,"outstdM":75.32,"industry":"Biotechnology"},
    {"ticker":"HRTX","company":"Heron Therapeutics Inc","shortInterestPct":22.80,"floatM":152.04,"outstdM":183.36,"industry":"Biotechnology"},
    {"ticker":"TMDX","company":"TransMedics Group Inc","shortInterestPct":22.60,"floatM":33.03,"outstdM":34.17,"industry":"Medical Equipment"},
    {"ticker":"ORIC","company":"ORIC Pharmaceuticals Inc","shortInterestPct":22.51,"floatM":93.68,"outstdM":97.39,"industry":"Biotechnology"},
    {"ticker":"SPCE","company":"Virgin Galactic Holdings Inc","shortInterestPct":22.50,"floatM":71.06,"outstdM":73.13,"industry":"Aerospace & Defense"},
    {"ticker":"BEAM","company":"Beam Therapeutics Inc","shortInterestPct":22.49,"floatM":87.38,"outstdM":101.47,"industry":"Biotechnology"},
    {"ticker":"AVXL","company":"Anavex Life Sciences Corp","shortInterestPct":22.41,"floatM":89.68,"outstdM":92.67,"industry":"Biotechnology"},
    {"ticker":"VKTX","company":"Viking Therapeutics Inc","shortInterestPct":22.30,"floatM":110.21,"outstdM":113.04,"industry":"Biotechnology"},
    {"ticker":"GLSI","company":"Greenwich Lifesciences Inc","shortInterestPct":22.21,"floatM":6.57,"outstdM":13.85,"industry":"Pharmaceuticals"},
    {"ticker":"ALT","company":"Altimmune Inc","shortInterestPct":21.90,"floatM":123.53,"outstdM":125.23,"industry":"Biotechnology"},
    {"ticker":"AMC","company":"AMC Entertainment Holdings Inc","shortInterestPct":21.85,"floatM":511.44,"outstdM":513.89,"industry":"Entertainment"},
    {"ticker":"STIM","company":"Neuronetics Inc","shortInterestPct":21.63,"floatM":36.39,"outstdM":68.49,"industry":"Health Care Equipment"},
    {"ticker":"SRPT","company":"Sarepta Therapeutics Inc","shortInterestPct":21.58,"floatM":99.25,"outstdM":104.79,"industry":"Biotechnology"},
    {"ticker":"PDYN","company":"Palladyne AI Corp","shortInterestPct":21.50,"floatM":33.36,"outstdM":44.71,"industry":"Machinery"},
    {"ticker":"NVTS","company":"Navitas Semiconductor Corp","shortInterestPct":21.31,"floatM":168.74,"outstdM":230.50,"industry":"Semiconductors"},
    {"ticker":"RVPH","company":"Reviva Pharmaceuticals Holdings Inc","shortInterestPct":21.16,"floatM":111.60,"outstdM":116.85,"industry":"Pharmaceuticals"},
    {"ticker":"CORZ","company":"Core Scientific Inc","shortInterestPct":20.96,"floatM":211.30,"outstdM":310.06,"industry":"Software"},
    {"ticker":"SMR","company":"NuScale Power Corp","shortInterestPct":20.62,"floatM":95.63,"outstdM":282.84,"industry":"Utilities - Electric"},
    {"ticker":"CADL","company":"Candel Therapeutics Inc","shortInterestPct":20.52,"floatM":45.48,"outstdM":54.90,"industry":"Biotechnology"},
    {"ticker":"CHRS","company":"Coherus Biosciences Inc","shortInterestPct":20.42,"floatM":144.89,"outstdM":150.87,"industry":"Biotechnology"},
    {"ticker":"ORGO","company":"Organogenesis Holdings Inc","shortInterestPct":20.26,"floatM":62.90,"outstdM":126.91,"industry":"Biotechnology"},
    {"ticker":"MRNA","company":"Moderna Inc","shortInterestPct":20.25,"floatM":364.15,"outstdM":390.73,"industry":"Biotechnology"},
    {"ticker":"LQDA","company":"Liquidia Corp","shortInterestPct":20.22,"floatM":65.40,"outstdM":87.00,"industry":"Pharmaceuticals"},
    {"ticker":"SEDG","company":"SolarEdge Technologies Inc","shortInterestPct":20.04,"floatM":59.03,"outstdM":59.80,"industry":"Semiconductors"},
    {"ticker":"TGTX","company":"TG Therapeutics Inc","shortInterestPct":20.04,"floatM":139.47,"outstdM":158.76,"industry":"Biotechnology"},
]

def fetch_yahoo_batch(tickers):
    """Fetch basic data for a batch of tickers from Yahoo Finance."""
    results = {}
    # Process in batches of 10
    for i in range(0, len(tickers), 10):
        batch = tickers[i:i+10]
        symbols = ','.join(batch)
        url = f'https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbols}&fields=regularMarketPrice,marketCap,trailingPE,averageDailyVolume3Month,regularMarketChangePercent'
        
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Accept': 'application/json'
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                
            for quote in data.get('quoteResponse', {}).get('result', []):
                t = quote.get('symbol')
                results[t] = {
                    'priceUSD': quote.get('regularMarketPrice'),
                    'marketCapB': round(quote.get('marketCap', 0) / 1e9, 2) if quote.get('marketCap') else None,
                    'peRatio': round(quote.get('trailingPE', 0), 2) if quote.get('trailingPE') else None,
                    'avgVolume': quote.get('averageDailyVolume3Month'),
                }
        except Exception as e:
            print(f"  Yahoo batch failed for {symbols}: {e}")
        
        time.sleep(0.8)
    
    return results

def fetch_yahoo_v8(tickers):
    """Try Yahoo Finance v8 chart API for price data."""
    results = {}
    for ticker in tickers:
        try:
            url = f'https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=3mo&interval=1d'
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
            
            meta = data.get('chart', {}).get('result', [{}])[0].get('meta', {})
            closes = data.get('chart', {}).get('result', [{}])[0].get('indicators', {}).get('quote', [{}])[0].get('close', [])
            
            price = meta.get('regularMarketPrice')
            
            # Calculate 1mo and 3mo changes
            change1mo = None
            change3mo = None
            valid_closes = [c for c in closes if c is not None]
            if len(valid_closes) >= 2:
                current = valid_closes[-1]
                if len(valid_closes) >= 22:
                    mo_ago = valid_closes[-22]
                    if mo_ago and mo_ago > 0:
                        change1mo = round((current - mo_ago) / mo_ago * 100, 2)
                if len(valid_closes) >= 2:
                    start = valid_closes[0]
                    if start and start > 0:
                        change3mo = round((current - start) / start * 100, 2)
            
            results[ticker] = {
                'priceUSD': round(price, 2) if price else None,
                'change1mo': change1mo,
                'change3mo': change3mo,
            }
        except Exception as e:
            pass  # silently skip
        
        if len(results) % 20 == 0 and len(results) > 0:
            print(f"  Fetched chart data for {len(results)} tickers...")
        time.sleep(0.3)
    
    return results

def map_sector(industry):
    """Map industry to GICS-like sector."""
    industry_lower = industry.lower() if industry else ''
    
    mapping = {
        'biotechnology': 'Health Care',
        'pharmaceuticals': 'Health Care',
        'health care': 'Health Care',
        'medical': 'Health Care',
        'life sciences': 'Health Care',
        'software': 'Information Technology',
        'it services': 'Information Technology',
        'semiconductors': 'Information Technology',
        'technology': 'Information Technology',
        'retail': 'Consumer Discretionary',
        'automobiles': 'Consumer Discretionary',
        'entertainment': 'Communication Services',
        'restaurants': 'Consumer Discretionary',
        'specialty retail': 'Consumer Discretionary',
        'personal care': 'Consumer Staples',
        'financial': 'Financials',
        'insurance': 'Financials',
        'investment': 'Financials',
        'banking': 'Financials',
        'reits': 'Real Estate',
        'renewable energy': 'Utilities',
        'utilities': 'Utilities',
        'environmental': 'Industrials',
        'aerospace': 'Industrials',
        'machinery': 'Industrials',
        'professional services': 'Industrials',
        'electrical': 'Industrials',
        'commercial services': 'Industrials',
        'metals': 'Materials',
        'chemicals': 'Materials',
        'passenger': 'Industrials',
    }
    
    for key, sector in mapping.items():
        if key in industry_lower:
            return sector
    return 'Other'

def main():
    tickers = [s['ticker'] for s in RAW_STOCKS]
    
    print(f"Enriching {len(tickers)} stocks...")
    
    # Try Yahoo Finance batch API
    print("\n--- Fetching from Yahoo Finance v7 batch API ---")
    yahoo_data = fetch_yahoo_batch(tickers)
    print(f"Got batch data for {len(yahoo_data)} tickers")
    
    # Get chart data for price changes
    print("\n--- Fetching chart data for price changes ---")
    chart_data = fetch_yahoo_v8(tickers)
    print(f"Got chart data for {len(chart_data)} tickers")
    
    # Build final results
    final = []
    for stock in RAW_STOCKS:
        ticker = stock['ticker']
        ydata = yahoo_data.get(ticker, {})
        cdata = chart_data.get(ticker, {})
        
        # Compute shares short in millions
        shares_short_m = None
        if stock.get('floatM') and stock.get('shortInterestPct'):
            shares_short_m = round(stock['floatM'] * stock['shortInterestPct'] / 100, 2)
        
        # Compute short ratio (days to cover) estimate
        short_ratio = None
        if shares_short_m and ydata.get('avgVolume') and ydata['avgVolume'] > 0:
            short_ratio = round((shares_short_m * 1e6) / ydata['avgVolume'], 1)
        
        entry = {
            'ticker': ticker,
            'company': stock['company'],
            'sector': map_sector(stock.get('industry', '')),
            'industry': stock.get('industry'),
            'shortInterestPct': stock['shortInterestPct'],
            'shortRatio': short_ratio,
            'sharesShortM': shares_short_m,
            'floatM': stock.get('floatM'),
            'marketCapB': ydata.get('marketCapB'),
            'peRatio': ydata.get('peRatio'),
            'priceUSD': cdata.get('priceUSD') or ydata.get('priceUSD'),
            'avgVolume': ydata.get('avgVolume'),
            'change1mo': cdata.get('change1mo'),
            'change3mo': cdata.get('change3mo'),
        }
        
        final.append(entry)
    
    # Sort by short interest descending
    final.sort(key=lambda x: x.get('shortInterestPct', 0) or 0, reverse=True)
    
    output = {
        'crawlDate': '2026-03-09',
        'source': 'HighShortInterest.com, Yahoo Finance',
        'methodology': 'Short interest data sourced from HighShortInterest.com (based on FINRA/exchange short interest reports, last updated February 13, 2026). Market cap, P/E ratios, and price data sourced from Yahoo Finance. Short ratio (days to cover) calculated as shares short divided by average daily volume. Price changes calculated from historical closing prices.',
        'totalStocks': len(final),
        'results': final
    }
    
    out_path = '/Users/gab/Desktop/westmount-research/data/short-interest.json'
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nSaved {len(final)} stocks to {out_path}")
    
    # Stats
    with_mcap = sum(1 for s in final if s.get('marketCapB'))
    with_pe = sum(1 for s in final if s.get('peRatio'))
    with_price = sum(1 for s in final if s.get('priceUSD'))
    print(f"With market cap: {with_mcap}, with P/E: {with_pe}, with price: {with_price}")
    
    print("\nTop 10:")
    for s in final[:10]:
        print(f"  {s['ticker']:8s} {s['shortInterestPct']:>6.2f}%  mcap={s.get('marketCapB','?')}B  {s['company'][:35]}")

if __name__ == '__main__':
    main()
