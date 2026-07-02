/**
 * [GGL] Merchant Center API — OAuth user client (content scope).
 */
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const CONTENT_SCOPE = 'https://www.googleapis.com/auth/content';
const GCP_PROJECT_ID = 'oceanic-craft-452806-c0';

function loadEnv(root) {
  require('dotenv').config({ path: path.join(root, '.env') });
}

function pickOAuthCreds() {
  const clientId = String(
    process.env.GOOGLE_MERCHANT_CLIENT_ID ||
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.GOOGLE_GSC_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      ''
  ).trim();
  const clientSecret = String(
    process.env.GOOGLE_MERCHANT_CLIENT_SECRET ||
      process.env.GOOGLE_ADS_CLIENT_SECRET ||
      process.env.GOOGLE_GSC_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      ''
  ).trim();
  if (!clientId || !clientSecret) {
    throw new Error('Задайте GOOGLE_ADS_CLIENT_ID/SECRET (oceanic-craft OAuth) в .env');
  }
  return { clientId, clientSecret };
}

function pickTokenPath(root) {
  const explicit = String(process.env.GOOGLE_MERCHANT_TOKEN_PATH || '').trim();
  if (explicit) {
    const p = path.resolve(root, explicit);
    if (fs.existsSync(p)) return p;
    if (fs.existsSync(explicit)) return path.resolve(explicit);
  }
  const tokenPath = path.join(root, 'token-merchant.json');
  if (fs.existsSync(tokenPath)) return tokenPath;
  return null;
}

function loadRefreshToken(root) {
  loadEnv(root);
  const tokenPath = pickTokenPath(root);
  if (!tokenPath) {
    throw new Error(
      'Нет token-merchant.json. Запустите: npm run merchant:auth (вход alumineu.pl@gmail.com)'
    );
  }
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const scopes = String(token.scope || '');
  if (!scopes.includes('auth/content')) {
    throw new Error(
      `Токен ${path.basename(tokenPath)} без scope content. Удалите и: npm run merchant:auth`
    );
  }
  if (!token.refresh_token) {
    throw new Error('В token-merchant.json нет refresh_token. Удалите файл и: npm run merchant:auth');
  }
  return { tokenPath, refreshToken: token.refresh_token };
}

async function getAccessToken(root = path.join(__dirname, '..', '..')) {
  loadEnv(root);
  const { clientId, clientSecret } = pickOAuthCreds();
  const { refreshToken } = loadRefreshToken(root);
  const client = new OAuth2Client(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Не удалось получить access token для Merchant OAuth');
  return token;
}

async function merchantUserFetch(root, urlPath, options = {}) {
  const accessToken = await getAccessToken(root);
  const url = urlPath.startsWith('http')
    ? urlPath
    : `https://merchantapi.googleapis.com${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  if (!res.ok) {
    const err = new Error(`Merchant API HTTP ${res.status}: ${text.slice(0, 1500)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

module.exports = {
  CONTENT_SCOPE,
  GCP_PROJECT_ID,
  pickOAuthCreds,
  pickTokenPath,
  loadRefreshToken,
  getAccessToken,
  merchantUserFetch,
};
