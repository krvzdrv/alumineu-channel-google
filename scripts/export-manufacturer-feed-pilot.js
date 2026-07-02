#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Пилотный Manufacturer feed (20 SKU) из Merchant PL CSV.
 *   npm run manufacturer:export-pilot
 *
 * После одобрения Manufacturer Center — upload TSV или prefer MC sync.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'feeds/google_merchant_from_meta_pl.csv');
const OUT = path.join(ROOT, 'feeds/manufacturer_pilot_pl.tsv');

const PILOT_FAMILIES = new Set(['INVISIA', 'LIGHTRA', 'CLASSIX', 'LAMPLIX', 'CURTINA']);
const MAX = Number(process.env.MANUFACTURER_PILOT_LIMIT || 20);

function parseCsvLine(line) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      cur += c;
    } else if (c === ',' && !inQ) {
      parts.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  parts.push(cur);
  return parts;
}

function familyFromTitle(title) {
  const m = String(title).match(/Profil\s+(\w+)/i);
  return m ? m[1].toUpperCase() : 'OTHER';
}

function mpnFromTitle(title) {
  const m = String(title).match(/(\w+)\s+X\d+/i);
  if (!m) return '';
  return `${m[1].toLowerCase()}_${String(title).match(/X\d+\s*S?/i)?.[0]?.replace(/\s/g, '').toLowerCase() || ''}`.replace(/__/, '_');
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('[GGL] Нет', SRC);
    process.exit(1);
  }
  const lines = fs.readFileSync(SRC, 'utf8').trim().split('\n');
  const header = parseCsvLine(lines[0]);
  const col = (name) => header.indexOf(name);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const p = parseCsvLine(lines[i]);
    const title = p[col('title')] || '';
    const fam = familyFromTitle(title);
    if (!PILOT_FAMILIES.has(fam) && rows.length >= 5) continue;
    rows.push({
      id: p[col('id')],
      title,
      description: (p[col('description')] || '').replace(/\t/g, ' '),
      brand: p[col('brand')] || 'alumineu',
      image_link: p[col('image link')],
      link: p[col('link')],
      mpn: mpnFromTitle(title) || p[col('id')],
      family: fam,
    });
  }

  const pilot = [];
  const seenFam = new Set();
  for (const r of rows) {
    if (pilot.length >= MAX) break;
    if (PILOT_FAMILIES.has(r.family) && seenFam.has(r.family)) continue;
    if (PILOT_FAMILIES.has(r.family)) seenFam.add(r.family);
    pilot.push(r);
  }
  for (const r of rows) {
    if (pilot.length >= MAX) break;
    if (!pilot.find((x) => x.id === r.id)) pilot.push(r);
  }

  const cols = ['id', 'title', 'description', 'brand', 'mpn', 'image_link', 'link'];
  const tsv = [
    cols.join('\t'),
    ...pilot.slice(0, MAX).map((r) =>
      cols.map((k) => String(r[k] || '').replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')
    ),
  ].join('\n');

  fs.writeFileSync(OUT, tsv + '\n');
  console.log('[GGL] Manufacturer pilot feed:', OUT);
  console.log('[GGL] Rows:', Math.min(pilot.length, MAX));
  console.log('[GGL] Families:', [...new Set(pilot.map((r) => r.family))].join(', '));
  console.log('[GGL] Next: docs/MANUFACTURER_CENTER_PL_RUNBOOK.md §1');
}

main();
