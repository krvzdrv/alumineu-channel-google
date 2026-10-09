#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Replace PL Merchant Sheet image links with CAT/WEB owned URLs (≥500×500).
 *
 * PL still uses Google Sheets + Tilda/Drive photos until DNS → Vercel XML (GGL-027).
 * Live WEB feeds already serve product-media-opt WebP ~1080×1080 from CAT.
 * This patches the PL sheet so MC stops warning image_too_small_for_high_resolution.
 *
 * Usage:
 *   node scripts/patch-pl-sheet-images-from-cat.js --dry-run
 *   node scripts/patch-pl-sheet-images-from-cat.js --apply
 *
 * Source feed (default): https://alumineu.nl/feeds/google-merchant-nl.xml
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { resolveMarket } = require('./lib/merchant-markets');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const DEFAULT_FEED = 'https://alumineu.nl/feeds/google-merchant-nl.xml';

function text(v) {
  return String(v == null ? '' : v).trim();
}

function parseFlags(argv) {
  let apply = false;
  let feedUrl = DEFAULT_FEED;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') apply = true;
    if (a === '--dry-run') apply = false;
    if (a.startsWith('--feed=')) feedUrl = text(a.slice(7));
    if (a === '--feed' && argv[i + 1]) feedUrl = text(argv[++i]);
  }
  return { apply, feedUrl };
}

function colIdx(headers, name) {
  const want = name.toLowerCase().replace(/\s+/g, ' ');
  return headers.findIndex((h) => text(h).toLowerCase().replace(/\s+/g, ' ') === want);
}

/** Map g:id → image_link from a live Merchant XML feed. */
async function loadCatImageMap(feedUrl) {
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}: ${feedUrl}`);
  const xml = await res.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const bySku = new Map();
  for (const it of items) {
    const id = (it.match(/<g:id>([^<]+)<\/g:id>/) || [])[1];
    const img = (it.match(/<g:image_link>([^<]+)<\/g:image_link>/) || [])[1];
    if (id && img) bySku.set(id, img);
  }
  return bySku;
}

/** Longest SKU key contained in title (handles «Zaślepka ENDCAPP Y210»). */
function matchSku(title, skusSorted) {
  const t = text(title);
  for (const sku of skusSorted) {
    if (t.includes(sku)) return sku;
  }
  // corner variants: FLOATIA NX302-inside-corner → title may only have FLOATIA NX302
  for (const sku of skusSorted) {
    const base = sku.replace(/-(inside-corner|outside-corner|cross|straight|t-shape).*$/i, '');
    if (base !== sku && t.includes(base)) return sku;
  }
  return null;
}

async function main() {
  const { apply, feedUrl } = parseFlags(process.argv);
  const market = resolveMarket('PL');
  const spreadsheetId = market.spreadsheetId;
  const sheetName = market.sheetName;

  console.log(`[GGL] PL image patch from CAT feed: ${feedUrl}`);
  console.log(`[GGL] Sheet: ${spreadsheetId} / ${sheetName}`);
  console.log(`[GGL] Mode: ${apply ? 'APPLY' : 'dry-run'}`);

  const bySku = await loadCatImageMap(feedUrl);
  const skusSorted = [...bySku.keys()].sort((a, b) => b.length - a.length);
  console.log(`[GGL] CAT/WEB image map: ${bySku.size} SKU(s)`);

  const oauth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );
  oauth.setCredentials(JSON.parse(fs.readFileSync(path.join(ROOT, 'token.json'), 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth: oauth });

  const range = `'${sheetName.replace(/'/g, "''")}'!A:AM`;
  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = data.values || [];
  if (rows.length < 3) throw new Error('Sheet has no data rows');

  const headers = rows[0].map((h) => text(h));
  const titleIx = colIdx(headers, 'title');
  const imageIx = colIdx(headers, 'image link');
  const idIx = colIdx(headers, 'id');
  if (titleIx < 0 || imageIx < 0) {
    throw new Error('Missing title or image link column');
  }

  let updated = 0;
  let already = 0;
  let unmatched = 0;
  const changes = [];

  // Data starts at row index 2 (row 3 in Sheets) after template cleanup; also tolerate hints row.
  const dataStart = 2;
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    while (row.length <= imageIx) row.push('');
    const title = row[titleIx];
    const sku = matchSku(title, skusSorted);
    if (!sku) {
      unmatched += 1;
      continue;
    }
    const next = bySku.get(sku);
    const prev = text(row[imageIx]);
    if (prev === next) {
      already += 1;
      continue;
    }
    row[imageIx] = next;
    updated += 1;
    if (changes.length < 12) {
      changes.push({
        row: i + 1,
        id: idIx >= 0 ? text(row[idIx]) : '',
        sku,
        from: prev.slice(0, 60),
        to: next.slice(0, 70)
      });
    }
  }

  console.log(`[GGL] Would update: ${updated}, already CAT: ${already}, unmatched: ${unmatched}`);
  for (const c of changes) {
    console.log(`  row ${c.row} ${c.sku} (${c.id})`);
    console.log(`    ← ${c.from}`);
    console.log(`    → ${c.to}`);
  }

  if (!apply) {
    console.log('[GGL] Dry-run only. Re-run with --apply to write the sheet.');
    return;
  }

  if (!updated) {
    console.log('[GGL] Nothing to write.');
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName.replace(/'/g, "''")}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows }
  });
  console.log(`[GGL] Applied ${updated} image link update(s). MC will pick up on next Sheet fetch.`);
  console.log('[GGL] Permanent fix: DNS alumineu.pl → Vercel + fetchUri WEB XML (GGL-027).');
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
