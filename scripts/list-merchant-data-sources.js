#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] List Merchant Center data sources.
 * Usage: npm run merchant:api:list-sources
 */

const path = require('path');
const { createMerchantClient } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

function describeSource(ds) {
  const parts = [];
  if (ds.primaryProductDataSource) parts.push('primary');
  if (ds.supplementalProductDataSource) parts.push('supplemental');
  if (ds.fileInput) parts.push(`file:${ds.fileInput.fileInputType || 'file'}`);
  if (ds.localInventoryDataSource) parts.push('localInventory');
  if (ds.promotionDataSource) parts.push('promotion');
  if (ds.displayName && /found by google|automatic/i.test(ds.displayName)) {
    parts.push('foundByGoogle?');
  }
  return parts.join(', ') || 'unknown';
}

async function main() {
  const { merchantId, merchantFetch, listAllPages } = await createMerchantClient(ROOT);
  const parent = `accounts/${merchantId}`;

  const dataSources = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '100' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/datasources/v1/${parent}/dataSources?${q}`);
  });

  console.log(`[GGL] Merchant ${merchantId}: ${dataSources.length} data source(s)\n`);
  for (const ds of dataSources) {
    const id = (ds.name || '').split('/').pop() || '?';
    console.log(`- id=${id}`);
    console.log(`  name: ${ds.displayName || '(no displayName)'}`);
    console.log(`  resource: ${ds.name || ''}`);
    console.log(`  type: ${describeSource(ds)}`);
    if (ds.primaryProductDataSource) {
      const p = ds.primaryProductDataSource;
      console.log(
        `  primary: feedLabel=${p.feedLabel || '?'} lang=${p.contentLanguage || '?'} countries=${(p.countries || []).join(',')}`
      );
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
