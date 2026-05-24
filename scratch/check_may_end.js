async function checkDate(dateStr) {
  const url = 'https://report.grid-india.in/psp_report.php';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: new URLSearchParams({ selected_date: dateStr })
    });
    if (res.status !== 200) return null;
    const html = await res.text();
    const matches = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    const files = matches.filter(href => href.includes('NLDC_PSP'));
    return files;
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log("Checking May 2025 daily reports...");
  for (let day = 1; day <= 31; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `2025-05-${dayStr}`;
    const files = await checkDate(dateStr);
    if (files) {
      console.log(`Date: ${dateStr} | Files: ${files.length}`);
      if (files.length > 0) {
        files.forEach(f => console.log(`  -> ${f}`));
      }
    } else {
      console.log(`Date: ${dateStr} | Fetch failed or non-200`);
    }
  }
}

run();
