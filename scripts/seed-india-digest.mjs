#!/usr/bin/env node

import { loadEnvFile, CHROME_UA, getRedisCredentials } from './_seed-utils.mjs';

loadEnvFile(import.meta.url);

const apiBase = process.env.API_BASE_URL || 'https://api.worldmonitor.app';
const DIGEST_KEY = 'news:digest:v1:india:en';
const DIGEST_TTL = 600;

async function warmIndiaDigest() {
  const t0 = Date.now();
  try {
    const resp = await fetch(`${apiBase}/api/news/v1/list-feed-digest?variant=india&lang=en`, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(40_000),
    });
    const ms = Date.now() - t0;
    if (resp.ok) {
      console.log(`  India digest warm OK (${ms}ms) — ${ms > 5000 ? 'REBUILT' : 'CACHED'}`);
      const { url, token } = getRedisCredentials();
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EXPIRE', DIGEST_KEY, DIGEST_TTL]),
        signal: AbortSignal.timeout(5_000),
      }).catch(err => console.warn(`  EXPIRE failed (non-fatal): ${err.message}`));
    } else {
      console.warn(`  India digest warm failed: HTTP ${resp.status}`);
    }
  } catch (err) {
    console.warn(`  India digest warm failed: ${err.message}`);
  }
}

async function main() {
  console.log('=== India Digest Warmup ===');
  await warmIndiaDigest().catch(err => console.warn('Warm failed:', err.message));
  console.log('=== Done ===');
  process.exit(0);
}

main();
