with open('public/bond-yield-calculator.html', 'r') as f:
    html = f.read()

# Replace inputs
old_years = """                    <div class="input-group">
                        <label for="years-to-maturity">Years to Maturity</label>
                        <input type="number" id="years-to-maturity" value="10" step="0.5">
                    </div>"""
new_years = """                    <div class="input-group">
                        <label for="maturity-date">Maturity Date</label>
                        <input type="date" id="maturity-date">
                    </div>"""
html = html.replace(old_years, new_years)

old_call = """                <div class="input-group" style="margin-top: 16px;">
                    <label for="years-to-call">Years to Call (Optional)</label>
                    <input type="number" id="years-to-call" value="" step="0.5" placeholder="e.g. 5">
                </div>"""
new_call = """                <div class="input-group" style="margin-top: 16px;">
                    <label for="call-date">Call Date (Optional)</label>
                    <input type="date" id="call-date">
                </div>"""
html = html.replace(old_call, new_call)

# Update Javascript DOM
old_js_dom = """    yearsToMaturity: document.getElementById('years-to-maturity'),
    frequency: document.getElementById('payment-frequency'),
    yearsToCall: document.getElementById('years-to-call'),"""
new_js_dom = """    maturityDate: document.getElementById('maturity-date'),
    frequency: document.getElementById('payment-frequency'),
    callDate: document.getElementById('call-date'),"""
html = html.replace(old_js_dom, new_js_dom)

# Add Date handling
old_calc_start = """function calculate() {
    const p = parseFloat(els.price.value) || 0;
    const fv = parseFloat(els.faceValue.value) || 0;
    const cr = parseFloat(els.couponRate.value) || 0;
    const ytmYears = parseFloat(els.yearsToMaturity.value) || 0;
    const freq = parseInt(els.frequency.value) || 2;

    const ytcYears = parseFloat(els.yearsToCall.value);"""
new_calc_start = """function calculate() {
    const p = parseFloat(els.price.value) || 0;
    const fv = parseFloat(els.faceValue.value) || 0;
    const cr = parseFloat(els.couponRate.value) || 0;

    const today = new Date();

    let ytmYears = 0;
    if (els.maturityDate.value) {
        const matDate = new Date(els.maturityDate.value);
        ytmYears = (matDate - today) / (1000 * 60 * 60 * 24 * 365.25);
    }

    const freq = parseInt(els.frequency.value) || 2;

    let ytcYears = NaN;
    if (els.callDate.value) {
        const callDt = new Date(els.callDate.value);
        ytcYears = (callDt - today) / (1000 * 60 * 60 * 24 * 365.25);
    }"""
html = html.replace(old_calc_start, new_calc_start)

# Add initial date setting script
init_dates = """// Initial calculation
document.addEventListener('DOMContentLoaded', () => {
    // Set default dates
    const today = new Date();
    const tenYears = new Date(today.getFullYear() + 10, today.getMonth(), today.getDate());
    els.maturityDate.valueAsDate = tenYears;

    calculate();
});"""
html = html.replace("// Initial calculation\ndocument.addEventListener('DOMContentLoaded', calculate);", init_dates)

with open('public/bond-yield-calculator.html', 'w') as f:
    f.write(html)
