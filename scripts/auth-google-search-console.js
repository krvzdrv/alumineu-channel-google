#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] OAuth для Search Console API → token-gsc.json
 * В браузере войти как alumineu.pl@gmail.com.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');
const { GSC_SCOPE, GCP_PROJECT_ID, pickOAuthCreds } = require('./lib/search-console-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const REDIRECT = 'http://localhost:3000/oauth2callback';
const OUT = path.resolve(ROOT, process.env.GOOGLE_GSC_TOKEN_PATH || 'token-gsc.json');

const { clientId, clientSecret } = pickOAuthCreds();
const client = new OAuth2Client(clientId, clientSecret, REDIRECT);

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [GSC_SCOPE],
});

console.log('\n[GGL] Search Console OAuth');
console.log('[GGL] GCP project:', GCP_PROJECT_ID);
console.log('[GGL] OAuth client:', clientId.slice(0, 12) + '…');
console.log('[GGL] 1) Открой URL (инкognito, вход alumineu.pl@gmail.com):\n');
console.log(authUrl);
console.log('\n[GGL] 2) Разреши доступ к Search Console');
console.log('[GGL] 3) После OK в браузере: npm run gsc:queries\n');

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
    res.end('OK — token-gsc.json saved. Close this tab.');
    console.log('[GGL] Saved:', OUT);
    console.log('[GGL] Scope:', tokens.scope || GSC_SCOPE);
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
    console.error('[GGL] Port 3000 busy. Stop other process.');
  } else {
    console.error('[GGL]', e.message);
  }
  process.exit(1);
});
