#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] One OAuth consent (oceanic-craft client) → all user-token files.
 * Consent screen is In production (2026-10-10), so refresh tokens live until revoked.
 * Login: alumineu.pl@gmail.com.
 *
 * Usage:
 *   npm run google:auth:all
 *   node scripts/auth-google-all.js --callback 'http://localhost:3000/oauth2callback?code=...'
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');
const { pickOAuthCreds } = require('./lib/google-ads-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const REDIRECT = 'http://localhost:3000/oauth2callback';
const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/siteverification',
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/content',
  'https://www.googleapis.com/auth/manufacturercenter'
];
const OUT_FILES = [
  'token-ads.json',
  'token-gsc.json',
  'token-ga4.json',
  'token-gbp.json',
  'token-merchant.json',
  'token-merchant-pl.json',
  'token-manufacturer.json'
];

const { clientId, clientSecret } = pickOAuthCreds();
const client = new OAuth2Client(clientId, clientSecret, REDIRECT);

async function saveFromCode(code) {
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error('Нет refresh_token — повторите с prompt=consent');
  const granted = String(tokens.scope || '').split(' ');
  const missing = SCOPES.filter((s) => !granted.includes(s));
  if (missing.length) console.warn('[GGL] Не выданы scope:', missing.join(', '));
  for (const f of OUT_FILES) {
    fs.writeFileSync(path.join(ROOT, f), JSON.stringify(tokens, null, 2), { mode: 0o600 });
  }
  console.log('[GGL] Saved:', OUT_FILES.join(', '));
}

function codeFromCallback(raw) {
  const u = new URL(String(raw).trim().replace(/^['"]|['"]$/g, ''));
  if (u.searchParams.get('error')) throw new Error(`OAuth error: ${u.searchParams.get('error')}`);
  return u.searchParams.get('code') || '';
}

(async () => {
  const i = process.argv.indexOf('--callback');
  const cb = i >= 0 ? process.argv[i + 1] : '';
  if (cb) {
    await saveFromCode(codeFromCallback(cb));
    return;
  }

  console.log('\n[GGL] Open (login alumineu.pl@gmail.com):\n');
  console.log(client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES }));

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, REDIRECT);
    if (url.pathname !== '/oauth2callback') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    try {
      await saveFromCode(codeFromCallback(url.href));
      res.end('OK — tokens saved. Close this tab.');
      server.close();
      process.exit(0);
    } catch (e) {
      console.error('[GGL]', e.message);
      res.end('Error — see terminal');
      process.exit(1);
    }
  });
  server.listen(3000, '127.0.0.1', () => console.log('\n[GGL] Waiting on http://127.0.0.1:3000/oauth2callback'));
})().catch((e) => {
  console.error('[GGL]', e.message);
  process.exit(1);
});
