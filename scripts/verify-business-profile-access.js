#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Verify Google Business Profile API access.
 */
const path = require('path');
const {
  GCP_PROJECT_ID,
  pickTokenPath,
  getAccessToken,
  listAccounts,
  listLocations,
  fetchProfileViews28d,
  resolveLocation,
} = require('./lib/business-profile-client');

const ROOT = path.join(__dirname, '..');

async function main() {
  console.log('[GGL] GBP API verify');
  console.log('[GGL] GCP project:', GCP_PROJECT_ID);
  console.log('[GGL] Token:', pickTokenPath(ROOT) || '(missing)');

  const accessToken = await getAccessToken(ROOT);
  const accounts = await listAccounts(accessToken);
  console.log(`\n[GGL] Accounts (${accounts.length}):`);
  for (const a of accounts) {
    console.log(`  - ${a.name} · ${a.accountName || a.type || ''}`);
  }

  const { account, location } = await resolveLocation(accessToken, ROOT);
  console.log(`\n[GGL] Location: ${location.name}`);
  console.log(`[GGL] Title: ${location.title}`);

  const views = await fetchProfileViews28d(accessToken, location.name, 28);
  console.log(`\n[GGL] Profile views (28d, impressions sum): ${views.profile_views}`);
  console.log('[GGL] By metric:', views.by_metric);
  console.log('[GGL] Period:', views.period.start, '→', views.period.end);
  console.log('\n[GGL] OK — GBP Performance API connected.');
}

main().catch((e) => {
  console.error('[GGL] FAIL:', e.message);
  if (/403|API has not been used|disabled/.test(e.message)) {
    console.error('[GGL] Включите в GCP: My Business Account Management, Business Information, Business Profile Performance API');
  }
  if (/redirect_uri_mismatch/.test(e.message)) {
    console.error('[GGL] Добавьте http://localhost:3001/oauth2callback в OAuth client redirect URIs');
  }
  process.exit(1);
});
