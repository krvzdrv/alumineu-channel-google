#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Audit Manufacturer Center via API: products count + issues (diagnostics proxy).
 *
 *   MANUFACTURER_ACCOUNT_ID=123456789 npm run manufacturer:audit
 *
 * API does NOT expose: MC link status, Feeds page, brand approval date — UI only.
 */
const path = require('path');
const {
  GCP_PROJECT_ID,
  pickAccountId,
  getAccessToken,
  listAllProducts,
} = require('./lib/manufacturer-api-client');

const ROOT = path.join(__dirname, '..');
const LINKED_MC_ID = '5785188396';

function severityRank(sev) {
  const s = String(sev || '').toUpperCase();
  if (s.includes('CRITICAL') || s === 'ERROR') return 3;
  if (s.includes('WARNING')) return 2;
  return 1;
}

function summarizeIssues(products) {
  const byCode = new Map();
  let withIssues = 0;
  for (const p of products) {
    const issues = p.issues || [];
    if (issues.length) withIssues += 1;
    for (const issue of issues) {
      const key = issue.code || issue.title || issue.description || 'unknown';
      const prev = byCode.get(key) || { count: 0, severity: issue.severity || '', sample: issue.description || '' };
      prev.count += 1;
      if (severityRank(issue.severity) > severityRank(prev.severity)) {
        prev.severity = issue.severity || prev.severity;
        prev.sample = issue.description || prev.sample;
      }
      byCode.set(key, prev);
    }
  }
  return { withIssues, byCode };
}

async function main() {
  console.log('[GGL] Manufacturer Center audit');
  console.log('[GGL] GCP project:', GCP_PROJECT_ID);
  console.log('[GGL] Linked MC (UI):', LINKED_MC_ID);

  const accountId = pickAccountId(ROOT);
  const { accessToken, authMode, tokenPath, keyFile } = await getAccessToken(ROOT);
  console.log('[GGL] Auth:', authMode, tokenPath || keyFile || '');

  const products = await listAllProducts(accessToken, accountId);
  const brands = new Map();
  for (const p of products) {
    const b = p.attributes?.brand || '(empty)';
    brands.set(b, (brands.get(b) || 0) + 1);
  }

  const { withIssues, byCode } = summarizeIssues(products);
  const issueRows = [...byCode.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15);

  console.log('\n[GGL] === Products (API) ===');
  console.log('Manufacturer account:', accountId);
  console.log('Product count:', products.length);
  console.log('Brands in catalog:', Object.fromEntries(brands));
  console.log('Products with issues:', withIssues);

  if (products.length === 0) {
    console.log('\n[GGL] ⚠ Products = 0');
    console.log('  • MC sync может идти до 24–48 ч после brand approve');
    console.log('  • Проверьте UI: Account linking Active → MC', LINKED_MC_ID);
    console.log('  • Альтернатива: npm run manufacturer:export-pilot → upload TSV');
  } else {
    const sample = products.slice(0, 3).map((p) => ({
      productId: p.productId,
      brand: p.attributes?.brand,
      title: p.attributes?.title?.slice?.(0, 60),
      issues: (p.issues || []).length,
    }));
    console.log('Sample:', JSON.stringify(sample, null, 2));
  }

  console.log('\n[GGL] === Diagnostics proxy (product issues) ===');
  if (!issueRows.length) {
    console.log('No product issues returned by API.');
  } else {
    for (const [code, info] of issueRows) {
      console.log(`- ${code}: ${info.count}x [${info.severity}] ${info.sample}`.slice(0, 140));
    }
  }

  console.log('\n[GGL] === Not available via API ===');
  console.log('- Feeds (auto-feed from MC): check Manufacturer UI → Feeds');
  console.log('- Brand approval date: check Manufacturer UI → Brands');
  console.log('- MC link status: check UI → Account linking (Active?)');

  console.log('\n[GGL] === MC PL cross-check ===');
  try {
    process.env.GOOGLE_MERCHANT_ID = LINKED_MC_ID;
    const { createMerchantClient } = require('./lib/merchant-api-client');
    const { merchantFetch } = await createMerchantClient(ROOT);
    const r = await merchantFetch('/products/v1/accounts/5785188396/products?pageSize=1');
    console.log('MC PL products (API sample page):', (r.products || []).length ? 'accessible' : 'empty page');
    console.log('MC PL total hint: run merchant:api:list-products (137 expected)');
  } catch (e) {
    console.log('MC cross-check skipped:', e.message.slice(0, 120));
  }
}

main().catch((e) => {
  console.error('[GGL] FAIL:', e.message);
  process.exit(1);
});
