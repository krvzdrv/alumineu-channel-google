/**
 * [GGL] Merchant API — OAuth user привязанный напрямую к PL sub (не только MCA).
 * Нужен для registerGcp / unregisterGcp / users на 5785188396.
 */
const fs = require('fs');
const path = require('path');
const { pickOAuthCreds, GCP_PROJECT_ID, CONTENT_SCOPE } = require('./merchant-oauth-client');

function loadEnv(root) {
  require('dotenv').config({ path: path.join(root, '.env') });
}
const { OAuth2Client } = require('google-auth-library');

const PL_ID = process.env.GOOGLE_MERCHANT_ID || '5785188396';

function pickPlTokenPath(root) {
  const explicit = String(process.env.GOOGLE_MERCHANT_PL_TOKEN_PATH || '').trim();
  if (explicit) {
    const p = path.resolve(root, explicit);
    if (fs.existsSync(p)) return p;
    if (fs.existsSync(explicit)) return path.resolve(explicit);
  }
  const tokenPath = path.join(root, 'token-merchant-pl.json');
  if (fs.existsSync(tokenPath)) return tokenPath;
  return null;
}

function loadPlRefreshToken(root) {
  loadEnv(root);
  const tokenPath = pickPlTokenPath(root);
  if (!tokenPath) {
    throw new Error(
      'Нет token-merchant-pl.json. См. docs/MERCHANT_API_OPERATOR_ACCESS.md → merchant:auth:pl'
    );
  }
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  if (!token.refresh_token) {
    throw new Error('В token-merchant-pl.json нет refresh_token. Удалите и: npm run merchant:auth:pl');
  }
  return { tokenPath, refreshToken: token.refresh_token };
}

async function getPlAccessToken(root = path.join(__dirname, '..', '..')) {
  loadEnv(root);
  const { clientId, clientSecret } = pickOAuthCreds();
  const { refreshToken } = loadPlRefreshToken(root);
  const client = new OAuth2Client(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Не удалось получить PL operator access token');
  return token;
}

async function merchantPlFetch(root, urlPath, options = {}) {
  const accessToken = await getPlAccessToken(root);
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
  PL_ID,
  GCP_PROJECT_ID,
  CONTENT_SCOPE,
  pickOAuthCreds,
  pickPlTokenPath,
  getPlAccessToken,
  merchantPlFetch,
};
