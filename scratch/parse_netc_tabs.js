import fs from 'fs';

function run() {
  const fileContent = fs.readFileSync('scratch/npci_tabs.json', 'utf8');
  const data = JSON.parse(fileContent);
  
  // The root structure has: status, data (which is an array)
  // Let's traverse data
  const categories = data.data || [];
  for (const cat of categories) {
    console.log(`Category: ${cat.title}`);
    const products = cat.products || [];
    for (const prod of products) {
      if (prod.slug.toLowerCase().includes('netc') || prod.product_name.toLowerCase().includes('netc') || prod.product_name.toLowerCase().includes('fastag')) {
        console.log(`\n  Product: ${prod.product_name} | Slug: ${prod.slug}`);
        const tabs = prod.tab_details || [];
        for (const tab of tabs) {
          console.log(`    Tab: "${tab.tab_name}" | Slug: "${tab.slug}" | Title: "${tab.tab_title}"`);
          if (tab.year_range) {
            console.log(`      Year Ranges: ${tab.year_range.map(y => y.year_range).join(', ')}`);
          }
          if (tab.year_filter) {
            console.log(`      Year Filters: ${tab.year_filter.map(y => y.year).join(', ')}`);
          }
        }
      }
    }
  }
}

run();
