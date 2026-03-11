import re

with open('src/pages/index.astro', 'r') as f:
    content = f.read()

old_tool = """  {
    emoji: "📈",
    name: "Bond Yield Calculator",
    slug: "/bond-yield-calculator.html",
    stat: "YTM",
    statLabel: "Current, Call & Tax-Equivalent",
    desc: "Calculate bond yields, maturity, duration, and tax-equivalent yield.",
    tag: "CALCULATOR"
  },"""

new_tool = """  {
    title: "Bond Yield Calculator",
    subtitle: "YTM · duration · yield to call",
    slug: "/bond-yield-calculator.html",
    stat: "YTM",
    statLabel: "Current, Call & Tax-Equivalent",
    desc: "Interactive bond yield calculator for current yield, YTM, YTC, Macaulay duration, and tax-equivalent yield with real-time curves.",
    tag: "CALCULATOR"
  },"""

content = content.replace(old_tool, new_tool)

with open('src/pages/index.astro', 'w') as f:
    f.write(content)
