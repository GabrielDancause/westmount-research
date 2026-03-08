#!/usr/bin/env python3
"""Crawl S&P 500 PEG ratios from finviz.com screener v=121 (Valuation view)."""
import urllib.request
import json
import re
import time
import html as html_module

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def fetch_page(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(3)
    return None

def clean_td(td_html):
    """Extract text from a td element, stripping all HTML tags."""
    # Remove span tags but keep content
    text = re.sub(r'<span[^>]*>', '', td_html)
    text = re.sub(r'</span>', '', text)
    # Remove all other tags
    text = re.sub(r'<[^>]+>', '', text)
    text = html_module.unescape(text.strip())
    return text

def parse_num(s):
    if not s or s == "-" or s.strip() == "":
        return None
    s = s.strip().replace(",", "")
    if s.endswith("%"):
        s = s[:-1]
    try:
        return round(float(s), 4)
    except ValueError:
        return None

def parse_market_cap(s):
    if not s or s == "-":
        return None
    s = s.strip().replace(",", "")
    if s.endswith("B"):
        try: return round(float(s[:-1]), 2)
        except: return None
    elif s.endswith("M"):
        try: return round(float(s[:-1]) / 1000, 4)
        except: return None
    return None

def parse_v121_page(page_html):
    """Parse finviz v=121 valuation screener page."""
    results = []
    
    # Split by table rows
    rows = re.findall(r'<tr[^>]*class="styled-row[^"]*"[^>]*>(.*?)</tr>', page_html, re.DOTALL)
    
    for row_html in rows:
        # Extract ticker
        ticker_match = re.search(r'class="tab-link">([A-Z./-]+)</a>', row_html)
        if not ticker_match:
            continue
        ticker = ticker_match.group(1)
        
        # Extract company name from hover
        company_match = re.search(r'<b>([^<]+)</b>', row_html)
        company = html_module.unescape(company_match.group(1)) if company_match else ticker
        
        # Extract industry from hover (text after </b> before <span>)
        industry = None
        ind_match = re.search(r'<b>[^<]+</b>([^<]+)<span>', row_html)
        if ind_match:
            industry = ind_match.group(1).strip()
        
        # Extract all <td> contents
        tds_raw = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL)
        
        # Filter out hover-chart tds (they contain data-boxover or cssheader text)
        tds = []
        for td in tds_raw:
            cleaned = clean_td(td)
            # Skip if it's a hover tooltip artifact
            if 'offsetx=' in cleaned or 'cssbody=' in cleaned or 'hoverchart' in cleaned:
                continue
            tds.append(cleaned)
        
        # v=121 columns (after filtering): 
        # [0] row number
        # [1] ticker (already extracted)
        # [2] Market Cap
        # [3] P/E
        # [4] Fwd P/E
        # [5] PEG
        # [6] P/S
        # [7] P/B
        # [8] P/C
        # [9] P/FCF
        # [10] EPS past 5Y %
        # [11] EPS next 5Y %
        # [12] Sales past 5Y %
        # [13] EPS Q/Q %
        # [14] Sales Q/Q %
        # [15] Change %
        # [16] Volume
        
        if len(tds) < 12:
            print(f"  Skipping {ticker}: only {len(tds)} tds: {tds[:5]}")
            continue
        
        # But wait - the ticker td might be parsed differently. Let me find Market Cap by looking for 'B' or 'M' suffix
        mcap_idx = None
        for i, td in enumerate(tds):
            if td and (td.endswith('B') or td.endswith('M')) and i > 0:
                mcap_idx = i
                break
        
        if mcap_idx is None:
            print(f"  Skipping {ticker}: can't find market cap in {tds[:5]}")
            continue
        
        # Columns relative to mcap
        mc = parse_market_cap(tds[mcap_idx])
        pe = parse_num(tds[mcap_idx + 1]) if mcap_idx + 1 < len(tds) else None
        fwd_pe = parse_num(tds[mcap_idx + 2]) if mcap_idx + 2 < len(tds) else None
        peg = parse_num(tds[mcap_idx + 3]) if mcap_idx + 3 < len(tds) else None
        eps_past = parse_num(tds[mcap_idx + 8]) if mcap_idx + 8 < len(tds) else None
        eps_next = parse_num(tds[mcap_idx + 9]) if mcap_idx + 9 < len(tds) else None
        
        results.append({
            "ticker": ticker,
            "company": company,
            "industry": industry,
            "pegRatio": peg,
            "peRatio": pe,
            "forwardPe": fwd_pe,
            "epsGrowth5yr": eps_past,
            "epsNext5yr": eps_next,
            "marketCapB": mc,
        })
    
    return results

def parse_v111_page(page_html):
    """Parse finviz v=111 overview page for sector data."""
    sectors = {}
    rows = re.findall(r'<tr[^>]*class="styled-row[^"]*"[^>]*>(.*?)</tr>', page_html, re.DOTALL)
    
    for row_html in rows:
        ticker_match = re.search(r'class="tab-link">([A-Z./-]+)</a>', row_html)
        if not ticker_match:
            continue
        ticker = ticker_match.group(1)
        
        # In v=111 the columns after ticker are: Company, Sector, Industry, Country, MktCap, P/E, Price, Change, Volume
        # Sector is the 3rd <a> tag with quote.ashx after the tab-link
        links = re.findall(r'<a\s+href="quote\.ashx[^"]*"[^>]*>([^<]+)</a>', row_html)
        # links: [rownum, ticker, company, sector, industry, country, mktcap, pe, price?, change, volume]
        # Actually each column has its own <a> link to the quote page
        # Let me find td contents instead
        tds_raw = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL)
        tds = []
        for td in tds_raw:
            cleaned = clean_td(td)
            if 'offsetx=' in cleaned or 'cssbody=' in cleaned:
                continue
            tds.append(cleaned)
        
        # tds: [num, ticker/company(hover), company, sector, industry, country, mktcap, pe, ...]
        # Find sector - it's usually at index 3 or after company name
        # Look for known sector names
        known_sectors = ['Technology', 'Healthcare', 'Financial', 'Consumer Cyclical', 
                        'Consumer Defensive', 'Communication Services', 'Industrials',
                        'Energy', 'Utilities', 'Real Estate', 'Basic Materials']
        
        for td in tds:
            if td in known_sectors:
                sectors[ticker] = td
                break
    
    return sectors

def main():
    all_results = []
    
    # Fetch PEG data from v=121
    for start in range(1, 521, 20):
        url = f"https://finviz.com/screener.ashx?v=121&f=idx_sp500&r={start}"
        print(f"Fetching v=121 r={start}...")
        page_html = fetch_page(url)
        if not page_html:
            print(f"  Failed, skipping")
            continue
        
        rows = parse_v121_page(page_html)
        print(f"  Parsed {len(rows)} rows")
        all_results.extend(rows)
        
        if len(rows) == 0:
            # Debug: check what we got
            styled_rows = re.findall(r'<tr[^>]*class="styled-row', page_html)
            print(f"  Found {len(styled_rows)} styled-rows in HTML")
            if len(styled_rows) == 0:
                break
        
        time.sleep(1.5)
    
    print(f"\nTotal from v=121: {len(all_results)} companies")
    
    # Quick data check
    has_peg = sum(1 for r in all_results if r['pegRatio'] is not None)
    has_pe = sum(1 for r in all_results if r['peRatio'] is not None)
    print(f"Has PEG: {has_peg}, Has P/E: {has_pe}")
    
    if has_peg == 0 and len(all_results) > 0:
        print("\nDEBUG: First 3 entries:")
        for r in all_results[:3]:
            print(f"  {r}")
    
    # Fetch sectors from v=111
    print("\nFetching sector data from v=111...")
    all_sectors = {}
    for start in range(1, 521, 20):
        url = f"https://finviz.com/screener.ashx?v=111&f=idx_sp500&r={start}"
        print(f"  r={start}...")
        page_html = fetch_page(url)
        if not page_html:
            continue
        sectors = parse_v111_page(page_html)
        all_sectors.update(sectors)
        if not sectors:
            break
        time.sleep(1)
    
    print(f"Got sectors for {len(all_sectors)} tickers")
    
    # Merge
    for r in all_results:
        r["sector"] = all_sectors.get(r["ticker"])
    
    # Save
    output = {
        "crawlDate": "2026-03-09",
        "source": "finviz.com S&P 500 screener",
        "methodology": "Data scraped from finviz.com screener (v=121 Valuation view). PEG ratio = P/E divided by 5-year expected EPS growth rate. Negative PEG ratios (from negative earnings or negative growth) are flagged but included.",
        "totalCompanies": len(all_results),
        "results": all_results
    }
    
    with open("/tmp/westmount-research/data/sp500-peg-ratios.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved {len(all_results)} companies to data/sp500-peg-ratios.json")

if __name__ == "__main__":
    main()
