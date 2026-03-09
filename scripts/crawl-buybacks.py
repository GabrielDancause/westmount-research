#!/usr/bin/env python3
"""Crawl S&P 500 buyback data from finviz and public sources."""

import json
import time
import urllib.request
import urllib.error
import re
import os
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')

def fetch_url(url, retries=2):
    """Fetch URL with retries."""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode('utf-8', errors='replace')
        except Exception as e:
            if attempt < retries:
                time.sleep(2)
            else:
                print(f"  Failed: {url} - {e}")
                return None

def parse_finviz_number(val):
    """Parse finviz number formats like 1.5B, 200M, 15.2%, -."""
    if not val or val == '-' or val == 'N/A':
        return None
    val = val.strip().replace(',', '')
    multiplier = 1
    if val.endswith('B'):
        multiplier = 1e9
        val = val[:-1]
    elif val.endswith('M'):
        multiplier = 1e6
        val = val[:-1]
    elif val.endswith('K'):
        multiplier = 1e3
        val = val[:-1]
    elif val.endswith('%'):
        val = val[:-1]
    try:
        return float(val) * multiplier
    except ValueError:
        return None

def scrape_finviz_overview():
    """Scrape S&P 500 stocks from finviz screener - get ticker, company, sector, market cap."""
    stocks = {}
    # Fetch pages (finviz shows 20 per page in overview mode)
    for start in range(1, 520, 20):
        url = f"https://finviz.com/screener.ashx?v=111&f=idx_sp500&r={start}"
        print(f"  Fetching finviz overview page r={start}...")
        html = fetch_url(url)
        if not html:
            continue
        
        # Parse table rows - look for ticker patterns
        # Each row has: No, Ticker, Company, Sector, Industry, Country, Market Cap, P/E, Price, Change, Volume
        rows = re.findall(r'<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*</td>\s*<td[^>]*><a[^>]*class="screener-link-primary"[^>]*>([A-Z.]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>\s*<td[^>]*><a[^>]*>([^<]+)</a></td>', html)
        
        if not rows:
            # Try alternative parsing
            tickers = re.findall(r'<a[^>]*class="screener-link-primary"[^>]*>([A-Z.]+)</a>', html)
            if not tickers:
                print(f"  No tickers found at r={start}, stopping")
                break
            for t in tickers:
                if t not in stocks:
                    stocks[t] = {'ticker': t}
        else:
            for row in rows:
                ticker = row[1]
                stocks[ticker] = {
                    'ticker': ticker,
                    'company': row[2],
                    'sector': row[3],
                    'industry': row[4],
                    'marketCap': row[6],
                    'pe': row[7],
                    'price': row[8],
                }
        
        time.sleep(0.6)
    
    return stocks

def scrape_finviz_financial(stocks):
    """Get financial data from finviz screener financial view."""
    for start in range(1, 520, 20):
        url = f"https://finviz.com/screener.ashx?v=161&f=idx_sp500&r={start}"
        print(f"  Fetching finviz financial page r={start}...")
        html = fetch_url(url)
        if not html:
            continue
        
        # Extract all rows with ticker links
        tickers_on_page = re.findall(r'<a[^>]*class="screener-link-primary"[^>]*>([A-Z.]+)</a>', html)
        if not tickers_on_page:
            break
        
        time.sleep(0.6)
    
    return stocks

def get_top_buyback_stocks():
    """Get a curated list of known top buyback stocks and scrape their data individually."""
    # These are well-known heavy buyback companies based on public knowledge
    top_buyback_tickers = [
        'AAPL', 'GOOG', 'GOOGL', 'META', 'MSFT', 'NVDA', 'JPM', 'BAC', 'WFC', 'GS',
        'MS', 'C', 'USB', 'BK', 'AIG', 'ALL', 'TRV', 'CB', 'MET', 'PRU',
        'V', 'MA', 'AXP', 'COF', 'DFS', 'SYF',
        'UNH', 'CI', 'ELV', 'HUM', 'CNC', 'CVS',
        'XOM', 'CVX', 'COP', 'EOG', 'PSX', 'MPC', 'VLO', 'OXY',
        'HD', 'LOW', 'TJX', 'ROST', 'NKE', 'SBUX', 'MCD',
        'AMZN', 'NFLX', 'CRM', 'ORCL', 'IBM', 'CSCO', 'INTC', 'QCOM', 'TXN', 'AVGO', 'ACN', 'AMAT',
        'PG', 'KO', 'PEP', 'PM', 'MO', 'CL', 'MDLZ', 'KHC',
        'JNJ', 'ABBV', 'BMY', 'MRK', 'PFE', 'LLY', 'AMGN', 'GILD',
        'UNP', 'UPS', 'FDX', 'CAT', 'DE', 'HON', 'GE', 'RTX', 'LMT', 'BA', 'GD', 'NOC',
        'BRK.B', 'MMM', 'T', 'VZ', 'CMCSA', 'DIS', 'WMT', 'TGT', 'COST',
        'BLK', 'SCHW', 'ICE', 'CME', 'SPGI', 'MCO', 'MSCI',
        'ADBE', 'INTU', 'NOW', 'PANW', 'SNPS', 'CDNS',
        'F', 'GM', 'DAL', 'UAL', 'LUV'
    ]
    return top_buyback_tickers

def scrape_stock_detail(ticker):
    """Scrape individual stock page from finviz for detailed financials."""
    url = f"https://finviz.com/quote.ashx?t={ticker}"
    html = fetch_url(url)
    if not html:
        return None
    
    data = {}
    
    # Parse the snapshot table - look for key-value pairs
    # Finviz uses a table with alternating label/value cells
    pairs = re.findall(r'<td[^>]*class="snapshot-td2-cp"[^>]*><span[^>]*>([^<]+)</span></td>\s*<td[^>]*class="snapshot-td2"[^>]*><b>([^<]+)</b></td>', html)
    if not pairs:
        pairs = re.findall(r'<td[^>]*class="snapshot-td2"[^>]*><span[^>]*>([^<]+)</span></td>\s*<td[^>]*class="snapshot-td2"[^>]*><b[^>]*>([^<]*)</b></td>', html)
    
    if not pairs:
        # Try more generic pattern
        pairs = re.findall(r'>([A-Z][A-Za-z /\.]+)</(?:span|td)>\s*<[^>]*><b[^>]*>([^<]*)</b>', html)
    
    for label, value in pairs:
        label = label.strip()
        data[label] = value.strip()
    
    # Also get company name from title
    title_match = re.search(r'<title>([^|]+)', html)
    if title_match:
        data['_title'] = title_match.group(1).strip()
    
    # Get sector/industry from the page
    sector_match = re.search(r'Sector[^>]*>[^>]*>([^<]+)</a>', html)
    if sector_match:
        data['_sector'] = sector_match.group(1).strip()
    
    industry_match = re.search(r'Industry[^>]*>[^>]*>([^<]+)</a>', html)
    if industry_match:
        data['_industry'] = industry_match.group(1).strip()
    
    company_match = re.search(r'class="fullview-title"[^>]*>\s*<b>([^<]+)</b>', html)
    if not company_match:
        company_match = re.search(r'<title>\s*([^(|]+?)(?:\s*\(|\s*\|)', html)
    if company_match:
        data['_company'] = company_match.group(1).strip()
    
    return data

def scrape_stockanalysis_cashflow(ticker):
    """Try to get buyback data from stockanalysis.com cash flow page."""
    url = f"https://stockanalysis.com/stocks/{ticker.lower().replace('.', '-')}/financials/cash-flow-statement/"
    html = fetch_url(url)
    if not html:
        return None
    
    # Look for "Repurchase of Common Stock" or "Stock Repurchases" or "Share Buyback"
    # The values are typically in millions
    buyback = None
    
    # Try to find buyback amount in the page
    patterns = [
        r'(?:Repurchase|Buyback|Stock\s+Repurchas)[^<]*</td>\s*<td[^>]*>([^<]+)</td>',
        r'(?:repurchase|buyback)[^"]*"[^>]*>([^<]+)<',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            buyback = parse_finviz_number(val)
            if buyback:
                break
    
    return buyback

def main():
    print("=== Buyback Leaders Crawl ===")
    print(f"Started: {datetime.now().isoformat()}")
    
    tickers = get_top_buyback_stocks()
    print(f"\nScraping {len(tickers)} stocks from finviz...")
    
    results = []
    
    for i, ticker in enumerate(tickers):
        print(f"  [{i+1}/{len(tickers)}] {ticker}...")
        detail = scrape_stock_detail(ticker)
        if not detail:
            print(f"    Skipped (no data)")
            continue
        
        company = detail.get('_company', detail.get('_title', ticker))
        sector = detail.get('_sector', None)
        
        # Parse financial metrics
        market_cap_raw = detail.get('Market Cap', None)
        market_cap_b = None
        if market_cap_raw:
            mc = parse_finviz_number(market_cap_raw)
            if mc:
                market_cap_b = round(mc / 1e9, 2)
        
        pe_raw = detail.get('P/E', None)
        pe = parse_finviz_number(pe_raw)
        
        fwd_pe_raw = detail.get('Forward P/E', detail.get('Fwd P/E', None))
        fwd_pe = parse_finviz_number(fwd_pe_raw)
        
        eps_raw = detail.get('EPS (ttm)', None)
        eps = parse_finviz_number(eps_raw)
        
        price_raw = detail.get('Price', None)
        price = parse_finviz_number(price_raw)
        
        div_yield_raw = detail.get('Dividend %', detail.get('Dividend', None))
        div_yield = parse_finviz_number(div_yield_raw)
        
        payout_raw = detail.get('Payout', None)
        payout = parse_finviz_number(payout_raw)
        
        shares_out_raw = detail.get('Shs Outstand', None)
        shares_out = parse_finviz_number(shares_out_raw)
        
        shares_float_raw = detail.get('Shs Float', None)
        shares_float = parse_finviz_number(shares_float_raw)
        
        debt_eq_raw = detail.get('Debt/Eq', None)
        debt_eq = parse_finviz_number(debt_eq_raw)
        
        profit_margin_raw = detail.get('Profit Margin', detail.get('Profit M', None))
        profit_margin = parse_finviz_number(profit_margin_raw)
        
        eps_growth_raw = detail.get('EPS next 5Y', detail.get('EPS past 5Y', None))
        eps_growth = parse_finviz_number(eps_growth_raw)
        
        roe_raw = detail.get('ROE', None)
        roe = parse_finviz_number(roe_raw)
        
        stock = {
            'ticker': ticker,
            'company': company,
            'sector': sector,
            'marketCapB': market_cap_b,
            'peRatio': round(pe, 2) if pe else None,
            'forwardPe': round(fwd_pe, 2) if fwd_pe else None,
            'eps': round(eps, 2) if eps else None,
            'priceUSD': round(price, 2) if price else None,
            'dividendYield': round(div_yield, 2) if div_yield else None,
            'payoutRatio': round(payout, 2) if payout else None,
            'sharesOutM': round(shares_out / 1e6, 1) if shares_out else None,
            'sharesFloatM': round(shares_float / 1e6, 1) if shares_float else None,
            'debtToEquity': round(debt_eq, 2) if debt_eq else None,
            'profitMargin': round(profit_margin, 2) if profit_margin else None,
            'epsGrowth5yr': round(eps_growth, 2) if eps_growth else None,
            'roe': round(roe, 2) if roe else None,
            # Buyback fields will be estimated from share count changes or set from known data
            'buybackAmountB': None,
            'buybackYield': None,
            'sharesReductionPct': None,
            'totalReturnYield': None,
        }
        
        results.append(stock)
        time.sleep(0.5)
    
    print(f"\nCollected {len(results)} stocks")
    
    # Save raw data
    os.makedirs(OUT_DIR, exist_ok=True)
    raw_path = os.path.join(OUT_DIR, 'buyback-leaders-raw.json')
    with open(raw_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Saved raw data to {raw_path}")
    
    return results

if __name__ == '__main__':
    main()
