#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Full Search Console performance snapshot for alumineu.pl.
 *   npm run gsc:report
 *   npm run gsc:report -- --days=90
 */
const fs = require('fs');
const path = require('path');
const { createSearchConsoleClient } = require('./lib/search-console-client');

const ROOT = path.join(__dirname, '..');

function siteSlug(siteUrl) {
  const m = String(siteUrl).match(/alumineu\.([a-z]{2,3})/i);
  if (m) return m[1].toLowerCase();
  return String(siteUrl).replace(/[^a-z0-9]+/gi, '_').slice(0, 20);
}

function parseArgs(argv) {
  const flags = { days: 28, site: '', out: '' };
  for (const arg of argv) {
    if (arg.startsWith('--days=')) flags.days = Number(arg.split('=')[1]) || 28;
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

function mapRows(rows, keyName) {
  return (rows || []).map((row) => ({
    [keyName]: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

function sumRows(rows) {
  return (rows || []).reduce(
    (acc, row) => ({
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0),
    }),
    { clicks: 0, impressions: 0 }
  );
}

async function fetchDim(client, siteUrl, range, dimension, rowLimit = 100) {
  const data = await client.querySearchAnalytics(siteUrl, {
    startDate: range.start,
    endDate: range.end,
    dimensions: [dimension],
    rowLimit,
    dataState: 'final',
  });
  return data.rows || [];
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const client = await createSearchConsoleClient(ROOT);
  const siteUrl = flags.site || client.defaultSiteUrl;
  const range = dateRange(flags.days);

  console.log('[GGL] Search Console report');
  console.log('[GGL] Site:', siteUrl);
  console.log('[GGL] Period:', range.start, '→', range.end, `(${flags.days}d)`);

  const sites = await client.listSites();
  const siteEntry = sites.find((s) => s.siteUrl === siteUrl);
  if (!siteEntry) {
    const available = sites.map((s) => s.siteUrl).join(', ') || '(none)';
    throw new Error(`Property ${siteUrl} not in account. Available: ${available}`);
  }
  console.log('[GGL] Permission:', siteEntry.permissionLevel);

  const [summaryRows, queryRows, pageRows, countryRows, deviceRows] = await Promise.all([
    client.querySearchAnalytics(siteUrl, {
      startDate: range.start,
      endDate: range.end,
      dataState: 'final',
    }),
    fetchDim(client, siteUrl, range, 'query', 250),
    fetchDim(client, siteUrl, range, 'page', 100),
    fetchDim(client, siteUrl, range, 'country', 30),
    fetchDim(client, siteUrl, range, 'device', 10),
  ]);

  const summary = summaryRows.rows?.[0] || {};
  const totals = {
    clicks: summary.clicks || 0,
    impressions: summary.impressions || 0,
    ctr: summary.ctr || 0,
    position: summary.position || 0,
  };

  const queries = mapRows(queryRows, 'query').sort((a, b) => b.clicks - a.clicks);
  const pages = mapRows(pageRows, 'page').sort((a, b) => b.clicks - a.clicks);
  const countries = mapRows(countryRows, 'country').sort((a, b) => b.clicks - a.clicks);
  const devices = mapRows(deviceRows, 'device').sort((a, b) => b.clicks - a.clicks);

  console.log('\n[GGL] Totals:', totals);
  console.log('\n[GGL] Top 15 queries:');
  for (const r of queries.slice(0, 15)) {
    console.log(`  ${r.query} | ${r.clicks} clk | ${r.impressions} imp | pos ${r.position.toFixed(1)}`);
  }
  console.log('\n[GGL] Top 10 pages:');
  for (const r of pages.slice(0, 10)) {
    console.log(`  ${r.page} | ${r.clicks} clk | pos ${r.position.toFixed(1)}`);
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    siteUrl,
    permission: siteEntry.permissionLevel,
    startDate: range.start,
    endDate: range.end,
    days: flags.days,
    totals,
    queries,
    pages,
    countries,
    devices,
    meta: {
      queryRowCount: queries.length,
      pageRowCount: pages.length,
      queryClicksSum: sumRows(queries).clicks,
    },
  };

  const slug = siteSlug(siteUrl);
  const outPath = flags.out
    ? path.resolve(ROOT, flags.out)
    : path.join(ROOT, 'data', `gsc_report_${slug}_${range.start}_${range.end}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const mdPath = path.join(ROOT, 'docs', 'reports', `gsc_${slug}_${range.end}.md`);
  fs.mkdirSync(path.dirname(mdPath), { recursive: true });
  fs.writeFileSync(mdPath, renderMarkdown(payload));

  console.log(`\n[GGL] JSON: ${outPath}`);
  console.log(`[GGL] Report: ${mdPath}`);
}

function renderMarkdown(p) {
  const host = p.siteUrl.replace(/^sc-domain:/, '').replace(/\/$/, '') || p.siteUrl;
  const lines = [
    `# Search Console — ${host} ([GGL])`,
    ``,
    `**Period:** ${p.startDate} → ${p.endDate} (${p.days} days)  `,
    `**Property:** ${p.siteUrl}  `,
    `**Fetched:** ${p.fetchedAt.slice(0, 10)}`,
    ``,
    `## Totals`,
    ``,
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Clicks | ${p.totals.clicks} |`,
    `| Impressions | ${p.totals.impressions} |`,
    `| CTR | ${(p.totals.ctr * 100).toFixed(2)}% |`,
    `| Avg position | ${p.totals.position.toFixed(1)} |`,
    ``,
    `## Top queries (by clicks)`,
    ``,
    `| Query | Clicks | Impressions | CTR | Position |`,
    `|-------|-------:|------------:|----:|---------:|`,
  ];
  for (const r of p.queries.slice(0, 40)) {
    lines.push(
      `| ${r.query.replace(/\|/g, '/')} | ${r.clicks} | ${r.impressions} | ${(r.ctr * 100).toFixed(1)}% | ${r.position.toFixed(1)} |`
    );
  }
  lines.push('', '## Top pages', '', '| Page | Clicks | Impressions | Position |', '|------|-------:|------------:|---------:|');
  for (const r of p.pages.slice(0, 25)) {
    const page = r.page.replace(/\|/g, '/').replace(new RegExp(`https:\\/\\/alumineu\\.${siteSlug(p.siteUrl)}`, 'i'), '');
    lines.push(`| ${page || '/'} | ${r.clicks} | ${r.impressions} | ${r.position.toFixed(1)} |`);
  }
  lines.push('', '## Countries', '', '| Country | Clicks | Impressions |', '|---------|-------:|------------:|');
  for (const r of p.countries.slice(0, 15)) {
    lines.push(`| ${r.country} | ${r.clicks} | ${r.impressions} |`);
  }
  lines.push('', '## Devices', '', '| Device | Clicks | Impressions |', '|--------|-------:|------------:|');
  for (const r of p.devices) {
    lines.push(`| ${r.device} | ${r.clicks} | ${r.impressions} |`);
  }
  return lines.join('\n') + '\n';
}

main().catch((e) => {
  const msg = e?.response?.data?.error?.message || e.message || String(e);
  console.error('[GGL] FAIL:', msg);
  if (msg.includes('has not been used') || msg.includes('disabled')) {
    console.error('[GGL] Enable Search Console API: https://console.cloud.google.com/apis/library/searchconsole.googleapis.com?project=oceanic-craft-452806-c0');
  }
  process.exit(1);
});
