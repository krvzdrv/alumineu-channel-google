#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] OAuth PL operator → token-merchant-pl.json
 * Вход под MERCHANT_PL_OPERATOR_EMAIL (после invite + accept).
 *
 * Redirect: http://localhost:3002/oauth2callback (добавить в GCP OAuth client).
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');
const {
  CONTENT_SCOPE,
  GCP_PROJECT_ID,
  pickOAuthCreds,
  PL_ID,
} = require('./lib/merchant-pl-oauth-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const REDIRECT = 'http://localhost:3002/oauth2callback';
const PORT = 3002;
const OUT = path.resolve(ROOT, process.env.GOOGLE_MERCHANT_PL_TOKEN_PATH || 'token-merchant-pl.json');
const EXPECTED = String(process.env.MERCHANT_PL_OPERATOR_EMAIL || '').trim();

const { clientId, clientSecret } = pickOAuthCreds();
const client = new OAuth2Client(clientId, clientSecret, REDIRECT);

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [CONTENT_SCOPE],
});

console.log('\n[GGL] Merchant PL operator OAuth');
console.log('[GGL] PL sub:', PL_ID);
console.log('[GGL] GCP project:', GCP_PROJECT_ID);
if (EXPECTED) console.log('[GGL] Expected email:', EXPECTED);
console.log('[GGL] 1) GCP redirect URI:', REDIRECT);
console.log('[GGL] 2) Открой URL (инкognito, PL operator email):\n');
console.log(authUrl);
console.log('\n[GGL] 3) После OK: npm run merchant:api:migrate-gcp-mca\n');

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
      process.exit(1);
    }
    const code = url.searchParams.get('code');
    if (!code) {
      res.end('No code');
      return;
    }
    const { tokens } = await client.getToken(code);
    fs.writeFileSync(OUT, JSON.stringify(tokens, null, 2));
    res.end('OK — token-merchant-pl.json saved.');
    console.log('[GGL] Saved:', OUT);
    server.close();
    process.exit(0);
  } catch (e) {
    console.error('[GGL]', e.message);
    res.end('Error');
    process.exit(1);
  }
});

server.listen(PORT, () => console.log('[GGL] Waiting on', REDIRECT));
server.on('error', (e) => {
  console.error('[GGL] Port', PORT, e.code === 'EADDRINUSE' ? 'busy' : e.message);
  process.exit(1);
});
