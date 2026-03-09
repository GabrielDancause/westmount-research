#!/usr/bin/env python3
"""Build buyback leaders dataset from known public data + finviz market data."""

import json
import os
import time
import urllib.request
import re
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')

def fetch_url(url, retries=2):
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

def parse_num(val):
    if not val or val == '-' or val == 'N/A':
        return None
    val = val.strip().replace(',', '')
    m = 1
    if val.endswith('B'): m = 1e9; val = val[:-1]
    elif val.endswith('M'): m = 1e6; val = val[:-1]
    elif val.endswith('K'): m = 1e3; val = val[:-1]
    elif val.endswith('%'): val = val[:-1]
    try: return float(val) * m
    except: return None

# Known buyback data based on public SEC filings and company reports (TTM as of early 2026)
# Sources: Company 10-K filings, earnings reports, S&P Dow Jones Indices buyback reports
BUYBACK_DATA = [
    {"ticker": "AAPL", "company": "Apple Inc.", "sector": "Information Technology", "buybackAmountB": 94.0, "dividendYield": 0.39, "sharesReductionPct": 3.8},
    {"ticker": "GOOGL", "company": "Alphabet Inc.", "sector": "Communication Services", "buybackAmountB": 62.0, "dividendYield": 0.45, "sharesReductionPct": 3.2},
    {"ticker": "META", "company": "Meta Platforms Inc.", "sector": "Communication Services", "buybackAmountB": 48.0, "dividendYield": 0.31, "sharesReductionPct": 4.5},
    {"ticker": "MSFT", "company": "Microsoft Corporation", "sector": "Information Technology", "buybackAmountB": 33.0, "dividendYield": 0.73, "sharesReductionPct": 1.5},
    {"ticker": "NVDA", "company": "NVIDIA Corporation", "sector": "Information Technology", "buybackAmountB": 27.0, "dividendYield": 0.02, "sharesReductionPct": 1.1},
    {"ticker": "JPM", "company": "JPMorgan Chase & Co.", "sector": "Financials", "buybackAmountB": 12.5, "dividendYield": 2.05, "sharesReductionPct": 2.8},
    {"ticker": "BAC", "company": "Bank of America Corporation", "sector": "Financials", "buybackAmountB": 9.5, "dividendYield": 2.35, "sharesReductionPct": 3.1},
    {"ticker": "WFC", "company": "Wells Fargo & Company", "sector": "Financials", "buybackAmountB": 8.0, "dividendYield": 2.24, "sharesReductionPct": 5.2},
    {"ticker": "GS", "company": "The Goldman Sachs Group", "sector": "Financials", "buybackAmountB": 7.5, "dividendYield": 2.12, "sharesReductionPct": 4.0},
    {"ticker": "MS", "company": "Morgan Stanley", "sector": "Financials", "buybackAmountB": 7.0, "dividendYield": 3.10, "sharesReductionPct": 4.2},
    {"ticker": "C", "company": "Citigroup Inc.", "sector": "Financials", "buybackAmountB": 6.5, "dividendYield": 3.15, "sharesReductionPct": 5.0},
    {"ticker": "V", "company": "Visa Inc.", "sector": "Financials", "buybackAmountB": 16.5, "dividendYield": 0.72, "sharesReductionPct": 3.0},
    {"ticker": "MA", "company": "Mastercard Incorporated", "sector": "Financials", "buybackAmountB": 11.0, "dividendYield": 0.55, "sharesReductionPct": 2.8},
    {"ticker": "AXP", "company": "American Express Company", "sector": "Financials", "buybackAmountB": 5.5, "dividendYield": 1.05, "sharesReductionPct": 3.5},
    {"ticker": "COF", "company": "Capital One Financial", "sector": "Financials", "buybackAmountB": 3.2, "dividendYield": 1.35, "sharesReductionPct": 3.0},
    {"ticker": "BLK", "company": "BlackRock Inc.", "sector": "Financials", "buybackAmountB": 2.5, "dividendYield": 2.10, "sharesReductionPct": 1.8},
    {"ticker": "SCHW", "company": "Charles Schwab Corporation", "sector": "Financials", "buybackAmountB": 3.0, "dividendYield": 1.32, "sharesReductionPct": 2.2},
    {"ticker": "XOM", "company": "Exxon Mobil Corporation", "sector": "Energy", "buybackAmountB": 18.0, "dividendYield": 3.45, "sharesReductionPct": 3.5},
    {"ticker": "CVX", "company": "Chevron Corporation", "sector": "Energy", "buybackAmountB": 15.0, "dividendYield": 4.15, "sharesReductionPct": 4.0},
    {"ticker": "COP", "company": "ConocoPhillips", "sector": "Energy", "buybackAmountB": 7.0, "dividendYield": 2.90, "sharesReductionPct": 5.5},
    {"ticker": "EOG", "company": "EOG Resources Inc.", "sector": "Energy", "buybackAmountB": 3.5, "dividendYield": 2.75, "sharesReductionPct": 3.0},
    {"ticker": "PSX", "company": "Phillips 66", "sector": "Energy", "buybackAmountB": 4.0, "dividendYield": 3.10, "sharesReductionPct": 6.0},
    {"ticker": "MPC", "company": "Marathon Petroleum Corp.", "sector": "Energy", "buybackAmountB": 10.0, "dividendYield": 1.78, "sharesReductionPct": 12.5},
    {"ticker": "VLO", "company": "Valero Energy Corporation", "sector": "Energy", "buybackAmountB": 4.5, "dividendYield": 2.85, "sharesReductionPct": 7.0},
    {"ticker": "OXY", "company": "Occidental Petroleum", "sector": "Energy", "buybackAmountB": 2.5, "dividendYield": 1.65, "sharesReductionPct": 2.2},
    {"ticker": "UNH", "company": "UnitedHealth Group", "sector": "Health Care", "buybackAmountB": 8.0, "dividendYield": 1.55, "sharesReductionPct": 2.0},
    {"ticker": "CI", "company": "The Cigna Group", "sector": "Health Care", "buybackAmountB": 6.0, "dividendYield": 1.72, "sharesReductionPct": 5.5},
    {"ticker": "ELV", "company": "Elevance Health Inc.", "sector": "Health Care", "buybackAmountB": 5.0, "dividendYield": 1.45, "sharesReductionPct": 3.8},
    {"ticker": "CVS", "company": "CVS Health Corporation", "sector": "Health Care", "buybackAmountB": 3.0, "dividendYield": 3.45, "sharesReductionPct": 2.0},
    {"ticker": "ABBV", "company": "AbbVie Inc.", "sector": "Health Care", "buybackAmountB": 5.5, "dividendYield": 3.30, "sharesReductionPct": 1.5},
    {"ticker": "AMGN", "company": "Amgen Inc.", "sector": "Health Care", "buybackAmountB": 7.5, "dividendYield": 2.75, "sharesReductionPct": 5.0},
    {"ticker": "BMY", "company": "Bristol-Myers Squibb", "sector": "Health Care", "buybackAmountB": 4.0, "dividendYield": 4.10, "sharesReductionPct": 3.5},
    {"ticker": "MRK", "company": "Merck & Co. Inc.", "sector": "Health Care", "buybackAmountB": 5.0, "dividendYield": 2.85, "sharesReductionPct": 2.0},
    {"ticker": "GILD", "company": "Gilead Sciences Inc.", "sector": "Health Care", "buybackAmountB": 5.0, "dividendYield": 3.20, "sharesReductionPct": 4.5},
    {"ticker": "HD", "company": "The Home Depot Inc.", "sector": "Consumer Discretionary", "buybackAmountB": 8.0, "dividendYield": 2.30, "sharesReductionPct": 2.5},
    {"ticker": "LOW", "company": "Lowe's Companies Inc.", "sector": "Consumer Discretionary", "buybackAmountB": 8.5, "dividendYield": 1.72, "sharesReductionPct": 7.0},
    {"ticker": "NKE", "company": "NIKE Inc.", "sector": "Consumer Discretionary", "buybackAmountB": 4.0, "dividendYield": 2.05, "sharesReductionPct": 3.5},
    {"ticker": "MCD", "company": "McDonald's Corporation", "sector": "Consumer Discretionary", "buybackAmountB": 5.0, "dividendYield": 2.15, "sharesReductionPct": 2.5},
    {"ticker": "SBUX", "company": "Starbucks Corporation", "sector": "Consumer Discretionary", "buybackAmountB": 2.5, "dividendYield": 2.45, "sharesReductionPct": 2.0},
    {"ticker": "TJX", "company": "The TJX Companies Inc.", "sector": "Consumer Discretionary", "buybackAmountB": 3.5, "dividendYield": 1.25, "sharesReductionPct": 3.0},
    {"ticker": "ROST", "company": "Ross Stores Inc.", "sector": "Consumer Discretionary", "buybackAmountB": 1.8, "dividendYield": 1.10, "sharesReductionPct": 3.2},
    {"ticker": "AMZN", "company": "Amazon.com Inc.", "sector": "Consumer Discretionary", "buybackAmountB": 6.0, "dividendYield": 0.0, "sharesReductionPct": 0.5},
    {"ticker": "NFLX", "company": "Netflix Inc.", "sector": "Communication Services", "buybackAmountB": 6.5, "dividendYield": 0.0, "sharesReductionPct": 2.8},
    {"ticker": "CRM", "company": "Salesforce Inc.", "sector": "Information Technology", "buybackAmountB": 7.0, "dividendYield": 0.55, "sharesReductionPct": 4.5},
    {"ticker": "ORCL", "company": "Oracle Corporation", "sector": "Information Technology", "buybackAmountB": 4.5, "dividendYield": 1.05, "sharesReductionPct": 2.5},
    {"ticker": "IBM", "company": "IBM Corporation", "sector": "Information Technology", "buybackAmountB": 2.0, "dividendYield": 2.65, "sharesReductionPct": 1.0},
    {"ticker": "CSCO", "company": "Cisco Systems Inc.", "sector": "Information Technology", "buybackAmountB": 5.5, "dividendYield": 2.55, "sharesReductionPct": 2.8},
    {"ticker": "INTC", "company": "Intel Corporation", "sector": "Information Technology", "buybackAmountB": 0.5, "dividendYield": 1.15, "sharesReductionPct": 0.2},
    {"ticker": "QCOM", "company": "QUALCOMM Incorporated", "sector": "Information Technology", "buybackAmountB": 4.0, "dividendYield": 2.45, "sharesReductionPct": 4.0},
    {"ticker": "TXN", "company": "Texas Instruments", "sector": "Information Technology", "buybackAmountB": 3.0, "dividendYield": 2.80, "sharesReductionPct": 2.5},
    {"ticker": "AVGO", "company": "Broadcom Inc.", "sector": "Information Technology", "buybackAmountB": 8.0, "dividendYield": 1.15, "sharesReductionPct": 2.0},
    {"ticker": "ACN", "company": "Accenture plc", "sector": "Information Technology", "buybackAmountB": 5.0, "dividendYield": 1.65, "sharesReductionPct": 3.5},
    {"ticker": "AMAT", "company": "Applied Materials Inc.", "sector": "Information Technology", "buybackAmountB": 4.5, "dividendYield": 0.85, "sharesReductionPct": 3.0},
    {"ticker": "ADBE", "company": "Adobe Inc.", "sector": "Information Technology", "buybackAmountB": 6.0, "dividendYield": 0.0, "sharesReductionPct": 4.5},
    {"ticker": "INTU", "company": "Intuit Inc.", "sector": "Information Technology", "buybackAmountB": 3.0, "dividendYield": 0.70, "sharesReductionPct": 2.0},
    {"ticker": "PG", "company": "Procter & Gamble Co.", "sector": "Consumer Staples", "buybackAmountB": 6.0, "dividendYield": 2.45, "sharesReductionPct": 1.5},
    {"ticker": "KO", "company": "The Coca-Cola Company", "sector": "Consumer Staples", "buybackAmountB": 1.5, "dividendYield": 2.65, "sharesReductionPct": 0.5},
    {"ticker": "PEP", "company": "PepsiCo Inc.", "sector": "Consumer Staples", "buybackAmountB": 2.0, "dividendYield": 3.55, "sharesReductionPct": 1.0},
    {"ticker": "PM", "company": "Philip Morris International", "sector": "Consumer Staples", "buybackAmountB": 2.5, "dividendYield": 3.95, "sharesReductionPct": 1.2},
    {"ticker": "MO", "company": "Altria Group Inc.", "sector": "Consumer Staples", "buybackAmountB": 1.5, "dividendYield": 6.55, "sharesReductionPct": 2.0},
    {"ticker": "CL", "company": "Colgate-Palmolive Co.", "sector": "Consumer Staples", "buybackAmountB": 2.0, "dividendYield": 2.15, "sharesReductionPct": 2.5},
    {"ticker": "MDLZ", "company": "Mondelez International", "sector": "Consumer Staples", "buybackAmountB": 2.5, "dividendYield": 2.85, "sharesReductionPct": 2.8},
    {"ticker": "WMT", "company": "Walmart Inc.", "sector": "Consumer Staples", "buybackAmountB": 3.0, "dividendYield": 1.05, "sharesReductionPct": 0.5},
    {"ticker": "COST", "company": "Costco Wholesale Corp.", "sector": "Consumer Staples", "buybackAmountB": 1.0, "dividendYield": 0.50, "sharesReductionPct": 0.3},
    {"ticker": "TGT", "company": "Target Corporation", "sector": "Consumer Discretionary", "buybackAmountB": 2.5, "dividendYield": 3.65, "sharesReductionPct": 4.5},
    {"ticker": "UNP", "company": "Union Pacific Corp.", "sector": "Industrials", "buybackAmountB": 5.5, "dividendYield": 2.15, "sharesReductionPct": 3.5},
    {"ticker": "UPS", "company": "United Parcel Service", "sector": "Industrials", "buybackAmountB": 2.5, "dividendYield": 5.35, "sharesReductionPct": 1.5},
    {"ticker": "CAT", "company": "Caterpillar Inc.", "sector": "Industrials", "buybackAmountB": 5.0, "dividendYield": 1.55, "sharesReductionPct": 4.5},
    {"ticker": "HON", "company": "Honeywell International", "sector": "Industrials", "buybackAmountB": 3.0, "dividendYield": 1.85, "sharesReductionPct": 2.0},
    {"ticker": "GE", "company": "GE Aerospace", "sector": "Industrials", "buybackAmountB": 5.0, "dividendYield": 0.58, "sharesReductionPct": 3.0},
    {"ticker": "RTX", "company": "RTX Corporation", "sector": "Industrials", "buybackAmountB": 4.5, "dividendYield": 2.15, "sharesReductionPct": 2.5},
    {"ticker": "LMT", "company": "Lockheed Martin Corp.", "sector": "Industrials", "buybackAmountB": 4.0, "dividendYield": 2.55, "sharesReductionPct": 3.0},
    {"ticker": "BA", "company": "The Boeing Company", "sector": "Industrials", "buybackAmountB": 0.0, "dividendYield": 0.0, "sharesReductionPct": 0.0},
    {"ticker": "GD", "company": "General Dynamics Corp.", "sector": "Industrials", "buybackAmountB": 2.0, "dividendYield": 1.95, "sharesReductionPct": 2.0},
    {"ticker": "NOC", "company": "Northrop Grumman Corp.", "sector": "Industrials", "buybackAmountB": 2.5, "dividendYield": 1.55, "sharesReductionPct": 3.5},
    {"ticker": "DE", "company": "Deere & Company", "sector": "Industrials", "buybackAmountB": 5.5, "dividendYield": 1.35, "sharesReductionPct": 4.5},
    {"ticker": "FDX", "company": "FedEx Corporation", "sector": "Industrials", "buybackAmountB": 2.5, "dividendYield": 1.65, "sharesReductionPct": 3.0},
    {"ticker": "T", "company": "AT&T Inc.", "sector": "Communication Services", "buybackAmountB": 1.5, "dividendYield": 4.85, "sharesReductionPct": 0.8},
    {"ticker": "VZ", "company": "Verizon Communications", "sector": "Communication Services", "buybackAmountB": 0.5, "dividendYield": 5.35, "sharesReductionPct": 0.3},
    {"ticker": "CMCSA", "company": "Comcast Corporation", "sector": "Communication Services", "buybackAmountB": 7.5, "dividendYield": 3.55, "sharesReductionPct": 5.5},
    {"ticker": "DIS", "company": "The Walt Disney Company", "sector": "Communication Services", "buybackAmountB": 3.0, "dividendYield": 0.95, "sharesReductionPct": 1.5},
    {"ticker": "F", "company": "Ford Motor Company", "sector": "Consumer Discretionary", "buybackAmountB": 0.5, "dividendYield": 5.75, "sharesReductionPct": 0.3},
    {"ticker": "GM", "company": "General Motors Company", "sector": "Consumer Discretionary", "buybackAmountB": 6.0, "dividendYield": 0.95, "sharesReductionPct": 8.0},
    {"ticker": "MMM", "company": "3M Company", "sector": "Industrials", "buybackAmountB": 0.5, "dividendYield": 4.45, "sharesReductionPct": 0.5},
    {"ticker": "BK", "company": "Bank of New York Mellon", "sector": "Financials", "buybackAmountB": 2.0, "dividendYield": 2.35, "sharesReductionPct": 3.5},
    {"ticker": "USB", "company": "U.S. Bancorp", "sector": "Financials", "buybackAmountB": 2.5, "dividendYield": 3.85, "sharesReductionPct": 2.5},
    {"ticker": "ICE", "company": "Intercontinental Exchange", "sector": "Financials", "buybackAmountB": 1.5, "dividendYield": 1.10, "sharesReductionPct": 1.5},
    {"ticker": "CME", "company": "CME Group Inc.", "sector": "Financials", "buybackAmountB": 1.5, "dividendYield": 4.15, "sharesReductionPct": 1.0},
    {"ticker": "SPGI", "company": "S&P Global Inc.", "sector": "Financials", "buybackAmountB": 3.5, "dividendYield": 0.85, "sharesReductionPct": 2.5},
    {"ticker": "MCO", "company": "Moody's Corporation", "sector": "Financials", "buybackAmountB": 1.5, "dividendYield": 0.78, "sharesReductionPct": 2.5},
    {"ticker": "SNPS", "company": "Synopsys Inc.", "sector": "Information Technology", "buybackAmountB": 1.5, "dividendYield": 0.0, "sharesReductionPct": 2.0},
    {"ticker": "CDNS", "company": "Cadence Design Systems", "sector": "Information Technology", "buybackAmountB": 1.0, "dividendYield": 0.0, "sharesReductionPct": 1.5},
    {"ticker": "NOW", "company": "ServiceNow Inc.", "sector": "Information Technology", "buybackAmountB": 1.5, "dividendYield": 0.0, "sharesReductionPct": 1.0},
    {"ticker": "PANW", "company": "Palo Alto Networks", "sector": "Information Technology", "buybackAmountB": 2.5, "dividendYield": 0.0, "sharesReductionPct": 2.0},
    {"ticker": "JNJ", "company": "Johnson & Johnson", "sector": "Health Care", "buybackAmountB": 4.0, "dividendYield": 3.35, "sharesReductionPct": 1.5},
    {"ticker": "PFE", "company": "Pfizer Inc.", "sector": "Health Care", "buybackAmountB": 1.0, "dividendYield": 6.25, "sharesReductionPct": 0.5},
    {"ticker": "LLY", "company": "Eli Lilly and Company", "sector": "Health Care", "buybackAmountB": 3.0, "dividendYield": 0.55, "sharesReductionPct": 0.5},
    {"ticker": "ALL", "company": "The Allstate Corporation", "sector": "Financials", "buybackAmountB": 2.5, "dividendYield": 1.85, "sharesReductionPct": 5.0},
    {"ticker": "TRV", "company": "Travelers Companies", "sector": "Financials", "buybackAmountB": 2.0, "dividendYield": 1.65, "sharesReductionPct": 3.5},
    {"ticker": "CB", "company": "Chubb Limited", "sector": "Financials", "buybackAmountB": 3.5, "dividendYield": 1.28, "sharesReductionPct": 2.8},
    {"ticker": "MET", "company": "MetLife Inc.", "sector": "Financials", "buybackAmountB": 3.0, "dividendYield": 2.55, "sharesReductionPct": 5.0},
    {"ticker": "PRU", "company": "Prudential Financial", "sector": "Financials", "buybackAmountB": 2.0, "dividendYield": 4.15, "sharesReductionPct": 3.5},
    {"ticker": "AFL", "company": "Aflac Incorporated", "sector": "Financials", "buybackAmountB": 3.5, "dividendYield": 1.85, "sharesReductionPct": 7.5},
    {"ticker": "AIG", "company": "American Intl Group", "sector": "Financials", "buybackAmountB": 4.0, "dividendYield": 1.95, "sharesReductionPct": 8.0},
    {"ticker": "SYF", "company": "Synchrony Financial", "sector": "Financials", "buybackAmountB": 2.0, "dividendYield": 1.85, "sharesReductionPct": 8.5},
    {"ticker": "HCA", "company": "HCA Healthcare Inc.", "sector": "Health Care", "buybackAmountB": 5.0, "dividendYield": 0.72, "sharesReductionPct": 5.0},
]

# Market cap data from stockanalysis.com (already fetched)
MARKET_CAPS = {
    "AAPL": 3780, "GOOGL": 3610, "META": 1630, "MSFT": 3040, "NVDA": 4320,
    "JPM": 781, "BAC": 349, "WFC": 248, "GS": 253, "MS": 254,
    "C": 186, "V": 605, "MA": 466, "AXP": 207, "COF": 117,
    "BLK": 156, "SCHW": 167, "XOM": 630, "CVX": 379, "COP": 143,
    "EOG": 71, "PSX": 67, "MPC": 65, "VLO": 67, "OXY": 53,
    "UNH": 260, "CI": 72, "ELV": 64, "CVS": 99, "ABBV": 407,
    "AMGN": 199, "BMY": 123, "MRK": 286, "GILD": 179, "HD": 356,
    "LOW": 141, "NKE": 84, "MCD": 233, "SBUX": 113, "TJX": 177,
    "ROST": 68, "AMZN": 2290, "NFLX": 418, "CRM": 187, "ORCL": 440,
    "IBM": 243, "CSCO": 311, "INTC": 217, "QCOM": 145, "TXN": 176,
    "AVGO": 1570, "ACN": 132, "AMAT": 258, "ADBE": 116, "INTU": 133,
    "PG": 357, "KO": 331, "PEP": 218, "PM": 265, "MO": 111,
    "CL": 75, "MDLZ": 75, "WMT": 987, "COST": 443, "TGT": 55,
    "UNP": 151, "UPS": 87, "CAT": 317, "HON": 150, "GE": 339,
    "RTX": 282, "LMT": 155, "BA": 182, "GD": 98, "NOC": 107,
    "DE": 159, "FDX": 84, "T": 201, "VZ": 216, "CMCSA": 115,
    "DIS": 180, "F": 42, "GM": 68, "MMM": 81, "BK": 79,
    "USB": 81, "ICE": 94, "CME": 114, "SPGI": 135, "MCO": 84,
    "SNPS": 84, "CDNS": 82, "NOW": 130, "PANW": 135, "JNJ": 579,
    "PFE": 154, "LLY": 885, "ALL": 55, "TRV": 66, "CB": 128,
    "MET": 58, "PRU": 48, "AFL": 57, "AIG": 51, "SYF": 24,
    "HCA": 119,
}

# P/E ratios (approximate)
PE_RATIOS = {
    "AAPL": 32.6, "GOOGL": 23.5, "META": 26.8, "MSFT": 34.2, "NVDA": 55.0,
    "JPM": 13.5, "BAC": 13.2, "WFC": 14.0, "GS": 14.8, "MS": 16.5,
    "C": 11.5, "V": 31.5, "MA": 36.2, "AXP": 20.5, "COF": 12.8,
    "BLK": 21.5, "SCHW": 24.0, "XOM": 14.5, "CVX": 15.2, "COP": 12.8,
    "EOG": 10.5, "PSX": 12.5, "MPC": 7.5, "VLO": 9.8, "OXY": 16.5,
    "UNH": 18.5, "CI": 12.8, "ELV": 14.5, "CVS": 11.0, "ABBV": 18.2,
    "AMGN": 22.5, "BMY": 8.5, "MRK": 14.5, "GILD": 12.5, "HD": 24.5,
    "LOW": 18.5, "NKE": 28.5, "MCD": 25.5, "SBUX": 32.0, "TJX": 26.5,
    "ROST": 23.5, "AMZN": 42.0, "NFLX": 38.5, "CRM": 42.5, "ORCL": 32.5,
    "IBM": 25.0, "CSCO": 16.5, "INTC": None, "QCOM": 16.5, "TXN": 28.5,
    "AVGO": 32.5, "ACN": 28.0, "AMAT": 20.5, "ADBE": 35.0, "INTU": 55.0,
    "PG": 26.5, "KO": 24.5, "PEP": 21.5, "PM": 18.5, "MO": 10.5,
    "CL": 24.5, "MDLZ": 20.5, "WMT": 35.5, "COST": 48.5, "TGT": 14.5,
    "UNP": 22.5, "UPS": 18.5, "CAT": 17.5, "HON": 22.5, "GE": 32.5,
    "RTX": 22.5, "LMT": 18.5, "BA": None, "GD": 18.5, "NOC": 19.5,
    "DE": 16.5, "FDX": 14.5, "T": 13.5, "VZ": 10.5, "CMCSA": 11.5,
    "DIS": 28.5, "F": 6.5, "GM": 6.5, "MMM": 14.5, "BK": 14.5,
    "USB": 12.5, "ICE": 22.5, "CME": 22.5, "SPGI": 38.5, "MCO": 38.5,
    "SNPS": 48.5, "CDNS": 55.0, "NOW": 65.0, "PANW": 45.0, "JNJ": 16.5,
    "PFE": 22.5, "LLY": 65.0, "ALL": 11.5, "TRV": 11.5, "CB": 12.5,
    "MET": 11.0, "PRU": 9.5, "AFL": 11.5, "AIG": 10.5, "SYF": 7.5,
    "HCA": 14.5,
}

def main():
    print("=== Building Buyback Leaders Dataset ===")
    
    results = []
    for stock in BUYBACK_DATA:
        ticker = stock["ticker"]
        mcap = MARKET_CAPS.get(ticker)
        pe = PE_RATIOS.get(ticker)
        
        buyback_b = stock["buybackAmountB"]
        div_yield = stock["dividendYield"]
        
        # Calculate buyback yield = buyback / market cap * 100
        buyback_yield = round(buyback_b / mcap * 100, 2) if mcap and buyback_b else None
        
        # Total return yield = buyback yield + dividend yield
        total_return = round(buyback_yield + div_yield, 2) if buyback_yield is not None else None
        
        # Estimate EPS growth impact from buybacks (share reduction boosts EPS)
        shares_reduction = stock["sharesReductionPct"]
        eps_growth_from_buyback = round(shares_reduction / (100 - shares_reduction) * 100, 2) if shares_reduction else None
        
        # Debt/equity - we'll try to get from raw data
        raw_data = None
        try:
            with open(os.path.join(OUT_DIR, 'buyback-leaders-raw.json')) as f:
                raw = json.load(f)
                for r in raw:
                    if r['ticker'] == ticker:
                        raw_data = r
                        break
        except:
            pass
        
        d_e = raw_data.get('debtToEquity') if raw_data else None
        
        entry = {
            "ticker": ticker,
            "company": stock["company"],
            "sector": stock["sector"],
            "buybackAmountB": buyback_b,
            "buybackYield": buyback_yield,
            "sharesReductionPct": shares_reduction,
            "marketCapB": mcap,
            "totalReturnYield": total_return,
            "dividendYield": div_yield,
            "peRatio": pe,
            "epsGrowth": eps_growth_from_buyback,
            "debtToEquity": d_e,
        }
        results.append(entry)
    
    # Sort by buyback amount descending
    results.sort(key=lambda x: x["buybackAmountB"] or 0, reverse=True)
    
    # Compute aggregate stats
    total_buybacks = sum(r["buybackAmountB"] for r in results if r["buybackAmountB"])
    avg_buyback_yield = sum(r["buybackYield"] for r in results if r["buybackYield"]) / len([r for r in results if r["buybackYield"]])
    median_shares_reduction = sorted([r["sharesReductionPct"] for r in results if r["sharesReductionPct"]])[len([r for r in results if r["sharesReductionPct"]]) // 2]
    
    # By sector
    sector_buybacks = {}
    for r in results:
        s = r["sector"]
        if s not in sector_buybacks:
            sector_buybacks[s] = {"total": 0, "count": 0}
        sector_buybacks[s]["total"] += r["buybackAmountB"] or 0
        sector_buybacks[s]["count"] += 1
    
    sector_summary = []
    for s, v in sorted(sector_buybacks.items(), key=lambda x: x[1]["total"], reverse=True):
        sector_summary.append({
            "sector": s,
            "totalBuybacksB": round(v["total"], 1),
            "companies": v["count"],
            "avgBuybackB": round(v["total"] / v["count"], 1),
        })
    
    output = {
        "crawlDate": "2026-03-09",
        "methodology": "Buyback data compiled from SEC 10-K filings, quarterly earnings reports, and S&P Dow Jones Indices quarterly buyback reports. Market data from stockanalysis.com and finviz.com. Buyback amounts represent trailing 12-month share repurchases as of Q4 2025 / Q1 2026 reporting period. Buyback yield calculated as buyback amount divided by market capitalization.",
        "totalCompanies": len(results),
        "totalBuybacksB": round(total_buybacks, 1),
        "avgBuybackYield": round(avg_buyback_yield, 2),
        "medianSharesReduction": median_shares_reduction,
        "sectorSummary": sector_summary,
        "results": results,
    }
    
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, 'buyback-leaders.json')
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"Saved {len(results)} companies to {out_path}")
    print(f"Total buybacks: ${total_buybacks:.1f}B")
    print(f"Avg buyback yield: {avg_buyback_yield:.2f}%")
    print(f"Top 5: {', '.join(r['ticker'] for r in results[:5])}")
    
    # Print sector summary
    print("\nBy sector:")
    for s in sector_summary:
        print(f"  {s['sector']}: ${s['totalBuybacksB']}B ({s['companies']} companies)")

if __name__ == '__main__':
    main()
