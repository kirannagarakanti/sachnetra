#!/usr/bin/env node

import { loadSharedConfig } from './_seed-utils.mjs';

const taxonomy = loadSharedConfig('market-taxonomy.json');

const marketRegex = new RegExp(
  `\\b(${taxonomy.market_keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

export function isMarketMoving(title) {
  return marketRegex.test(title);
}

export function extractCompanies(title) {
  const found = [];
  for (const entry of taxonomy.nifty50_registry) {
    for (const alias of entry.aliases) {
      const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(title)) {
        found.push({ name: entry.aliases[0], ticker: entry.ticker });
        break;
      }
    }
  }
  return found;
}

export function extractSectors(title) {
  const found = [];
  for (const [sector, keywords] of Object.entries(taxonomy.sectors)) {
    const re = new RegExp(
      `\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    if (re.test(title)) found.push(sector);
  }
  return found;
}

export function detectEventType(title) {
  for (const [type, keywords] of Object.entries(taxonomy.event_types)) {
    const re = new RegExp(
      `\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    if (re.test(title)) return type;
  }
  return 'other';
}

export function extractThemes(title) {
  const found = [];
  for (const [themeId, theme] of Object.entries(taxonomy.themes)) {
    const re = new RegExp(
      `\\b(${theme.keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    if (re.test(title)) found.push(themeId);
  }
  return found;
}

export function detectRelevanceClassFromTitle(title, sectors, companies) {
  const systemicRegex = new RegExp(
    `\\b(${taxonomy.systemic_keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'i'
  );
  if (systemicRegex.test(title)) return 'systemic';
  if (sectors.length > 0 && companies.length > 0) return 'sector';
  if (companies.length > 0) return 'idiosyncratic';
  return 'systemic';
}
