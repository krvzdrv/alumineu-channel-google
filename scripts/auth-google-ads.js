#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] OAuth для Google Ads API → token-ads.json
 * В браузере войти как alumineu.pl@gmail.com (не volosevich.flexy@gmail.com).
 *
 * Usage:
 *   npm run ads:auth
 *   # если ERR_CONNECTION_REFUSED — скопируй URL из адресной строки:
 *   node scripts/auth-google-ads.js --callback 'http://localhost:3000/oauth2callback?code=...'
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');
const { ADWORDS_SCOPE, GCP_PROJECT_ID, pickOAuthCreds } = require('./lib/google-ads-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const REDIRECT = 'http://localhost:3000/oauth2callback';
const PORT = 3000;
const HOST = '127.0.0.1';
const OUT = path.resolve(ROOT, process.env.GOOGLE_ADS_TOKEN_PATH || 'token-ads.json');

const { clientId, clientSecret } = pickOAuthCreds();
const client = new OAuth2Client(clientId, clientSecret, REDIRECT);

function argValue(name) {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  if (hit) return hit.slice(pref.length);
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return '';
}

async function saveFromCode(code) {
  const { tokens } = await client.getToken(code);
  const scope = String(tokens.scope || '');
  if (!scope.includes('adwords')) {
    throw new Error(
      `Получен токен без adwords (scope=${scope || 'empty'}). Открой Ads auth URL и снова скопируй callback.`
    );
  }
  fs.writeFileSync(OUT, JSON.stringify(tokens, null, 2));
  console.log('[GGL] Saved:', OUT);
  console.log('[GGL] Scope:', scope || ADWORDS_SCOPE);
  return tokens;
}

function codeFromCallback(raw) {
  const s = String(raw || '').trim().replace(/^['"]|['"]$/g, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s) && !s.includes('=')) return s;
  const u = new URL(s);
  const err = u.searchParams.get('error');
  if (err) throw new Error(`OAuth error in callback: ${err}`);
  return u.searchParams.get('code') || '';
}

(async () => {
  const callbackArg = argValue('callback') || process.env.ADS_CALLBACK_URL || '';
  const codeArg = argValue('code') || process.env.ADS_AUTH_CODE || '';

  if (callbackArg || codeArg) {
    console.log('\n[GGL] Google Ads OAuth (manual callback)');
    const code = codeArg || codeFromCallback(callbackArg);
    if (!code) {
      console.error('[GGL] Нет code в --callback / --code');
      process.exit(1);
    }
    try {
      await saveFromCode(code);
      console.log('[GGL] OK');
      process.exit(0);
    } catch (e) {
      console.error('[GGL]', e.message);
      process.exit(1);
    }
  }

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [ADWORDS_SCOPE],
  });

  console.log('\n[GGL] Google Ads OAuth');
  console.log('[GGL] GCP project:', GCP_PROJECT_ID);
  console.log('[GGL] OAuth client:', clientId.slice(0, 12) + '…');
  console.log('[GGL] 1) Открой URL (инкогнито, вход alumineu.pl@gmail.com):\n');
  console.log(authUrl);
  console.log('\n[GGL] 2) Allow');
  console.log('[GGL] 3a) Если OK — готово');
  console.log(
    '[GGL] 3b) Если ERR_CONNECTION_REFUSED — скопируй URL из адресной строки и:\n' +
      "       node scripts/auth-google-ads.js --callback 'ВСТАВЬ_URL'\n"
  );

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, REDIRECT);
      if (url.pathname !== '/oauth2callback') {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const err = url.searchParams.get('error');
      if (err) {
        res.end(`OAuth error: ${err}`);
        console.error('[GGL] OAuth error:', err);
        process.exit(1);
      }
      const code = url.searchParams.get('code');
      if (!code) {
        res.end('No code');
        return;
      }
      await saveFromCode(code);
      res.end('OK — token saved. Close this tab.');
      server.close();
      process.exit(0);
    } catch (e) {
      console.error('[GGL]', e.message);
      res.end('Error — see terminal');
      process.exit(1);
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`[GGL] Waiting on http://${HOST}:${PORT}/oauth2callback`);
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error('[GGL] Port 3000 busy — используй --callback с URL после Allow.');
    } else {
      console.error('[GGL]', e.message);
    }
    process.exit(1);
  });
})().catch((e) => {
  console.error('[GGL]', e.message);
  process.exit(1);
});
