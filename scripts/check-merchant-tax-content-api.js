#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Check tax settings via Content API v2.1 (old API).
 */
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const SCOPE_CONTENT = 'https://www.googleapis.com/auth/content';

async function getClient() {
  const keyPath = process.env.GOOGLE_APPLICATION_MERCHANT_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) throw new Error('No credentials path');
  let absolute = path.resolve(ROOT, keyPath);
  if (!fs.existsSync(absolute)) absolute = path.resolve(keyPath);
  if (!fs.existsSync(absolute)) throw new Error(`Key not found: ${keyPath}`);
  const auth = new GoogleAuth({ keyFile: absolute, scopes: [SCOPE_CONTENT] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function contentFetch(token, merchantId, path) {
  const url = `https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
  }
  if (!res.ok) {
    const err = new Error(`Content API HTTP ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function main() {
  const token = await getClient();
  
  // Try old Content API tax endpoint for PL first
  try {
    const plId = '5785188396';
    console.log(`[GGL] Checking Content API accounttax for PL (${plId})...`);
    const tax = await contentFetch(token, plId, '/accounttax');
    console.log(`[GGL] PL accounttax:`, JSON.stringify(tax, null, 2).slice(0, 1000));
  } catch (e) {
    console.log(`[GGL] PL accounttax error: ${e.status} ${e.message.slice(0, 200)}`);
  }

  // Try for NL
  try {
    const nlId = '5849784515';
    console.log(`\n[GGL] Checking Content API accounttax for NL (${nlId})...`);
    const tax = await contentFetch(token, nlId, '/accounttax');
    console.log(`[GGL] NL accounttax:`, JSON.stringify(tax, null, 2).slice(0, 1000));
  } catch (e) {
    console.log(`[GGL] NL accounttax error: ${e.status} ${e.message.slice(0, 200)}`);
  }
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
