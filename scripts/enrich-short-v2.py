#!/usr/bin/env python3
"""Enrich short interest data - compute market cap from price * shares, get P/E from stockanalysis."""

import json
import time
import urllib.request
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

def main():
    with open('/Users/gab/Desktop/westmount-research/data/short-interest.json') as f:
        data = json.load(f)
    
    results = data['results']
    print(f"Processing {len(results)} stocks...")
    
    # Compute market cap from price * outstanding shares
    # We have outstdM in the raw data embedded in the script
    outstanding = {
        "GRPN": 40.75, "HTZ": 311.59, "BETR": 9.86, "MPT": 601.50,
        "HIMS": 219.27, "AI": 137.25, "IOVA": 396.97, "LCID": 324.17,
        "PCT": 180.20, "BOXL": 0.95, "RXRX": 514.19, "NVAX": 163.50,
        "SUGP": 0.56, "SOUN": 387.56, "SPHR": 28.45, "MARA": 378.18,
        "PLCE": 22.17, "SPRY": 98.85, "ENVX": 215.82, "ROOT": 13.70,
        "CRML": 117.90, "RILY": 31.22, "ABSI": 150.37, "KSS": 112.19,
        "ACHC": 90.44, "LFVN": 12.79, "RUN": 232.04, "HYPD": 8.17,
        "CRDF": 67.36, "MNPR": 6.68, "OMER": 70.90, "EOSE": 324.10,
        "FUN": 101.47, "INDI": 202.61, "KRUS": 11.11, "PLUG": 1390.00,
        "TTEC": 48.55, "WGS": 28.90, "SERV": 74.52, "EVGO": 135.18,
        "AIRS": 62.44, "BCRX": 248.04, "ASPI": 125.11, "PGY": 69.11,
        "SANA": 266.37, "BBAI": 457.89, "STOK": 57.12, "BYRN": 22.37,
        "ABCL": 299.34, "CRMD": 78.79, "ATYR": 97.99, "VSTM": 75.32,
        "HRTX": 183.36, "TMDX": 34.17, "ORIC": 97.39, "SPCE": 73.13,
        "BEAM": 101.47, "AVXL": 92.67, "VKTX": 113.04, "GLSI": 13.85,
        "ALT": 125.23, "AMC": 513.89, "STIM": 68.49, "SRPT": 104.79,
        "PDYN": 44.71, "NVTS": 230.50, "RVPH": 116.85, "CORZ": 310.06,
        "SMR": 282.84, "CADL": 54.90, "CHRS": 150.87, "ORGO": 126.91,
        "MRNA": 390.73, "LQDA": 87.00, "SEDG": 59.80, "TGTX": 158.76,
    }
    
    for stock in results:
        ticker = stock['ticker']
        price = stock.get('priceUSD')
        outstd = outstanding.get(ticker)
        
        # Compute market cap
        if price and outstd:
            stock['marketCapB'] = round(price * outstd / 1000, 2)
        
        # Compute short ratio from shares short and avg volume
        if stock.get('sharesShortM') and stock.get('avgVolume') and stock['avgVolume'] > 0:
            stock['shortRatio'] = round((stock['sharesShortM'] * 1e6) / stock['avgVolume'], 1)
    
    # Now try to get P/E ratios from stockanalysis.com for each stock
    print("\n--- Fetching P/E ratios from stockanalysis.com ---")
    for i, stock in enumerate(results):
        ticker = stock['ticker']
        try:
            url = f'https://stockanalysis.com/stocks/{ticker.lower()}/'
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
                html = resp.read().decode('utf-8', errors='replace')
            
            # Find P/E ratio in the page
            pe_match = re.search(r'PE Ratio[^<]*</td>\s*<td[^>]*>([0-9.]+)', html)
            if not pe_match:
                pe_match = re.search(r'"PE Ratio"[^}]*?"value":\s*"?([0-9.]+)', html)
            if not pe_match:
                pe_match = re.search(r'P/E Ratio[^<]*<[^>]*>[^<]*<[^>]*>([0-9.]+)', html)
            
            if pe_match:
                pe_val = float(pe_match.group(1))
                if 0 < pe_val < 500:
                    stock['peRatio'] = round(pe_val, 2)
            
            if (i + 1) % 10 == 0:
                print(f"  Processed {i+1}/{len(results)}...")
                
        except Exception as e:
            pass
        
        time.sleep(0.5)
    
    # Save
    with open('/Users/gab/Desktop/westmount-research/data/short-interest.json', 'w') as f:
        json.dump(data, f, indent=2)
    
    # Stats
    with_mcap = sum(1 for s in results if s.get('marketCapB'))
    with_pe = sum(1 for s in results if s.get('peRatio'))
    with_price = sum(1 for s in results if s.get('priceUSD'))
    with_changes = sum(1 for s in results if s.get('change1mo') is not None)
    print(f"\nFinal stats: {len(results)} stocks")
    print(f"  With price: {with_price}, market cap: {with_mcap}, P/E: {with_pe}, changes: {with_changes}")
    
    print("\nTop 10:")
    for s in results[:10]:
        mcap = f"${s.get('marketCapB', '?')}B" if s.get('marketCapB') else "N/A"
        pe = s.get('peRatio', 'N/A')
        print(f"  {s['ticker']:8s} {s['shortInterestPct']:>6.2f}%  mcap={mcap}  P/E={pe}  ${s.get('priceUSD', '?')}")

if __name__ == '__main__':
    main()
