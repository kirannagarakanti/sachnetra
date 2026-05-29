#!/usr/bin/env node
/**
 * V2-026 — wires the daily Railway cron for the electricity collector
 * (`scripts/seed-india-electricity.mjs`) at 05:30 UTC / 11:00 IST.
 *
 * Sets `cronSchedule = "30 5 * * *"` on the `seed-india-electricity` Railway
 * service instance via the same GraphQL control-plane API that
 * `railway-set-fastag-cron.mjs` uses. Cron ONLY — does not touch watch
 * patterns, the FASTag service, or any data.
 *
 * Usage:
 *   node scripts/railway-set-electricity-cron.mjs            # dry run (default) — prints current vs desired, no change
 *   node scripts/railway-set-electricity-cron.mjs --apply    # actually set the schedule
 *
 * Requires: RAILWAY_TOKEN env var or ~/.railway/config.json
 *
 * Why 05:30 UTC: Grid-India publishes day D's PSP report at 09:30–10:30 IST on
 * D+1 (V2-026 Decision 3); the 11:00 IST / 05:30 UTC run always catches it. The
 * seed picks target_date = today_IST − 1 day and upserts only that day.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const APPLY = process.argv.includes('--apply');

const PROJECT_ID = '29419572-0b0d-437f-8e71-4fa68daf514f';
const ENV_ID = '91a05726-0b83-4d44-a33e-6aec94e58780';
const API = 'https://backboard.railway.app/graphql/v2';

const SERVICE_NAME = 'seed-india-electricity';
const CRON_SCHEDULE = '30 5 * * *'; // 05:30 UTC daily (V2-026 Decision 3)

function getToken() {
  if (process.env.RAILWAY_TOKEN) return process.env.RAILWAY_TOKEN;
  const cfgPath = join(homedir(), '.railway', 'config.json');
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    return cfg.token || cfg.user?.token;
  }
  throw new Error('No Railway token found. Set RAILWAY_TOKEN or run `railway login`.');
}

async function gql(token, query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function main() {
  const token = getToken();

  // 1. Find the seed-india-electricity service.
  const { project } = await gql(token, `
    query ($id: String!) {
      project(id: $id) {
        services { edges { node { id name } } }
      }
    }
  `, { id: PROJECT_ID });

  const svc = project.services.edges
    .map(e => e.node)
    .find(s => s.name === SERVICE_NAME);

  if (!svc) {
    console.error(`Service "${SERVICE_NAME}" not found in project. Create the service first (start command: \`node scripts/seed-india-electricity.mjs\`), then re-run this.`);
    process.exit(1);
  }

  // 2. Read its current cron schedule.
  const { service } = await gql(token, `
    query ($id: String!) {
      service(id: $id) {
        serviceInstances(first: 1) {
          edges { node { cronSchedule } }
        }
      }
    }
  `, { id: svc.id });

  const current = service.serviceInstances.edges[0]?.node?.cronSchedule ?? null;

  console.log(`Service:  ${SERVICE_NAME} (${svc.id})`);
  console.log(`Current:  ${current ?? '(none)'}`);
  console.log(`Desired:  ${CRON_SCHEDULE}  (05:30 UTC daily)`);

  if (current === CRON_SCHEDULE) {
    console.log('\nAlready set correctly — nothing to do.');
    return;
  }

  if (!APPLY) {
    console.log('\n[DRY RUN] No change made. Re-run with --apply to set the schedule.');
    return;
  }

  // 3. Set the cron schedule.
  await gql(token, `
    mutation ($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }
  `, {
    serviceId: svc.id,
    environmentId: ENV_ID,
    input: { cronSchedule: CRON_SCHEDULE },
  });

  console.log('\nUpdated! Cron schedule set to 05:30 UTC daily.');
}

main().catch(e => { console.error(e); process.exit(1); });
