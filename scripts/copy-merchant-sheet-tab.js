#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Duplicate PL Merchant sheet tab for another market (headers only, no catalog rows).
 *
 * Usage:
 *   npm run merchant:sheet:copy-tab -- --market=DE --apply
 *   npm run merchant:sheet:copy-tab -- --market=DE --from=PL --apply
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { resolveMarket, resolveMarketCode, resolveSpreadsheetIdForMarket } = require('./lib/merchant-markets');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

function text(v) {
  return String(v == null ? '' : v).trim();
}

function parseArgs(argv) {
  let apply = false;
  let fromCode = 'PL';
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') apply = true;
    if (argv[i].startsWith('--from=')) fromCode = text(argv[i].slice(7)).toUpperCase();
  }
  return { apply, fromCode, marketCode: resolveMarketCode(argv) };
}

async function authorize(repoRoot) {
  const oauth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );
  oauth.setCredentials(JSON.parse(fs.readFileSync(path.join(repoRoot, 'token.json'), 'utf8')));
  return oauth;
}

async function main() {
  const { apply, fromCode, marketCode } = parseArgs(process.argv);
  const sourceMarket = resolveMarket(fromCode);
  const targetMarket = resolveMarket(marketCode);
  const auth = await authorize(ROOT);
  const spreadsheetId = await resolveSpreadsheetIdForMarket(targetMarket, auth);
  const sheetsApi = google.sheets({ version: 'v4', auth });
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
  const tabs = meta.data.sheets || [];

  const findTab = (title) => tabs.find((s) => text(s.properties?.title) === title);
  const sourceTab = findTab(sourceMarket.sheetName);
  if (!sourceTab) {
    throw new Error(`Source tab not found: "${sourceMarket.sheetName}"`);
  }

  const existingTarget = findTab(targetMarket.sheetName);
  if (existingTarget) {
    console.log(`[GGL] Target tab already exists: "${targetMarket.sheetName}" (gid ${existingTarget.properties.sheetId})`);
    return;
  }

  console.log(`[GGL] Copy "${sourceMarket.sheetName}" → "${targetMarket.sheetName}" in ${spreadsheetId}`);
  if (!apply) {
    console.log('[GGL] DRY RUN — pass --apply to duplicate tab');
    return;
  }

  const copyRes = await sheetsApi.spreadsheets.sheets.copyTo({
    spreadsheetId,
    sheetId: sourceTab.properties.sheetId,
    requestBody: { destinationSpreadsheetId: spreadsheetId }
  });
  const newSheetId = copyRes.data.sheetId;
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: newSheetId, title: targetMarket.sheetName },
            fields: 'title'
          }
        }
      ]
    }
  });

  const headerRange = `'${targetMarket.sheetName.replace(/'/g, "''")}'!1:2`;
  await sheetsApi.spreadsheets.values.clear({ spreadsheetId, range: headerRange });

  const sourceRange = `'${sourceMarket.sheetName.replace(/'/g, "''")}'!1:2`;
  const headerValues = await sheetsApi.spreadsheets.values.get({ spreadsheetId, range: sourceRange });
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: `'${targetMarket.sheetName.replace(/'/g, "''")}'!1:2`,
    valueInputOption: 'RAW',
    requestBody: { values: headerValues.data.values || [] }
  });

  console.log(`[GGL] Created tab "${targetMarket.sheetName}" (gid ${newSheetId}). Clear old catalog rows in MC UI before first sync.`);
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
