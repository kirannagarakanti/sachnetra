#!/usr/bin/env node
/**
 * V2-030 — wires the daily Railway cron for the bulk/block deals freshness alarm
 * (`scripts/check-deals-freshness.mjs`) at 13:30 UTC / 19:00 IST.
 *
 * Sets `cronSchedule = "30 13 * * *"` on the `check-deals-freshness` Railway
 * service instance. Runs ~30 min after the collector cron so today's EOD deals
 * have time to land before the alarm fires. Alert on non-zero exit (Railway
 * notification / webhook).
 *
 * Usage:
 *   node scripts/railway-set-deals-freshness-cron.mjs            # dry run (default)
 *   node scripts/railway-set-deals-freshness-cron.mjs --apply    # actually set the schedule
 *
 * Requires: RAILWAY_TOKEN env var or ~/.railway/config.json
 *
 * Prerequisite: create a Railway cron service named `check-deals-freshness` with
 * start command `node scripts/check-deals-freshness.mjs` and prod DATABASE_URL.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const APPLY = process.argv.includes('--apply');

const PROJECT_ID = '29419572-0b0d-437f-8e71-4fa68daf514f';
const ENV_ID = '91a05726-0b83-4d44-a33e-6aec94e58780';
const API = 'https://backboard.railway.app/graphql/v2';

const SERVICE_NAME = 'check-deals-freshness';
const CRON_SCHEDULE = '30 13 * * *'; // 13:30 UTC daily (19:00 IST — after collector)

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
      ` (start command: \`node scripts/check-deals-freshness.mjs\`), then re-run this.`,
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
  console.log(`Desired:  ${CRON_SCHEDULE}  (13:30 UTC / 19:00 IST daily)`);

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

  console.log('\nUpdated! Cron schedule set to 13:30 UTC daily (19:00 IST).');
}

main().catch(e => { console.error(e); process.exit(1); });
