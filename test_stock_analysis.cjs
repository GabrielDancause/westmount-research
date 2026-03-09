const fetch = global.fetch;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function scrape() {
  const res = await fetch("https://stockanalysis.com/ipos/2026/"); // might need 2025/2026 year specific page
  const text = await res.text();
  const dom = new JSDOM(text);
  const rows = dom.window.document.querySelectorAll("table tbody tr");

  if(rows.length > 0) {
    const cols = rows[0].querySelectorAll("td");
    console.log("Cols length: ", cols.length);
    for(let i = 0; i < cols.length; i++) {
        console.log(`Col ${i}: ${cols[i].textContent.trim()}`);
    }
  } else {
    console.log("No rows found. Try just /ipos/");
    const res2 = await fetch("https://stockanalysis.com/ipos/");
    const text2 = await res2.text();
    const dom2 = new JSDOM(text2);
    const rows2 = dom2.window.document.querySelectorAll("table tbody tr");
    if(rows2.length > 0) {
      const cols = rows2[0].querySelectorAll("td");
      console.log("Cols length: ", cols.length);
      for(let i = 0; i < cols.length; i++) {
          console.log(`Col ${i}: ${cols[i].textContent.trim()}`);
      }
    }
  }
}
scrape().catch(console.error);
