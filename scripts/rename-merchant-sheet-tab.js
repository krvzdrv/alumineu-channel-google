#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Rename spreadsheet tab for Merchant feed.
 * Usage: npm run merchant:sheet:rename-tab
 *
 * Env:
 *   GOOGLE_MERCHANT_SPREADSHEET_ID
 *   MERCHANT_OUTPUT_SHEET_NAME — target tab title (default Alumineu Merchant — PL)
 *   MERCHANT_SHEET_GID — optional; rename tab with this gid if set
 *   MERCHANT_SHEET_OLD_NAME — optional; rename tab matching this title
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const TARGET_NAME = process.env.MERCHANT_OUTPUT_SHEET_NAME || 'Alumineu Merchant — PL';

function text(v) {
  return String(v == null ? '' : v).trim();
}

async function authorize() {
  const oauth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );
  const tokenPath = path.join(ROOT, 'token.json');
  if (!fs.existsSync(tokenPath)) {
    throw new Error(`Missing token.json at ${tokenPath}`);
  }
  oauth.setCredentials(JSON.parse(fs.readFileSync(tokenPath, 'utf8')));
  return oauth;
}

async function main() {
  const spreadsheetId = text(process.env.GOOGLE_MERCHANT_SPREADSHEET_ID);
  if (!spreadsheetId) throw new Error('GOOGLE_MERCHANT_SPREADSHEET_ID required');

  const gid = text(process.env.MERCHANT_SHEET_GID);
  const oldName = text(process.env.MERCHANT_SHEET_OLD_NAME);

  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs = meta.data.sheets || [];

  let sheet = null;
  if (gid) {
    sheet = tabs.find((s) => String(s.properties.sheetId) === gid);
  } else if (oldName) {
    sheet = tabs.find((s) => s.properties.title === oldName);
  } else {
    sheet = tabs.find((s) => s.properties.title === TARGET_NAME);
    if (!sheet && tabs.length === 1) sheet = tabs[0];
    if (!sheet) {
      sheet = tabs.find((s) => /product|source|merchant/i.test(s.properties.title));
    }
  }

  if (!sheet) {
    console.log('[GGL] Tabs:', tabs.map((s) => `${s.properties.title} (gid=${s.properties.sheetId})`).join(', '));
    throw new Error('Tab not found — set MERCHANT_SHEET_GID or MERCHANT_SHEET_OLD_NAME');
  }

  const sheetId = sheet.properties.sheetId;
  const current = sheet.properties.title;
  if (current === TARGET_NAME) {
    console.log(`[GGL] Tab already named "${TARGET_NAME}" (gid=${sheetId})`);
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId, title: TARGET_NAME },
            fields: 'title'
          }
        }
      ]
    }
  });

  console.log(`[GGL] Renamed tab "${current}" → "${TARGET_NAME}" (gid=${sheetId})`);
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
