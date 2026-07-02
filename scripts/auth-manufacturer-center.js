#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] OAuth → token-manufacturer.json (scope manufacturercenter)
 *
 * Prerequisites:
 * - Enable Manufacturer Center API in GCP oceanic-craft-452806-c0
 * - OAuth redirect: http://localhost:3000/oauth2callback (как merchant:auth / ads:auth)
 * - Login: alumineu.pl@gmail.com (Admin in Manufacturer Center)
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');
const {
  MANUFACTURER_SCOPE,
  GCP_PROJECT_ID,
  pickOAuthCreds,
} = require('./lib/manufacturer-api-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const REDIRECT = 'http://localhost:3000/oauth2callback';
const PORT = 3000;
const OUT = path.resolve(ROOT, process.env.GOOGLE_MANUFACTURER_TOKEN_PATH || 'token-manufacturer.json');

const { clientId, clientSecret } = pickOAuthCreds();
const client = new OAuth2Client(clientId, clientSecret, REDIRECT);

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  response_type: 'code',
  scope: [MANUFACTURER_SCOPE],
});

const URL_FILE = path.join(ROOT, 'data', 'manufacturer-oauth-url.txt');
fs.mkdirSync(path.dirname(URL_FILE), { recursive: true });
fs.writeFileSync(URL_FILE, `${authUrl}\n`, 'utf8');

console.log('\n[GGL] Manufacturer Center OAuth');
console.log('[GGL] GCP project:', GCP_PROJECT_ID);
console.log('[GGL] Scope:', MANUFACTURER_SCOPE);
console.log('[GGL] Redirect URI (must be in GCP OAuth client):', REDIRECT);
console.log('[GGL] Full URL saved:', URL_FILE);
console.log('[GGL] Open in incognito as alumineu.pl@gmail.com — copy FULL line from file if browser fails.\n');
console.log(authUrl);
console.log('\n[GGL] After OK: MANUFACTURER_ACCOUNT_ID=5805304565 in .env → npm run manufacturer:audit\n');

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
    res.end('OK — token-manufacturer.json saved. Close tab.');
    console.log('[GGL] Saved:', OUT);
    console.log('[GGL] Scope:', tokens.scope || MANUFACTURER_SCOPE);
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
  if (process.platform === 'darwin') {
    const { exec } = require('child_process');
    exec(`open -a "Google Chrome" --incognito "${authUrl}"`, (err) => {
      if (err) exec(`open "${authUrl}"`);
    });
    console.log('[GGL] Opening browser (incognito if Chrome installed)…');
  }
});
server.on('error', (e) => {
  console.error('[GGL]', e.code === 'EADDRINUSE' ? 'Port 3000 busy — остановите ads:auth/gsc:auth/merchant:auth и повторите' : e.message);
  process.exit(1);
});
