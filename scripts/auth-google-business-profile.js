#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] OAuth для Google Business Profile API → token-gbp.json
 * В браузере войти как alumineu.pl@gmail.com (владелец карточки).
 *
 * Перед первым запуском в GCP (oceanic-craft-452806-c0):
 * - Enable: My Business Account Management API, Business Information API, Business Profile Performance API
 * - OAuth client redirect URI: http://localhost:3001/oauth2callback
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');
const { GBP_SCOPE, GCP_PROJECT_ID, pickOAuthCreds } = require('./lib/business-profile-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const REDIRECT = 'http://localhost:3001/oauth2callback';
const PORT = 3001;
const OUT = path.resolve(ROOT, process.env.GOOGLE_GBP_TOKEN_PATH || 'token-gbp.json');

const { clientId, clientSecret } = pickOAuthCreds();
const client = new OAuth2Client(clientId, clientSecret, REDIRECT);

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [GBP_SCOPE],
});

console.log('\n[GGL] Google Business Profile OAuth');
console.log('[GGL] GCP project:', GCP_PROJECT_ID);
console.log('[GGL] OAuth client:', clientId.slice(0, 12) + '…');
console.log('[GGL] Scope:', GBP_SCOPE);
console.log('[GGL] 1) В GCP добавьте redirect URI:', REDIRECT);
console.log('[GGL] 2) Открой URL (инкognito, вход alumineu.pl@gmail.com):\n');
console.log(authUrl);
console.log('\n[GGL] 3) Разреши доступ к Business Profile');
console.log('[GGL] 4) После OK: npm run gbp:verify && npm run gbp:insights\n');

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

    const { tokens } = await client.getToken(code);
    fs.writeFileSync(OUT, JSON.stringify(tokens, null, 2));
    res.end('OK — token-gbp.json saved. Close this tab.');
    console.log('[GGL] Saved:', OUT);
    console.log('[GGL] Scope:', tokens.scope || GBP_SCOPE);
    server.close();
    process.exit(0);
  } catch (e) {
    console.error('[GGL]', e.message);
    res.end('Error — see terminal');
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('[GGL] Waiting on', REDIRECT);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('[GGL] Port 3001 busy. Stop other process.');
  } else {
    console.error('[GGL]', e.message);
  }
  process.exit(1);
});
