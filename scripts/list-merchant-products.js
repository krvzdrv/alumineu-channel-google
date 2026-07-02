#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] List processed products + issue summary.
 * Usage: npm run merchant:api:list-products [-- --limit=50]
 */

const path = require('path');
const { createMerchantClient, parseCliFlags } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

function issueKey(issue) {
  return `${issue.code || '?'}|${issue.severity || '?'}`;
}

async function main() {
  const flags = parseCliFlags(process.argv);
  const { merchantId, merchantFetch, listAllPages } = await createMerchantClient(ROOT);
  const parent = `accounts/${merchantId}`;

  let products = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '250' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/products/v1/${parent}/products?${q}`);
  });

  if (flags.limit > 0) products = products.slice(0, flags.limit);

  const bySource = {};
  const issueCounts = {};
  let disapproved = 0;

  for (const p of products) {
    const src = p.dataSource || '(unknown)';
    bySource[src] = (bySource[src] || 0) + 1;
    const issues = (p.productStatus && p.productStatus.itemLevelIssues) || [];
    for (const issue of issues) {
      const k = issueKey(issue);
      issueCounts[k] = (issueCounts[k] || 0) + 1;
      if (issue.severity === 'DISAPPROVED') disapproved += 1;
    }
  }

  console.log(`[GGL] Merchant ${merchantId}: ${products.length} product(s) listed`);
  console.log(`[GGL] Issue rows with DISAPPROVED severity: ${disapproved}\n`);

  console.log('[GGL] By dataSource:');
  for (const [src, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${src}`);
  }

  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  if (topIssues.length) {
    console.log('\n[GGL] Top issues (code|severity → count):');
    for (const [k, n] of topIssues) console.log(`  ${n}\t${k}`);
  }

  if (products.length && products.length <= 30) {
    console.log('\n[GGL] Products:');
    for (const p of products) {
      const issues = ((p.productStatus && p.productStatus.itemLevelIssues) || [])
        .map((i) => `${i.code}:${i.severity}`)
        .join('; ');
      console.log(
        `  ${p.offerId || '?'}\tsrc=${p.dataSource || '?'}\tissues=${issues || 'none'}`
      );
    }
  } else if (products.length) {
    console.log('\n[GGL] First 10 products:');
    for (const p of products.slice(0, 10)) {
      const issues = ((p.productStatus && p.productStatus.itemLevelIssues) || [])
        .slice(0, 2)
        .map((i) => i.code)
        .join(', ');
      console.log(`  ${p.offerId || '?'}\t${issues || 'ok'}`);
    }
  }
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
