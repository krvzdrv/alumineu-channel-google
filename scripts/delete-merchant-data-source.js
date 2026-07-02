#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Delete a Merchant Center data source (and its primary-feed products).
 * Usage:
 *   npm run merchant:api:delete-source -- --dry-run --id=DATASOURCE_ID
 *   npm run merchant:api:delete-source -- --apply --id=DATASOURCE_ID
 */

const path = require('path');
const { createMerchantClient, parseCliFlags } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

async function main() {
  const flags = parseCliFlags(process.argv);
  if (!flags.id) {
    console.error('[GGL] Укажите --id=DATASOURCE_ID (см. merchant:api:list-sources)');
    process.exit(1);
  }

  const { merchantId, merchantFetch } = await createMerchantClient(ROOT);
  const name = `accounts/${merchantId}/dataSources/${flags.id}`;

  let ds = null;
  try {
    ds = await merchantFetch(`/datasources/v1/${name}`);
  } catch (e) {
    console.error('[GGL] Источник не найден или нет доступа:', name);
    throw e;
  }

  console.log('[GGL] Target data source:');
  console.log(`  id: ${flags.id}`);
  console.log(`  displayName: ${ds.displayName || '(none)'}`);
  console.log(`  name: ${ds.name}`);
  if (ds.primaryProductDataSource) {
    console.log(`  primary feedLabel: ${ds.primaryProductDataSource.feedLabel || '?'}`);
  }

  if (flags.dryRun && !flags.apply) {
    console.log('\n[GGL] DRY RUN — удаление не выполнено. Для удаления: --apply --id=' + flags.id);
    return;
  }

  await merchantFetch(`/datasources/v1/${name}`, { method: 'DELETE' });
  console.log('\n[GGL] DELETE OK. Подождите 15–60 мин, затем merchant:api:list-products');
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
