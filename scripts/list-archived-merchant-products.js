#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] List archived processed products + optional CSV export.
 * Archived flag is output-only in Merchant API — restore only in MC UI (Archive folder).
 *
 * Usage:
 *   npm run merchant:api:list-archived
 *   npm run merchant:api:list-archived -- --csv=feeds/archived-products.csv
 */

const fs = require('fs');
const path = require('path');
const { createMerchantClient, parseCliFlags } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

function text(v) {
  return String(v == null ? '' : v).trim();
}

function parseCsvFlag(argv) {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--csv=')) return argv[i].slice(6).trim();
  }
  return '';
}

function csvEscape(v) {
  const s = text(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const flags = parseCliFlags(process.argv);
  const csvOut = parseCsvFlag(process.argv);
  const { merchantId, merchantFetch, listAllPages } = await createMerchantClient(ROOT);

  const products = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '250' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/products/v1/accounts/${merchantId}/products?${q}`);
  });

  const archived = products.filter((p) => p.archived);
  const active = products.length - archived.length;

  console.log(`[GGL] Merchant ${merchantId}: ${active} active, ${archived.length} archived (${products.length} total)`);
  console.log(
    '[GGL] Restore: MC → Products → Archive → select all → Restore (API cannot unarchive; archived is output-only)'
  );

  if (!archived.length) return;

  const rows = archived.map((p) => ({
    offerId: p.offerId,
    title: text(p.productAttributes?.title),
    link: text(p.productAttributes?.link),
    color: text(p.productAttributes?.color),
    size: text(p.productAttributes?.size),
    group: text(p.productAttributes?.itemGroupId),
    price: p.productAttributes?.price
      ? `${Number(p.productAttributes.price.amountMicros) / 1e6} ${p.productAttributes.price.currencyCode}`
      : ''
  }));

  rows.sort((a, b) => a.title.localeCompare(b.title, 'pl'));

  console.log('\n[GGL] Archived products:');
  for (const r of rows.slice(0, flags.limit > 0 ? flags.limit : rows.length)) {
    console.log(`  ${r.offerId}\t${r.title}\t${r.color || '-'}\t${r.size || '-'}`);
  }
  if (flags.limit > 0 && rows.length > flags.limit) {
    console.log(`  … +${rows.length - flags.limit} more (omit --limit)`);
  }

  if (csvOut) {
    const outPath = path.resolve(ROOT, csvOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const header = ['offerId', 'title', 'link', 'color', 'size', 'item_group_id', 'price'];
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [r.offerId, r.title, r.link, r.color, r.size, r.group, r.price].map(csvEscape).join(',')
      )
    ];
    fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
    console.log(`\n[GGL] Wrote ${rows.length} row(s) → ${outPath}`);
  }
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
