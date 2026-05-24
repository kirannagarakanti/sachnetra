import fs from 'fs';

async function fetchPath(p) {
  const url = `https://report.grid-india.in/index.php?p=${encodeURIComponent(p)}`;
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (res.status !== 200) {
      console.log(`Failed to fetch ${p}, status: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error(`Error fetching ${p}: ${err.message}`);
    return null;
  }
}

function parseFolders(html) {
  if (!html) return [];
  const matches = [...html.matchAll(/\?p=[^"'>\s]+/g)];
  const folders = matches.map(m => {
    const pVal = m[0].split('=')[1];
    return decodeURIComponent(pVal);
  });
  // Filter unique folders that are subfolders of interest
  return [...new Set(folders)];
}

async function run() {
  const html25_26 = await fetchPath('Daily Report/PSP Report/2025-2026');
  if (html25_26) {
    fs.writeFileSync('scratch/posoco_2025_2026_index.html', html25_26);
    const folders = parseFolders(html25_26);
    console.log("Found links in 2025-2026 index page:");
    for (const f of folders) {
      console.log(`  - ${f}`);
    }
  }

  // Let's also check if there is a 2026-2027 folder
  const html26_27 = await fetchPath('Daily Report/PSP Report/2026-2027');
  if (html26_27) {
    console.log("Folder 2026-2027 exists!");
    fs.writeFileSync('scratch/posoco_2026_2027_index.html', html26_27);
    const folders = parseFolders(html26_27);
    console.log("Found links in 2026-2027 index page:");
    for (const f of folders) {
      console.log(`  - ${f}`);
    }
  } else {
    console.log("Folder 2026-2027 does not exist or returned non-200.");
  }
}

run();
