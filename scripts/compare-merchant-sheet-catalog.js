#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Compare Google Sheets feed rows vs Merchant Center processed products.
 * Usage: npm run merchant:api:compare-sheet
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { createMerchantClient } = require('./lib/merchant-api-client');
const { resolveMarket, resolveSpreadsheetIdForMarket } = require('./lib/merchant-markets');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

function text(v) {
  return String(v == null ? '' : v).trim();
}

async function loadSheetIds(market, auth) {
  const oauth = auth;
  const sheets = google.sheets({ version: 'v4', auth: oauth });
  const name = market.sheetName;
  const spreadsheetId = await resolveSpreadsheetIdForMarket(market, oauth);
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${name.replace(/'/g, "''")}'!A:AM`
  });
  const rows = data.values || [];
  const headers = rows[0].map((h) => text(h));
  const idIx = headers.indexOf('id');
  const titleIx = headers.indexOf('title');
  const ids = new Map();
  for (const row of rows.slice(2)) {
    const id = text(row[idIx]);
    if (id) ids.set(id, text(row[titleIx]));
  }
  return ids;
}

async function main() {
  const market = resolveMarket(process.argv);
  const oauth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );
  oauth.setCredentials(JSON.parse(fs.readFileSync(path.join(ROOT, 'token.json'), 'utf8')));
  const { merchantId, merchantFetch, listAllPages } = await createMerchantClient(ROOT);
  const sheetIds = await loadSheetIds(market, oauth);
  const products = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '250' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/products/v1/accounts/${merchantId}/products?${q}`);
  });

  const feedLabel = market.feedLabel;
  const scoped = products.filter((p) => !feedLabel || text(p.feedLabel) === feedLabel);
  const mcIds = new Map(scoped.map((p) => [p.offerId, p]));
  const onlySheet = [...sheetIds.keys()].filter((id) => !mcIds.has(id));
  const onlyMc = [...mcIds.keys()].filter((id) => !sheetIds.has(id));
  const archived = scoped.filter((p) => p.archived);

  console.log(
    `[GGL] Market ${market.code} (feedLabel=${feedLabel}) | Sheet rows: ${sheetIds.size} | MC products: ${scoped.length} | archived: ${archived.length}`
  );

  if (onlySheet.length) {
    console.log(`\n[GGL] In sheet only (${onlySheet.length}) — MC → PRODUCTS SOURCE 1 → Update:`);
    for (const id of onlySheet.slice(0, 20)) console.log(`  - ${id}\t${sheetIds.get(id) || '?'}`);
    if (onlySheet.length > 20) console.log(`  … +${onlySheet.length - 20} more`);
  } else {
    console.log('\n[GGL] In sheet only: none');
  }

  if (onlyMc.length) {
    console.log(`\n[GGL] In MC only (${onlyMc.length}) — remove from sheet or wait for expiry:`);
    for (const id of onlyMc.slice(0, 20)) {
      const p = mcIds.get(id);
      console.log(`  - ${id}\t${text(p?.productAttributes?.title)}`);
    }
  } else {
    console.log('[GGL] In MC only: none');
  }

  if (!onlySheet.length && !onlyMc.length && !archived.length) {
    console.log('\n[GGL] Sheet and MC catalog are in sync.');
  }
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
