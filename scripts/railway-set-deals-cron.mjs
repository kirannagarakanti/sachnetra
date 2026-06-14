#!/usr/bin/env node
/**
 * V2-030 — wires the daily Railway cron for the bulk/block deals collector
 * (`scripts/seed-india-deals.mjs`) at 13:00 UTC / 18:30 IST.
 *
 * Sets `cronSchedule = "0 13 * * *"` on the `seed-india-deals` Railway service
 * instance via the same GraphQL control-plane API that
 * `railway-set-fastag-cron.mjs` uses. Cron ONLY — does not touch watch patterns
 * or any data.
 *
 * Usage:
 *   node scripts/railway-set-deals-cron.mjs            # dry run (default)
 *   node scripts/railway-set-deals-cron.mjs --apply    # actually set the schedule
 *
 * Requires: RAILWAY_TOKEN env var or ~/.railway/config.json
 *
 * Why 13:00 UTC: NSE bulk/block disclosures publish EOD after market close (V2-030
 * Decision 2). The seed walks a 2-day IST window; once-daily is sufficient.
 *
 * Prerequisite: create a Railway cron service named `seed-india-deals` with start
 * command `node scripts/seed-india-deals.mjs` and prod env vars (DATABASE_URL,
 * UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN).
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const APPLY = process.argv.includes('--apply');

const PROJECT_ID = '29419572-0b0d-437f-8e71-4fa68daf514f';
const ENV_ID = '91a05726-0b83-4d44-a33e-6aec94e58780';
const API = 'https://backboard.railway.app/graphql/v2';

const SERVICE_NAME = 'seed-india-deals';
const CRON_SCHEDULE = '0 13 * * *'; // 13:00 UTC daily (18:30 IST, V2-030 Decision 2)

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
    console.error(
      `Service "${SERVICE_NAME}" not found in project. Create the service first` +
      ` (start command: \`node scripts/seed-india-deals.mjs\`), then re-run this.`,
    );
    process.exit(1);
  }

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
  console.log(`Desired:  ${CRON_SCHEDULE}  (13:00 UTC / 18:30 IST daily)`);

  if (current === CRON_SCHEDULE) {
    console.log('\nAlready set correctly — nothing to do.');
    return;
  }

  if (!APPLY) {
    console.log('\n[DRY RUN] No change made. Re-run with --apply to set the schedule.');
    return;
  }

  await gql(token, `
    mutation ($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }
  `, {
    serviceId: svc.id,
    environmentId: ENV_ID,
    input: { cronSchedule: CRON_SCHEDULE },
  });

  console.log('\nUpdated! Cron schedule set to 13:00 UTC daily (18:30 IST).');
}

main().catch(e => { console.error(e); process.exit(1); });
