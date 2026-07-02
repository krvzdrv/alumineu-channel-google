/**
 * [GGL] Google Manufacturer Center API client (OAuth or service account).
 */
const fs = require('fs');
const path = require('path');
const { GoogleAuth, OAuth2Client } = require('google-auth-library');

const MANUFACTURER_SCOPE = 'https://www.googleapis.com/auth/manufacturercenter';
const MANUFACTURER_API = 'https://manufacturers.googleapis.com/v1';
const GCP_PROJECT_ID = 'oceanic-craft-452806-c0';
const GCP_PROJECT_NUMBER = '820829065208';

function loadEnv(root) {
  require('dotenv').config({ path: path.join(root, '.env') });
}

function pickOAuthCreds() {
  const clientId = String(
    process.env.GOOGLE_MANUFACTURER_CLIENT_ID ||
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.GOOGLE_GSC_CLIENT_ID ||
      ''
  ).trim();
  const clientSecret = String(
    process.env.GOOGLE_MANUFACTURER_CLIENT_SECRET ||
      process.env.GOOGLE_ADS_CLIENT_SECRET ||
      process.env.GOOGLE_GSC_CLIENT_SECRET ||
      ''
  ).trim();
  if (!clientId || !clientSecret) {
    throw new Error('Задайте GOOGLE_ADS_CLIENT_ID/SECRET (oceanic-craft OAuth) в .env');
  }
  return { clientId, clientSecret };
}

function pickTokenPath(root) {
  const explicit = String(process.env.GOOGLE_MANUFACTURER_TOKEN_PATH || '').trim();
  if (explicit) {
    const p = path.resolve(root, explicit);
    if (fs.existsSync(p)) return p;
  }
  const local = path.join(root, 'token-manufacturer.json');
  if (fs.existsSync(local)) return local;
  return null;
}

function pickKeyPath(root) {
  return String(
    process.env.GOOGLE_APPLICATION_MANUFACTURER_CREDENTIALS ||
      process.env.GOOGLE_APPLICATION_MERCHANT_CREDENTIALS ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      ''
  ).trim();
}

function resolveKeyFile(root) {
  const keyPath = pickKeyPath(root);
  if (!keyPath) return null;
  let absolute = path.resolve(root, keyPath);
  if (!fs.existsSync(absolute)) absolute = path.resolve(keyPath);
  if (!fs.existsSync(absolute)) return null;
  return absolute;
}

async function getAccessTokenFromOAuth(root) {
  const tokenPath = pickTokenPath(root);
  if (!tokenPath) return null;
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  if (!token.refresh_token) {
    throw new Error(`В ${path.basename(tokenPath)} нет refresh_token. npm run manufacturer:auth`);
  }
  const scopes = String(token.scope || '');
  if (!scopes.includes('manufacturercenter')) {
    throw new Error(
      `Токен ${path.basename(tokenPath)} без scope manufacturercenter. npm run manufacturer:auth`
    );
  }
  const { clientId, clientSecret } = pickOAuthCreds();
  const client = new OAuth2Client(clientId, clientSecret);
  client.setCredentials({ refresh_token: token.refresh_token });
  const { token: accessToken } = await client.getAccessToken();
  if (!accessToken) throw new Error('OAuth refresh failed for Manufacturer Center');
  return { accessToken, authMode: 'oauth', tokenPath };
}

async function getAccessTokenFromServiceAccount(root) {
  const keyFile = resolveKeyFile(root);
  if (!keyFile) return null;
  const auth = new GoogleAuth({ keyFile, scopes: [MANUFACTURER_SCOPE] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Service account token failed for Manufacturer Center');
  return { accessToken: token, authMode: 'service_account', keyFile };
}

async function getAccessToken(root = path.join(__dirname, '..', '..')) {
  loadEnv(root);
  const useSa = String(process.env.MANUFACTURER_USE_SERVICE_ACCOUNT || '').trim() === '1';
  const tokenPath = pickTokenPath(root);

  if (tokenPath && !useSa) {
    return getAccessTokenFromOAuth(root);
  }
  if (useSa || !tokenPath) {
    const keyFile = resolveKeyFile(root);
    if (useSa && keyFile) {
      return getAccessTokenFromServiceAccount(root);
    }
  }
  throw new Error(
    'Нет token-manufacturer.json в корне репо.\n' +
      '  npm run manufacturer:auth → alumineu.pl@gmail.com → OK в браузере\n' +
      'Проверка: ls token-manufacturer.json'
  );
}

function pickAccountId(root) {
  loadEnv(root);
  const id = String(process.env.MANUFACTURER_ACCOUNT_ID || '').trim();
  if (!id) {
    throw new Error(
      'Задайте MANUFACTURER_ACCOUNT_ID в .env — Manufacturer Center → Settings (НЕ MC 5785188396)'
    );
  }
  return id.replace(/^accounts\//, '');
}

async function manufacturerFetch(accessToken, urlPath, options = {}) {
  const url = urlPath.startsWith('http')
    ? urlPath
    : `${MANUFACTURER_API}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body.error?.message || text.slice(0, 500);
    if (res.status === 403 && /has not been used|disabled/.test(msg)) {
      throw new Error(
        `Manufacturer API 403: включите API в GCP project ${GCP_PROJECT_ID} (№${GCP_PROJECT_NUMBER}): ` +
          'https://console.cloud.google.com/apis/library/manufacturers.googleapis.com?project=oceanic-craft-452806-c0'
      );
    }
    if (res.status === 403 && /cannot access account/i.test(msg)) {
      throw new Error(
        `Manufacturer API 403: нет прав на account. Добавьте user/SA в Manufacturer → Settings → Users. ${msg}`
      );
    }
    throw new Error(`Manufacturer API ${res.status}: ${msg}`);
  }
  return body;
}

async function listAllProducts(accessToken, accountId) {
  const parent = `accounts/${accountId}`;
  const include = ['include=ATTRIBUTES', 'include=ISSUES', 'include=DESTINATION_STATUSES'];
  let pageToken = '';
  const products = [];
  do {
    const qs = new URLSearchParams({ pageSize: '250', ...(pageToken ? { pageToken } : {}) });
    for (const part of include) {
      const [, value] = part.split('=');
      qs.append('include', value);
    }
    const data = await manufacturerFetch(
      accessToken,
      `${parent}/products?${qs.toString()}`
    );
    products.push(...(data.products || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return products;
}

module.exports = {
  MANUFACTURER_SCOPE,
  MANUFACTURER_API,
  GCP_PROJECT_ID,
  GCP_PROJECT_NUMBER,
  pickOAuthCreds,
  pickTokenPath,
  pickAccountId,
  getAccessToken,
  manufacturerFetch,
  listAllProducts,
};
