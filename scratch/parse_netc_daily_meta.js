import fs from 'fs';

function run() {
  const fileContent = fs.readFileSync('scratch/npci_tabs.json', 'utf8');
  const data = JSON.parse(fileContent);
  
  const categories = data.data || [];
  for (const cat of categories) {
    const products = cat.products || [];
    for (const prod of products) {
      if (prod.slug === 'netc') {
        const tabs = prod.tab_details || [];
        const dailyTab = tabs.find(t => t.slug === 'netc-daily-statistics');
        console.log(JSON.stringify(dailyTab, null, 2));
      }
    }
  }
}

run();
