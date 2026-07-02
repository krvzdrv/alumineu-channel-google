#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Delete archived processed products from primary data source so Sheets feed can re-ingest them.
 *
 * Usage:
 *   npm run merchant:api:reactivate-archived
 *   npm run merchant:api:reactivate-archived -- --apply
 *   npm run merchant:api:reactivate-archived -- --apply --all
 */

const path = require('path');
const {
  createMerchantClient,
  parseCliFlags,
  productInputDeletePath
} = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

function text(v) {
  return String(v == null ? '' : v).trim();
}

async function resolveDataSourceId(merchantFetch, merchantId, flags) {
  if (flags.id) return flags.id;
  const envId = text(process.env.MERCHANT_PRIMARY_DATA_SOURCE_ID);
  if (envId) return envId;
  const page = await merchantFetch(`/datasources/v1/accounts/${merchantId}/dataSources?pageSize=50`);
  const sources = page.dataSources || [];
  const primary = sources.filter((s) => s.primaryProductDataSource);
  if (primary.length === 1) return String(primary[0].dataSourceId || primary[0].name.split('/').pop());
  throw new Error('Укажите --id=DATASOURCE_ID или MERCHANT_PRIMARY_DATA_SOURCE_ID');
}

async function main() {
  const flags = parseCliFlags(process.argv);
  const deleteAll = process.argv.includes('--all');
  const { merchantId, merchantFetch, listAllPages } = await createMerchantClient(ROOT);
  const dataSourceId = await resolveDataSourceId(merchantFetch, merchantId, flags);

  const products = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '250' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/products/v1/accounts/${merchantId}/products?${q}`);
  });

  const archived = products.filter((p) => p.archived);
  let targets = deleteAll ? [...products] : [...archived];
  if (flags.limit > 0) targets = targets.slice(0, flags.limit);

  console.log(`[GGL] Merchant ${merchantId}: ${archived.length} archived / ${products.length} total`);
  console.log(`[GGL] Data source: ${dataSourceId}`);
  console.log(`[GGL] Delete targets: ${targets.length}${deleteAll ? ' (--all: full catalog reset)' : ' (archived only)'}`);

  for (const p of targets.slice(0, 20)) {
    console.log(`  - ${p.archived ? 'arch' : 'act'}\t${p.offerId}\t${p.productAttributes?.title || '?'}`);
  }
  if (targets.length > 20) console.log(`  … +${targets.length - 20} more`);

  if (!targets.length) {
    console.log('[GGL] Nothing to delete.');
    return;
  }

  if (flags.dryRun && !flags.apply) {
    console.log('\n[GGL] DRY RUN — productInputs not deleted. Use --apply');
    console.log('[GGL] Then: npm run merchant:sheet:apply and refresh feed in MC UI.');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const p of targets) {
    const lang = p.contentLanguage || 'ru';
    const feedLabel = p.feedLabel || 'PL';
    const url = productInputDeletePath(merchantId, lang, feedLabel, p.offerId, dataSourceId);
    try {
      await merchantFetch(url, { method: 'DELETE' });
      ok += 1;
    } catch (e) {
      fail += 1;
      console.warn(`[GGL] FAIL delete ${p.offerId}:`, (e.message || e).slice(0, 160));
    }
  }

  console.log(`\n[GGL] Deleted productInputs: ${ok} ok, ${fail} fail`);
  console.log('[GGL] Next: npm run merchant:sheet:apply → MC → Update on PRODUCTS SOURCE 1');
  console.log('[GGL] Wait 15–60 min, then: npm run merchant:api:list-products');
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
