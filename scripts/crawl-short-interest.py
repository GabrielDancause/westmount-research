#!/usr/bin/env python3
"""Crawl most shorted stocks from finviz and stockanalysis."""

import json
import time
import urllib.request
import urllib.error
import re
import html as html_module
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

def fetch(url, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode('utf-8', errors='replace')
        except Exception as e:
            if attempt < retries:
                time.sleep(2)
            else:
                print(f"  Failed to fetch {url}: {e}")
                return None

def parse_finviz_table(html_text):
    """Parse finviz screener table rows."""
    results = []
    # Find all table rows with stock data
    # Finviz screener v=152 has: No, Ticker, Company, Sector, Industry, Country, Market Cap, P/E, Price, Change, Volume
    # v=152 includes: Short Float, Short Ratio, etc.
    
    # Find rows in the screener-body-table
    row_pattern = re.compile(r'<tr[^>]*>\s*<td[^>]*>(\d+)</td>(.*?)</tr>', re.DOTALL)
    rows = row_pattern.findall(html_text)
    
    for rank, row_html in rows:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL)
        if len(cells) < 10:
            continue
        
        # Extract ticker from link
        ticker_match = re.search(r'>([A-Z]{1,5})</a>', cells[0])
        if not ticker_match:
            continue
        ticker = ticker_match.group(1)
        
        # Company name
        company_match = re.search(r'>([^<]+)</a>', cells[1])
        company = html_module.unescape(company_match.group(1).strip()) if company_match else None
        
        # Sector
        sector = re.sub(r'<[^>]+>', '', cells[2]).strip()
        
        # Industry
        industry = re.sub(r'<[^>]+>', '', cells[3]).strip()

        results.append({
            'ticker': ticker,
            'company': company,
            'sector': sector,
            'industry': industry,
            'cells': [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        })
    
    return results

def parse_number(s):
    """Parse a number string, return None if invalid."""
    if not s or s == '-' or s == 'N/A' or s == '':
        return None
    s = s.replace(',', '').replace('%', '').strip()
    try:
        return float(s)
    except ValueError:
        return None

def parse_market_cap(s):
    """Parse market cap string like '1.5B' or '500M'."""
    if not s or s == '-':
        return None
    s = s.strip()
    multiplier = 1
    if s.endswith('B'):
        multiplier = 1
        s = s[:-1]
    elif s.endswith('M'):
        multiplier = 0.001
        s = s[:-1]
    elif s.endswith('T'):
        multiplier = 1000
        s = s[:-1]
    try:
        return round(float(s) * multiplier, 2)
    except ValueError:
        return None

def crawl_finviz_short_interest():
    """Crawl finviz screener for stocks with high short interest."""
    all_stocks = []
    
    # Finviz screener: sort by short float descending
    # v=152 = detailed view, o=-shortfloat = sort by short float desc
    # We'll get multiple pages
    for start in range(1, 200, 20):  # Pages: 1, 21, 41, 61, 81, ...
        url = f'https://finviz.com/screener.ashx?v=152&f=sh_short_o5&o=-shortfloat&r={start}'
        print(f"Fetching finviz page starting at {start}...")
        html_text = fetch(url)
        if not html_text:
            break
        
        stocks = parse_finviz_table(html_text)
        if not stocks:
            print(f"  No stocks found on page starting at {start}, stopping.")
            break
        
        all_stocks.extend(stocks)
        print(f"  Found {len(stocks)} stocks, total: {len(all_stocks)}")
        
        if len(all_stocks) >= 100:
            break
        
        time.sleep(1.5)
    
    return all_stocks[:100]

def crawl_finviz_overview():
    """Get overview data (market cap, P/E, price, volume) for high short stocks."""
    results = {}
    
    for start in range(1, 200, 20):
        url = f'https://finviz.com/screener.ashx?v=111&f=sh_short_o5&o=-shortfloat&r={start}'
        print(f"Fetching finviz overview page starting at {start}...")
        html_text = fetch(url)
        if not html_text:
            break
        
        stocks = parse_finviz_table(html_text)
        if not stocks:
            break
        
        for s in stocks:
            results[s['ticker']] = s
        
        if len(results) >= 100:
            break
        
        time.sleep(1.5)
    
    return results

def main():
    print("=" * 60)
    print("Crawling Most Shorted Stocks 2026")
    print("=" * 60)
    
    # Strategy: Use finviz screener custom view
    # v=152 gives: No, Ticker, Company, Sector, Industry, Country, Market Cap, P/E, Price, Change, Volume, Short Float, Short Ratio, ...
    
    # Let's try the custom screener URL with specific columns
    # Actually, let me use a more targeted approach with finviz custom view
    
    # First get short float data from finviz custom view
    print("\n--- Fetching Short Interest Data from Finviz ---")
    
    all_data = []
    
    # Use finviz custom view that includes short float and short ratio
    # v=152 = custom, columns include short float
    for start in range(1, 200, 20):
        url = f'https://finviz.com/screener.ashx?v=161&f=sh_short_o5&o=-shortfloat&r={start}'
        print(f"Fetching page r={start}...")
        html_text = fetch(url)
        if not html_text:
            break
        
        # Parse the table - finviz uses a specific table structure
        # Let's find the data table
        # The screener results are in a table with class "table-light"
        
        # Find all ticker links and surrounding data
        ticker_pattern = re.compile(
            r'<a[^>]*class="tab-link"[^>]*href="quote\.ashx\?t=([A-Z.]+)"[^>]*>',
            re.DOTALL
        )
        tickers = ticker_pattern.findall(html_text)
        
        if not tickers:
            # Try alternate pattern
            ticker_pattern2 = re.compile(r'href="quote\.ashx\?t=([A-Z.]{1,6})"', re.DOTALL)
            tickers = list(set(ticker_pattern2.findall(html_text)))
        
        if not tickers:
            print(f"  No tickers found, stopping.")
            break
            
        print(f"  Found {len(tickers)} tickers")
        
        # For each ticker, we'll need individual data
        for ticker in tickers:
            if ticker not in [d.get('ticker') for d in all_data]:
                all_data.append({'ticker': ticker})
        
        if len(all_data) >= 80:
            break
        
        time.sleep(1.5)
    
    # Now fetch individual stock data from finviz quote pages
    print(f"\nFetching individual stock data for {len(all_data)} stocks...")
    
    final_results = []
    
    for i, stock in enumerate(all_data[:80]):
        ticker = stock['ticker']
        print(f"  [{i+1}/{min(len(all_data), 80)}] Fetching {ticker}...")
        
        url = f'https://finviz.com/quote.ashx?t={ticker}'
        html_text = fetch(url)
        if not html_text:
            time.sleep(1)
            continue
        
        # Parse the snapshot table
        data = {'ticker': ticker}
        
        # Company name from title
        title_match = re.search(r'<title>([^|]+)', html_text)
        if title_match:
            data['company'] = title_match.group(1).strip().replace(f'{ticker} ', '').replace(' Stock Price', '').replace(' Quote', '').strip()
            # Clean up further
            data['company'] = re.sub(r'\s*-\s*Finviz.*', '', data['company']).strip()
        
        # Parse the snapshot table cells
        # Finviz quote page has pairs of label-value in td elements
        pairs = re.findall(r'<td[^>]*class="snapshot-td2-cp"[^>]*>([^<]+)</td>\s*<td[^>]*class="snapshot-td2"[^>]*><b>([^<]+)</b></td>', html_text)
        if not pairs:
            # Try alternate pattern
            pairs = re.findall(r'<td[^>]*>([A-Za-z/\s.]+)</td>\s*<td[^>]*><b[^>]*>([^<]+)</b></td>', html_text)
        
        snapshot = {}
        for label, value in pairs:
            snapshot[label.strip()] = value.strip()
        
        # Extract specific fields
        data['sector'] = None
        sector_match = re.search(r'Sector[^>]*>([^<]+)<', html_text)
        if sector_match:
            data['sector'] = sector_match.group(1).strip()
        
        # Short Float
        sf = snapshot.get('Short Float', snapshot.get('Short Float / Ratio', ''))
        if '/' in sf:
            parts = sf.split('/')
            data['shortInterestPct'] = parse_number(parts[0])
            data['shortRatio'] = parse_number(parts[1])
        else:
            data['shortInterestPct'] = parse_number(sf)
            data['shortRatio'] = parse_number(snapshot.get('Short Ratio', ''))
        
        # Other fields
        data['marketCapB'] = parse_market_cap(snapshot.get('Market Cap', ''))
        data['peRatio'] = parse_number(snapshot.get('P/E', ''))
        data['priceUSD'] = parse_number(snapshot.get('Price', ''))
        data['avgVolume'] = parse_number(snapshot.get('Avg Volume', ''))
        
        # Shares data
        shs_float = snapshot.get('Shs Float', '')
        if shs_float:
            data['floatM'] = None
            if 'B' in shs_float:
                val = parse_number(shs_float.replace('B', ''))
                if val: data['floatM'] = round(val * 1000, 2)
            elif 'M' in shs_float:
                data['floatM'] = parse_number(shs_float.replace('M', ''))
        
        shs_short = snapshot.get('Short Interest', '')
        if shs_short:
            data['sharesShortM'] = None
            if 'B' in shs_short:
                val = parse_number(shs_short.replace('B', ''))
                if val: data['sharesShortM'] = round(val * 1000, 2)
            elif 'M' in shs_short:
                data['sharesShortM'] = parse_number(shs_short.replace('M', ''))
            elif 'K' in shs_short:
                val = parse_number(shs_short.replace('K', ''))
                if val: data['sharesShortM'] = round(val / 1000, 3)
        
        # Price changes
        data['change1mo'] = parse_number(snapshot.get('Perf Month', ''))
        data['change3mo'] = parse_number(snapshot.get('Perf Quarter', ''))
        
        # Clean up - only keep if we have short interest data
        if data.get('shortInterestPct') is not None:
            final_results.append(data)
        else:
            print(f"    No short interest data for {ticker}, skipping")
        
        time.sleep(0.8)
    
    # Sort by short interest descending
    final_results.sort(key=lambda x: x.get('shortInterestPct', 0) or 0, reverse=True)
    
    print(f"\n{'=' * 60}")
    print(f"Total stocks with short interest data: {len(final_results)}")
    
    # Build output
    output = {
        'crawlDate': '2026-03-09',
        'methodology': 'Short interest data collected from Finviz financial screener. Short interest as percentage of float and days-to-cover ratio sourced from latest FINRA/exchange short interest reports as displayed on Finviz. Market cap, P/E, and price data are real-time snapshots.',
        'totalStocks': len(final_results),
        'results': final_results
    }
    
    out_path = '/Users/gab/Desktop/westmount-research/data/short-interest.json'
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Saved to {out_path}")
    
    # Print top 10
    print("\nTop 10 Most Shorted:")
    for s in final_results[:10]:
        print(f"  {s['ticker']:8s} {s.get('shortInterestPct', '?'):>6}% short  {s.get('company', '')[:30]}")

if __name__ == '__main__':
    main()
