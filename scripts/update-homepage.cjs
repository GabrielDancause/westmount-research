const fs = require('fs');
const path = require('path');

const indexAstroPath = path.join(__dirname, '../src/pages/index.astro');
let content = fs.readFileSync(indexAstroPath, 'utf8');

const dataPath = path.join(__dirname, '../data-margins.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const topIndustry = data.topIndustry;
const totalIndustries = data.industries.length;

const newStudy = {
  title: "Profit Margins by Industry 2026",
  subtitle: `${totalIndustries} industries · most profitable`,
  slug: "/profit-margins-industry",
  stat: (topIndustry.median_net_margin * 100).toFixed(1) + "%",
  statLabel: `highest margin (${topIndustry.industry})`,
  desc: `Comparing median net profit and operating margins across ${totalIndustries} GICS sub-industries in the S&P 500 to find the most and least profitable sectors.`,
  tag: "ORIGINAL RESEARCH"
};

const studyString = `  {
    title: "${newStudy.title}",
    subtitle: "${newStudy.subtitle}",
    slug: "${newStudy.slug}",
    stat: "${newStudy.stat}",
    statLabel: "${newStudy.statLabel}",
    desc: "${newStudy.desc}",
    tag: "${newStudy.tag}",
  },
`;

content = content.replace('const studies = [\n', 'const studies = [\n' + studyString);

fs.writeFileSync(indexAstroPath, content);
console.log("Updated index.astro");
