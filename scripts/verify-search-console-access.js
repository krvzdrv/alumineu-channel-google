#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Verify Search Console API access.
 *   npm run gsc:verify
 */
const path = require('path');
const { createSearchConsoleClient } = require('./lib/search-console-client');

const ROOT = path.join(__dirname, '..');

async function main() {
  const client = await createSearchConsoleClient(ROOT);
  console.log('[GGL] Search Console verify');
  console.log('[GGL] Token:', path.basename(client.tokenPath));
  console.log('[GGL] Default site:', client.defaultSiteUrl);

  const sites = await client.listSites();
  console.log(`\n[GGL] Properties (${sites.length}):`);
  for (const s of sites) {
    const url = s.siteUrl || '?';
    const perm = s.permissionLevel || '?';
    const mark = url === client.defaultSiteUrl ? ' ← default' : '';
    console.log(`  - ${url} (${perm})${mark}`);
  }

  if (!sites.some((s) => s.siteUrl === client.defaultSiteUrl)) {
    console.log(
      `\n[GGL] WARN: ${client.defaultSiteUrl} не в списке. Проверьте GSC_SITE_URL или верификацию в UI.`
    );
  } else {
    console.log('\n[GGL] OK — доступ к свойству есть.');
  }
}

main().catch((e) => {
  const msg = e?.response?.data?.error?.message || e.message || String(e);
  console.error('[GGL] FAIL:', msg);
  if (msg.includes('has not been used') || msg.includes('disabled')) {
    console.error('[GGL] Включите Search Console API в GCP oceanic-craft-452806-c0');
  }
  process.exit(1);
});
