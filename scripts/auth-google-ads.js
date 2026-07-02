#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] OAuth для Google Ads API → token-ads.json
 * В браузере войти как alumineu.pl@gmail.com (не volosevich.flexy@gmail.com).
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
const OUT = path.resolve(ROOT, process.env.GOOGLE_ADS_TOKEN_PATH || 'token-ads.json');

const { clientId, clientSecret } = pickOAuthCreds();
const client = new OAuth2Client(clientId, clientSecret, REDIRECT);

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [ADWORDS_SCOPE],
});

console.log('\n[GGL] Google Ads OAuth');
console.log('[GGL] GCP project:', GCP_PROJECT_ID);
console.log('[GGL] OAuth client:', clientId.slice(0, 12) + '…');
console.log('[GGL] 1) Открой URL (инкognito, вход alumineu.pl@gmail.com):\n');
console.log(authUrl);
console.log('\n[GGL] 2) Войди как alumineu.pl@gmail.com');
console.log('[GGL] 3) Разреши доступ\n');

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
    res.end('OK — token saved. Close this tab.');
    console.log('[GGL] Saved:', OUT);
    console.log('[GGL] Scope:', tokens.scope || ADWORDS_SCOPE);
    server.close();
    process.exit(0);
  } catch (e) {
    console.error('[GGL]', e.message);
    res.end('Error — see terminal');
    process.exit(1);
  }
});

server.listen(3000, () => {
  console.log('[GGL] Waiting on', REDIRECT);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('[GGL] Port 3000 busy. Stop other process or change redirect URI.');
  } else {
    console.error('[GGL]', e.message);
  }
  process.exit(1);
});
