import fs from 'fs';

async function parseTabs() {
  const url = 'https://www.npci.org.in/api/product-statistic/tabs?locale=en';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    fs.writeFileSync('scratch/npci_tabs.json', JSON.stringify(data, null, 2));
    
    const results = data.data?.results || [];
    console.log(`Found ${results.length} products in tabs.`);
    
    // Find the one for NETC
    const netcProduct = results.find(p => p.slug === 'netc-fastag');
    if (netcProduct) {
      console.log('NETC Product found! Tabs:');
      const tabs = netcProduct.tabs || [];
      for (const tab of tabs) {
        console.log(`- [${tab.tab_type}] Name: "${tab.tab_name}" | Slug: "${tab.slug}" | Title: "${tab.tab_title}"`);
        if (tab.year_range) {
          console.log(`  Year ranges: ${tab.year_range.map(yr => yr.year_range).join(', ')}`);
        }
        if (tab.year_filter) {
          console.log(`  Year filters: ${tab.year_filter.map(yf => yf.year).join(', ')}`);
        }
      }
    } else {
      console.log('NETC product not found in tabs list. Available products:');
      for (const p of results) {
        console.log(`- ${p.slug} (${p.title})`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

parseTabs();
