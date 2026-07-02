#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Migrate primary feed contentLanguage ru → pl.
 *
 * contentLanguage on an existing Google Sheets data source is immutable via API.
 * This script:
 *   1. Sets account languageCode to pl-PL (if not already)
 *   2. Prints MC UI steps to add a new primary feed with contentLanguage=pl
 *   3. Optionally deletes the old ru feed after you connected the new one
 *
 * Usage:
 *   npm run merchant:api:migrate-feed-lang
 *   npm run merchant:api:migrate-feed-lang -- --apply --delete-old-id=10664644623
 */

const path = require('path');
const { createMerchantClient, parseCliFlags } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

function text(v) {
  return String(v == null ? '' : v).trim();
}

function parseMigrateArgs(argv) {
  const flags = parseCliFlags(argv);
  flags.deleteOldId = text(process.env.MERCHANT_OLD_DATA_SOURCE_ID);
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--delete-old-id=')) flags.deleteOldId = argv[i].slice(16).trim();
  }
  return flags;
}

async function main() {
  const flags = parseMigrateArgs(process.argv);
  const { merchantId, merchantFetch, listAllPages } = await createMerchantClient(ROOT);
  const base = `/accounts/v1/accounts/${merchantId}`;

  const account = await merchantFetch(`${base}`);
  if (account.languageCode !== 'pl-PL') {
    if (flags.apply) {
      await merchantFetch(`${base}?updateMask=languageCode`, {
        method: 'PATCH',
        body: JSON.stringify({ name: base, languageCode: 'pl-PL' })
      });
      console.log('[GGL] account.languageCode → pl-PL');
    } else {
      console.log('[GGL] DRY RUN: would set account.languageCode → pl-PL');
    }
  } else {
    console.log('[GGL] account.languageCode already pl-PL');
  }

  const sources = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '100' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/datasources/v1/accounts/${merchantId}/dataSources?${q}`);
  });

  console.log('\n[GGL] Current data sources:');
  for (const ds of sources) {
    const id = (ds.name || '').split('/').pop();
    const p = ds.primaryProductDataSource || {};
    console.log(
      `  id=${id}\t${ds.displayName || '(no name)'}\tlang=${p.contentLanguage || '?'}\tfeedLabel=${p.feedLabel || '?'}`
    );
  }

  const ruSheets = sources.filter(
    (ds) =>
      ds.primaryProductDataSource &&
      ds.primaryProductDataSource.contentLanguage === 'ru' &&
      ds.fileInput &&
      ds.fileInput.fileInputType === 'GOOGLE_SHEETS'
  );
  const plSheets = sources.filter(
    (ds) => ds.primaryProductDataSource && ds.primaryProductDataSource.contentLanguage === 'pl'
  );

  if (plSheets.length) {
    console.log('\n[GGL] Primary feed with contentLanguage=pl already exists — migration UI step done.');
  } else {
    console.log('\n[GGL] MC UI — создать новый primary feed (contentLanguage=pl):');
    console.log('  1. Merchant Center → Products → Feeds → Add primary feed');
    console.log('  2. Input: Google Sheets → та же таблица и лист «Alumineu Merchant — PL» (gid=2043783323)');
    console.log('  3. Target country: Poland | feedLabel: PL | content language: pl (Polish)');
    console.log('  4. После первой успешной загрузки удалите старый ru-фид:');
    for (const ds of ruSheets) {
      const id = (ds.name || '').split('/').pop();
      console.log(`     npm run merchant:api:delete-source -- --apply --id=${id}`);
    }
    console.log('  5. npm run merchant:sheet:apply && «Обновить» в MC');
  }

  if (flags.deleteOldId) {
    if (!flags.apply) {
      console.log(`\n[GGL] DRY RUN: would DELETE data source ${flags.deleteOldId}`);
      return;
    }
    const name = `accounts/${merchantId}/dataSources/${flags.deleteOldId}`;
    await merchantFetch(`/datasources/v1/${name}`, { method: 'DELETE' });
    console.log(`\n[GGL] Deleted old data source ${flags.deleteOldId}. Wait 15–60 min, then merchant:api:list-products`);
  }
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
