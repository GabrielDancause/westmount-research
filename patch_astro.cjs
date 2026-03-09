const fs = require('fs');
let content = fs.readFileSync('src/pages/index.astro', 'utf8');

const studiesIndex = content.indexOf('const studies = [');
if (studiesIndex !== -1) {
  const newStudy = `  {
    title: "Dividend Yield vs Growth Rate: S&P 500 Analysis 2026",
    subtitle: "409 items analyzed",
    slug: "/dividend-yield-vs-growth.html",
    stat: "409",
    statLabel: "dividend-paying stocks analyzed",
    desc: "We analyzed every dividend-paying stock in the S&P 500 to find the sweet spots (high yield, high growth) and identify the yield traps.",
    tag: "ORIGINAL RESEARCH",
  },
`;

  const insertIndex = studiesIndex + 'const studies = [\n'.length;
  content = content.slice(0, insertIndex) + newStudy + content.slice(insertIndex);
  fs.writeFileSync('src/pages/index.astro', content);
  console.log('Successfully patched index.astro');
} else {
  console.error('Could not find studies array');
}
