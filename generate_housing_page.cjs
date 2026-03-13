const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function build() {
    try {
        const res = await axios.get('https://www.numbeo.com/property-investment/region_rankings_current.jsp?region=021', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(res.data);
        const data = [];
        $('table#t2 tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 8) {
                const citySplit = $(cols[1]).text().trim().split(', ');
                const country = citySplit[citySplit.length - 1];
                data.push({
                    city: citySplit.slice(0, -1).join(', '),
                    country: country,
                    priceToIncome: parseFloat($(cols[2]).text().trim()),
                    priceToRentCity: parseFloat($(cols[5]).text().trim()),
                    priceToRentOut: parseFloat($(cols[6]).text().trim()),
                    mortgageAsPctOfIncome: parseFloat($(cols[7]).text().trim()),
                    affordabilityIndex: parseFloat($(cols[8]).text().trim()),
                });
            }
        });

        const targetCities = [
            "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
            "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
            "Austin, TX", "Jacksonville, FL", "San Francisco, CA", "Columbus, OH", "Indianapolis, IN",
            "Seattle, WA", "Denver, CO", "Washington, DC", "Boston, MA", "Nashville, TN",
            "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton",
            "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener", "London", "Victoria", "Halifax", "Oshawa", "Windsor"
        ];

        let finalData = data.filter(d => targetCities.some(tc => d.city.includes(tc)));

        if (finalData.length < 30) {
            const usCities = data.filter(d => d.country === 'United States');
            const caCities = data.filter(d => d.country === 'Canada');
            usCities.sort((a,b) => b.priceToIncome - a.priceToIncome);
            caCities.sort((a,b) => b.priceToIncome - a.priceToIncome);
            finalData = [...usCities.slice(0, 15), ...caCities.slice(0, 15)];
        } else {
            finalData = finalData.slice(0, 30);
        }

        // Now, update the HTML file by replacing the marker
        let html = fs.readFileSync('public/housing-affordability-index-2026.html', 'utf8');
        html = html.replace('const rawData = \\${JSON.stringify(finalData)};', `const rawData = ${JSON.stringify(finalData)};`);
        fs.writeFileSync('public/housing-affordability-index-2026.html', html);
        console.log('Successfully injected real data into public/housing-affordability-index-2026.html');
    } catch (e) {
        console.error(e);
    }
}
build();
