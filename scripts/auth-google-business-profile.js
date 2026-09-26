#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] OAuth для Google Business Profile API → token-gbp.json
 * В браузере войти как alumineu.pl@gmail.com (владелец карточки).
 *
 * Перед первым запуском в GCP (oceanic-craft-452806-c0):
 * - Enable: My Business Account Management API, Business Information API, Business Profile Performance API
 * - OAuth client redirect URI: http://localhost:3000/oauth2callback (как Ads/GSC)
 *
 * Usage:
 *   npm run gbp:auth
 *   # если после Allow — ERR_CONNECTION_REFUSED: скопируй URL из адресной строки и:
 *   node scripts/auth-google-business-profile.js --callback 'http://localhost:3000/oauth2callback?code=...'
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');
const { GBP_SCOPE, GCP_PROJECT_ID, pickOAuthCreds } = require('./lib/business-profile-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const REDIRECT = 'http://localhost:3000/oauth2callback';
const PORT = 3000;
const HOST = '127.0.0.1';
const OUT = path.resolve(ROOT, process.env.GOOGLE_GBP_TOKEN_PATH || 'token-gbp.json');

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
  if (!scope.includes('business.manage')) {
    throw new Error(
      `Получен токен без business.manage (scope=${scope || 'empty'}). ` +
        'Открой именно GBP auth URL, не Ads, и снова скопируй callback.'
    );
  }
  fs.writeFileSync(OUT, JSON.stringify(tokens, null, 2));
  console.log('[GGL] Saved:', OUT);
  console.log('[GGL] Scope:', scope);
  return tokens;
}

function codeFromCallback(raw) {
  const s = String(raw || '').trim().replace(/^['"]|['"]$/g, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s) && !s.includes('=')) return s; // bare code
  const u = new URL(s);
  const err = u.searchParams.get('error');
  if (err) throw new Error(`OAuth error in callback: ${err}`);
  return u.searchParams.get('code') || '';
}

(async () => {
  const callbackArg = argValue('callback') || process.env.GBP_CALLBACK_URL || '';
  const codeArg = argValue('code') || process.env.GBP_AUTH_CODE || '';

  if (callbackArg || codeArg) {
    console.log('\n[GGL] Google Business Profile OAuth (manual callback)');
    const code = codeArg || codeFromCallback(callbackArg);
    if (!code) {
      console.error('[GGL] Нет code в --callback / --code');
      process.exit(1);
    }
    try {
      await saveFromCode(code);
      console.log('[GGL] OK. Дальше: npm run gbp:verify && npm run gbp:insights');
      process.exit(0);
    } catch (e) {
      console.error('[GGL]', e.message);
      process.exit(1);
    }
  }

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GBP_SCOPE],
  });

  console.log('\n[GGL] Google Business Profile OAuth');
  console.log('[GGL] GCP project:', GCP_PROJECT_ID);
  console.log('[GGL] OAuth client:', clientId.slice(0, 12) + '…');
  console.log('[GGL] Scope:', GBP_SCOPE);
  console.log('[GGL] Redirect:', REDIRECT);
  console.log('[GGL] 1) Открой URL (инкогнито, вход alumineu.pl@gmail.com):\n');
  console.log(authUrl);
  console.log('\n[GGL] 2) Allow');
  console.log('[GGL] 3a) Если страница OK — готово');
  console.log(
    '[GGL] 3b) Если ERR_CONNECTION_REFUSED — НЕ Reload. Скопируй весь URL из адресной строки'
  );
  console.log(
    "       (http://localhost:3000/oauth2callback?code=...) и выполни:\n" +
      "       node scripts/auth-google-business-profile.js --callback 'ВСТАВЬ_URL'\n"
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
      res.end('OK — token-gbp.json saved. Close this tab.');
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
      console.error('[GGL] Port 3000 busy. Stop other process (ads:auth / gsc:auth).');
      console.error('[GGL] Или сразу: --callback с URL из адресной строки после Allow.');
    } else {
      console.error('[GGL]', e.message);
    }
    process.exit(1);
  });
})().catch((e) => {
  console.error('[GGL]', e.message);
  process.exit(1);
});
