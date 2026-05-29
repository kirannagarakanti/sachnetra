import { fetchNSEAnnouncements, warmUpNSE } from '../scripts/_nse-announcements-source.mjs';
import { loadEnvFile, sleep } from '../scripts/_seed-utils.mjs';

loadEnvFile(import.meta.url);

const auditorRegex = /auditor/i;
const pledgeRegex = /pledg|encumbr/i;

const subTags = {
  auditor_resignation: /resign|vacated|discontinu/i,
  auditor_change: /appoint|change|reappoint/i,
  pledge_increase: /pledge|encumbr|margin call|invok/i,
  pledge_release: /revoke|release|discharge/i
};

function classify(category, subject) {
  const text = `${category || ''} ${subject || ''}`;
  let bucket = null;
  let subTag = null;

  if (auditorRegex.test(text)) {
    bucket = 'auditor';
    if (subTags.auditor_resignation.test(text)) {
      subTag = 'auditor_resignation';
    } else if (subTags.auditor_change.test(text)) {
      subTag = 'auditor_change';
    }
  } else if (pledgeRegex.test(text)) {
    bucket = 'promoter_pledge';
    if (subTags.pledge_release.test(text)) {
      subTag = 'pledge_release';
    } else if (subTags.pledge_increase.test(text)) {
      subTag = 'pledge_increase';
    }
  }
  return { bucket, subTag };
}

async function scanWindow(fromDate, toDate, cookie) {
  try {
    console.log(`Fetching from ${fromDate} to ${toDate}...`);
    const rows = await fetchNSEAnnouncements({ fromDate, toDate, cookie });
    let total = rows.length;
    let govCount = 0;
    const classifiedList = [];

    for (const r of rows) {
      const { bucket, subTag } = classify(r.category, r.subject);
      if (bucket) {
        govCount++;
        classifiedList.push({
          symbol: r.symbol,
          category: r.category,
          subject: r.subject,
          bucket,
          subTag,
          announced_at: r.announced_at
        });
      }
    }
    console.log(`  Total: ${total} filings. Governance: ${govCount} (${((govCount/total)*100).toFixed(1)}%)`);
    return { total, govCount, classifiedList };
  } catch (err) {
    console.error(`  Error scanning window:`, err.message);
    return null;
  }
}

async function main() {
  const cookie = await warmUpNSE();

  // Let's scan a few windows:
  // Window A: Nov 1 to Nov 15, 2025 (15 days)
  const winA = await scanWindow('01-11-2025', '15-11-2025', cookie);
  await sleep(2000);

  // Window B: May 1 to May 15, 2025 (15 days)
  const winB = await scanWindow('01-05-2025', '15-05-2025', cookie);
  await sleep(2000);

  // Window C: May 1 to May 15, 2024 (15 days)
  const winC = await scanWindow('01-05-2024', '15-05-2024', cookie);
  await sleep(2000);

  // Analyze all found governance events
  const allGov = [
    ...(winA?.classifiedList || []),
    ...(winB?.classifiedList || []),
    ...(winC?.classifiedList || [])
  ];

  console.log(`\n=== Overall Governance Stats (Total ${allGov.length} events) ===`);
  const counts = {};
  for (const item of allGov) {
    const key = `${item.bucket} / ${item.subTag || 'unclassified'}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  console.log(JSON.stringify(counts, null, 2));

  console.log(`\nSamples of primary shocks:`);
  const shocks = allGov.filter(item => item.subTag === 'auditor_resignation' || item.subTag === 'pledge_increase');
  shocks.slice(0, 10).forEach(s => {
    console.log(`- [${s.announced_at}] ${s.symbol}: [${s.subTag}] Cat: "${s.category}" | Subj: "${s.subject.slice(0, 100)}"`);
  });
}

main().catch(err => console.error(err));
