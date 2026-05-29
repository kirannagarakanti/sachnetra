import { fetchNSEAnnouncements, warmUpNSE } from '../scripts/_nse-announcements-source.mjs';
import { loadEnvFile, sleep } from '../scripts/_seed-utils.mjs';

loadEnvFile(import.meta.url);

async function testDate(fromDate, toDate, cookie) {
  try {
    console.log(`Querying NSE announcements from ${fromDate} to ${toDate}...`);
    const rows = await fetchNSEAnnouncements({ fromDate, toDate, cookie });
    console.log(`  Success! Got ${rows.length} rows.`);
    if (rows.length > 0) {
      console.log(`  First row sample:`, JSON.stringify(rows[0], null, 2));
      console.log(`  Last row sample:`, JSON.stringify(rows[rows.length - 1], null, 2));
      const categories = [...new Set(rows.map(r => r.category))];
      console.log(`  Unique categories found (${categories.length}):`, categories.slice(0, 10));
    }
    return rows;
  } catch (err) {
    console.error(`  Failed:`, err.message);
    return null;
  }
}

async function main() {
  console.log("Warming up NSE...");
  const cookie = await warmUpNSE();
  console.log("Cookie warmed up.");

  // Test 1: Recent window (e.g., 2026-05-01 to 2026-05-07)
  await testDate('01-05-2026', '07-05-2026', cookie);
  await sleep(2000);

  // Test 2: 6 months ago (e.g., 2025-11-01 to 2025-11-07)
  await testDate('01-11-2025', '07-11-2025', cookie);
  await sleep(2000);

  // Test 3: 1 year ago (e.g., 2025-05-01 to 2025-05-07)
  await testDate('01-05-2025', '07-05-2025', cookie);
  await sleep(2000);

  // Test 4: 2 years ago (e.g., 2024-05-01 to 2024-05-07)
  await testDate('01-05-2024', '07-05-2024', cookie);
  await sleep(2000);

  // Test 5: 3 years ago (e.g., 2023-05-01 to 2023-05-07)
  await testDate('01-05-2023', '07-05-2023', cookie);
  console.log("Done.");
}

main().catch(err => {
  console.error("Main error:", err);
});
