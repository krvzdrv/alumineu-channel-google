/**
 * [GGL] Google Search Console API client (googleapis + OAuth).
 */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const GCP_PROJECT_ID = 'oceanic-craft-452806-c0';

function loadEnv(root) {
  require('dotenv').config({ path: path.join(root, '.env') });
}

function pickOAuthCreds() {
  const clientId = String(
    process.env.GOOGLE_GSC_CLIENT_ID ||
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      ''
  ).trim();
  const clientSecret = String(
    process.env.GOOGLE_GSC_CLIENT_SECRET ||
      process.env.GOOGLE_ADS_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      ''
  ).trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'Задайте GOOGLE_GSC_CLIENT_ID/SECRET или GOOGLE_ADS_CLIENT_ID/SECRET в .env'
    );
  }
  return { clientId, clientSecret };
}

function pickTokenPath(root) {
  const explicit = String(process.env.GOOGLE_GSC_TOKEN_PATH || '').trim();
  if (explicit) {
    const p = path.resolve(root, explicit);
    if (fs.existsSync(p)) return p;
    if (fs.existsSync(explicit)) return path.resolve(explicit);
  }
  const gscPath = path.join(root, 'token-gsc.json');
  if (fs.existsSync(gscPath)) return gscPath;
  return null;
}

function loadRefreshToken(root) {
  loadEnv(root);
  const tokenPath = pickTokenPath(root);
  if (!tokenPath) {
    throw new Error(
      'Нет token-gsc.json. Запустите: npm run gsc:auth (вход alumineu.pl@gmail.com)'
    );
  }

  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const scopes = String(token.scope || '');
  if (!scopes.includes('webmasters')) {
    throw new Error(
      `Токен ${path.basename(tokenPath)} без scope webmasters. Удалите и: npm run gsc:auth`
    );
  }
  if (!token.refresh_token) {
    throw new Error('В token-gsc.json нет refresh_token. Удалите файл и: npm run gsc:auth');
  }

  return { tokenPath, refreshToken: token.refresh_token, token };
}

function defaultSiteUrl() {
  return String(process.env.GSC_SITE_URL || 'sc-domain:alumineu.pl').trim();
}

async function createSearchConsoleClient(root = path.join(__dirname, '..', '..')) {
  loadEnv(root);
  const { clientId, clientSecret } = pickOAuthCreds();
  const { tokenPath, refreshToken, token } = loadRefreshToken(root);

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ ...token, refresh_token: refreshToken });

  const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2 });

  async function listSites() {
    const res = await searchconsole.sites.list();
    return res.data.siteEntry || [];
  }

  async function querySearchAnalytics(siteUrl, body) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: body,
    });
    return res.data;
  }

  return {
    root,
    tokenPath,
    gcpProjectId: GCP_PROJECT_ID,
    defaultSiteUrl: defaultSiteUrl(),
    listSites,
    querySearchAnalytics,
  };
}

module.exports = {
  GSC_SCOPE,
  GCP_PROJECT_ID,
  createSearchConsoleClient,
  pickOAuthCreds,
  pickTokenPath,
  loadRefreshToken,
  defaultSiteUrl,
};
