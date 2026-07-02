#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Top search queries from Search Console.
 *   npm run gsc:queries
 *   npm run gsc:queries -- --days=28 --limit=50
 *   npm run gsc:queries -- --site=sc-domain:alumineu.pl --out=data/gsc_queries_pl.json
 */
const fs = require('fs');
const path = require('path');
const { createSearchConsoleClient } = require('./lib/search-console-client');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const flags = { days: 28, limit: 30, site: '', out: '' };
  for (const arg of argv) {
    if (arg.startsWith('--days=')) flags.days = Number(arg.split('=')[1]) || 28;
    if (arg.startsWith('--limit=')) flags.limit = Number(arg.split('=')[1]) || 30;
    if (arg.startsWith('--site=')) flags.site = arg.split('=').slice(1).join('=').trim();
    if (arg.startsWith('--out=')) flags.out = arg.split('=').slice(1).join('=').trim();
  }
  return flags;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function dateRange(days) {
  const end = new Date();
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: isoDate(start), end: isoDate(end) };
}

function pct(n) {
  return `${(Number(n) * 100).toFixed(1)}%`;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const client = await createSearchConsoleClient(ROOT);
  const siteUrl = flags.site || client.defaultSiteUrl;
  const { start, end } = dateRange(flags.days);

  console.log('[GGL] Search Console queries');
  console.log('[GGL] Site:', siteUrl);
  console.log('[GGL] Period:', start, '→', end);

  const data = await client.querySearchAnalytics(siteUrl, {
    startDate: start,
    endDate: end,
    dimensions: ['query'],
    rowLimit: Math.min(flags.limit, 25000),
    dataState: 'final',
  });

  const rows = data.rows || [];
  console.log(`\n[GGL] Rows: ${rows.length}`);
  console.log('query | clicks | impressions | ctr | position');
  console.log('-'.repeat(72));

  const sorted = [...rows].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  for (const row of sorted.slice(0, flags.limit)) {
    const q = row.keys?.[0] || '?';
    console.log(
      `${q} | ${row.clicks || 0} | ${row.impressions || 0} | ${pct(row.ctr || 0)} | ${(row.position || 0).toFixed(1)}`
    );
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    siteUrl,
    startDate: start,
    endDate: end,
    rowCount: rows.length,
    rows: sorted.map((row) => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })),
  };

  const outPath = flags.out
    ? path.resolve(ROOT, flags.out)
    : path.join(ROOT, 'data', `gsc_queries_${start}_${end}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`\n[GGL] Saved: ${outPath}`);
}

main().catch((e) => {
  const msg = e?.response?.data?.error?.message || e.message || String(e);
  console.error('[GGL] FAIL:', msg);
  if (msg.includes('not a valid Search Console site')) {
    console.error('[GGL] Укажите --site=sc-domain:alumineu.pl или https://alumineu.pl/');
  }
  process.exit(1);
});
