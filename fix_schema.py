with open('public/bond-yield-calculator.html', 'r') as f:
    html = f.read()

schema = """    <style>
/* Input Layout */"""

new_schema = """    <!-- FAQPage Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [{
        "@type": "Question",
        "name": "What is Yield to Maturity (YTM)?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yield to Maturity (YTM) is the total estimated return you will receive if you hold a bond until its maturity date. It accounts for the current market price, face value, coupon interest rate, and the time remaining until maturity, assuming all coupon payments are reinvested at the same rate."
        }
      }, {
        "@type": "Question",
        "name": "How does Current Yield differ from YTM?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Current Yield only looks at the annual coupon income relative to the current market price (Annual Income / Current Price). It does not account for capital gains or losses realized if the bond was bought at a discount or premium, nor does it factor in the time value of money, which YTM does."
        }
      }, {
        "@type": "Question",
        "name": "What is Yield to Call (YTC)?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "If a bond is callable, the issuer has the right to redeem it before the maturity date at a specified call price. Yield to Call (YTC) calculates the return assuming the bond is called at the earliest possible call date rather than held to maturity."
        }
      }, {
        "@type": "Question",
        "name": "What does Macaulay Duration mean?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Macaulay Duration measures the weighted average time until all the bond's cash flows (coupons and principal) are paid. It serves as a measure of interest rate risk: a longer duration means the bond's price will be more volatile when interest rates change."
        }
      }, {
        "@type": "Question",
        "name": "When should I use the Tax-Equivalent Yield?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tax-Equivalent Yield is used when evaluating tax-exempt municipal bonds. Because municipal bond interest is typically exempt from federal income taxes, their stated yields are often lower than taxable corporate bonds. The Tax-Equivalent Yield shows what a fully taxable bond would need to yield to equal the after-tax return of the municipal bond."
        }
      }]
    }
    </script>
    <style>
/* Input Layout */"""

if "<script type=\"application/ld+json\">" not in html:
    html = html.replace(schema, new_schema)

with open('public/bond-yield-calculator.html', 'w') as f:
    f.write(html)
