/**
 * [GGL] Google Ads API client (google-ads-api + OAuth refresh token).
 */
const fs = require('fs');
const path = require('path');
const { GoogleAdsApi } = require('google-ads-api');

const ADWORDS_SCOPE = 'https://www.googleapis.com/auth/adwords';
const GCP_PROJECT_ID = 'oceanic-craft-452806-c0';

function loadEnv(root) {
  require('dotenv').config({ path: path.join(root, '.env') });
}

function pickOAuthCreds() {
  const clientId = String(
    process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
  ).trim();
  const clientSecret = String(
    process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || ''
  ).trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'Задайте GOOGLE_ADS_CLIENT_ID/SECRET (oceanic-craft OAuth) или GOOGLE_CLIENT_ID/SECRET в .env'
    );
  }
  return { clientId, clientSecret };
}

function pickTokenPath(root) {
  const explicit = String(process.env.GOOGLE_ADS_TOKEN_PATH || '').trim();
  if (explicit) {
    const p = path.resolve(root, explicit);
    if (fs.existsSync(p)) return p;
    if (fs.existsSync(explicit)) return path.resolve(explicit);
  }
  const adsPath = path.join(root, 'token-ads.json');
  if (fs.existsSync(adsPath)) return adsPath;
  return null;
}

function loadRefreshToken(root) {
  loadEnv(root);
  const tokenPath = pickTokenPath(root);
  if (!tokenPath) {
    throw new Error(
      'Нет token-ads.json. Запустите: npm run ads:auth (вход alumineu.pl@gmail.com)'
    );
  }

  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const scopes = String(token.scope || '');
  if (!scopes.includes('adwords')) {
    throw new Error(
      `Токен ${path.basename(tokenPath)} без scope adwords. Удалите файл и: npm run ads:auth`
    );
  }
  if (!token.refresh_token) {
    throw new Error('В token-ads.json нет refresh_token. Удалите файл и: npm run ads:auth');
  }

  return { tokenPath, refreshToken: token.refresh_token };
}

async function createGoogleAdsClient(root = path.join(__dirname, '..', '..')) {
  loadEnv(root);

  const developerToken = String(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();
  if (!developerToken) {
    throw new Error('Задайте GOOGLE_ADS_DEVELOPER_TOKEN в .env');
  }

  const loginCustomerId = String(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '')
    .replace(/-/g, '')
    .trim();

  const { clientId, clientSecret } = pickOAuthCreds();
  const { tokenPath, refreshToken } = loadRefreshToken(root);

  const api = new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: developerToken,
  });

  async function listAccessibleCustomers() {
    return api.listAccessibleCustomers(refreshToken);
  }

  function useDirectAccess(customerId, options = {}) {
    if (options.direct) return true;
    if (process.env.GOOGLE_ADS_SKIP_LOGIN_CUSTOMER_ID === '1') return true;
    const only = String(process.env.GOOGLE_ADS_DIRECT_CUSTOMER_ID || '')
      .replace(/-/g, '')
      .trim();
    if (only && String(customerId).replace(/-/g, '') === only) return true;
    return false;
  }

  function customer(customerId, options = {}) {
    const cid = String(customerId).replace(/-/g, '');
    const direct = useDirectAccess(cid, options);
    return api.Customer({
      customer_id: cid,
      login_customer_id: direct ? undefined : loginCustomerId || undefined,
      refresh_token: refreshToken,
    });
  }

  function isMccPermissionError(err) {
    const msg = String(err?.message || err?.errors?.[0]?.message || err);
    return (
      msg.includes('USER_PERMISSION_DENIED') ||
      msg.includes('login-customer-id') ||
      msg.includes('does not have permission')
    );
  }

  async function query(customerId, gaql, options = {}) {
    try {
      return await customer(customerId, options).query(gaql);
    } catch (err) {
      if (!options._retried && loginCustomerId && !useDirectAccess(customerId, options) && isMccPermissionError(err)) {
        return customer(customerId, { direct: true }).query(gaql);
      }
      throw err;
    }
  }

  return {
    root,
    tokenPath,
    developerToken,
    loginCustomerId,
    gcpProjectId: GCP_PROJECT_ID,
    listAccessibleCustomers,
    customer,
    query,
  };
}

module.exports = {
  ADWORDS_SCOPE,
  GCP_PROJECT_ID,
  createGoogleAdsClient,
  pickOAuthCreds,
  pickTokenPath,
  loadRefreshToken,
};
