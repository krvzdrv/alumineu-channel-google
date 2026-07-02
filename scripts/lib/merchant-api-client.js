/**
 * [GGL] Shared Merchant API client (service account JWT).
 */
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const SCOPE_CONTENT = 'https://www.googleapis.com/auth/content';

function loadEnv(repoRoot) {
  require('dotenv').config({ path: path.join(repoRoot, '.env') });
}

function pickKeyPath() {
  return (
    process.env.GOOGLE_APPLICATION_MERCHANT_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    ''
  ).trim();
}

function requireMerchantId() {
  const merchantId = String(process.env.GOOGLE_MERCHANT_ID || '').trim();
  if (!merchantId) {
    throw new Error('Задайте GOOGLE_MERCHANT_ID в .env');
  }
  return merchantId;
}

function resolveKeyFile(repoRoot) {
  const keyPath = pickKeyPath();
  if (!keyPath) {
    throw new Error('Задайте GOOGLE_APPLICATION_MERCHANT_CREDENTIALS');
  }
  let absolute = path.resolve(repoRoot, keyPath);
  if (!fs.existsSync(absolute)) absolute = path.resolve(keyPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Файл ключа не найден: ${keyPath}`);
  }
  return absolute;
}

async function createMerchantClient(repoRoot) {
  loadEnv(repoRoot);
  const merchantId = requireMerchantId();
  const keyFile = resolveKeyFile(repoRoot);
  const auth = new GoogleAuth({ keyFile, scopes: [SCOPE_CONTENT] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Не удалось получить access_token');

  async function merchantFetch(urlPath, options = {}) {
    const url = urlPath.startsWith('http')
      ? urlPath
      : `https://merchantapi.googleapis.com${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }
    if (!res.ok) {
      const err = new Error(`Merchant API HTTP ${res.status}: ${text.slice(0, 1500)}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  async function listAllPages(listFn) {
    const items = [];
    let pageToken = '';
    do {
      const page = await listFn(pageToken);
      const key = page.products ? 'products' : page.dataSources ? 'dataSources' : null;
      if (key && Array.isArray(page[key])) items.push(...page[key]);
      pageToken = page.nextPageToken || '';
    } while (pageToken);
    return items;
  }

  return { merchantId, merchantFetch, listAllPages };
}

function parseCliFlags(argv) {
  const flags = { apply: false, dryRun: true, id: '', limit: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') {
      flags.apply = true;
      flags.dryRun = false;
    }
    if (a === '--dry-run') flags.dryRun = true;
    if (a.startsWith('--id=')) flags.id = a.slice(5).trim();
    if (a.startsWith('--limit=')) flags.limit = Number(a.slice(8)) || 0;
  }
  return flags;
}

/** products API name segment: contentLanguage~feedLabel~offerId (base64url when needed). */
function encodeProductInputId(contentLanguage, feedLabel, offerId) {
  const plain = `${contentLanguage}~${feedLabel}~${offerId}`;
  if (!/[/%~]/.test(plain)) return plain;
  return Buffer.from(plain, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function productInputDeletePath(merchantId, contentLanguage, feedLabel, offerId, dataSourceId) {
  const productInputId = encodeProductInputId(contentLanguage, feedLabel, offerId);
  const q = new URLSearchParams({
    dataSource: `accounts/${merchantId}/dataSources/${dataSourceId}`
  });
  return `/products/v1/accounts/${merchantId}/productInputs/${productInputId}?${q}`;
}

module.exports = {
  SCOPE_CONTENT,
  createMerchantClient,
  parseCliFlags,
  requireMerchantId,
  encodeProductInputId,
  productInputDeletePath
};
