/**
 * [GGL] Google Business Profile API client (OAuth refresh token).
 */
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';
const GCP_PROJECT_ID = 'oceanic-craft-452806-c0';

const ACCOUNT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const PERFORMANCE_API = 'https://businessprofileperformance.googleapis.com/v1';

/** Metrics that sum to «profile views» in GBP Insights (impressions). */
const PROFILE_VIEW_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
];

function loadEnv(root) {
  require('dotenv').config({ path: path.join(root, '.env') });
}

function pickOAuthCreds() {
  const clientId = String(
    process.env.GOOGLE_GBP_CLIENT_ID ||
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.GOOGLE_GSC_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      ''
  ).trim();
  const clientSecret = String(
    process.env.GOOGLE_GBP_CLIENT_SECRET ||
      process.env.GOOGLE_ADS_CLIENT_SECRET ||
      process.env.GOOGLE_GSC_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      ''
  ).trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'Задайте GOOGLE_ADS_CLIENT_ID/SECRET (oceanic-craft OAuth) в .env'
    );
  }
  return { clientId, clientSecret };
}

function pickTokenPath(root) {
  const explicit = String(process.env.GOOGLE_GBP_TOKEN_PATH || '').trim();
  if (explicit) {
    const p = path.resolve(root, explicit);
    if (fs.existsSync(p)) return p;
    if (fs.existsSync(explicit)) return path.resolve(explicit);
  }
  const gbpPath = path.join(root, 'token-gbp.json');
  if (fs.existsSync(gbpPath)) return gbpPath;
  return null;
}

function loadRefreshToken(root) {
  loadEnv(root);
  const tokenPath = pickTokenPath(root);
  if (!tokenPath) {
    throw new Error(
      'Нет token-gbp.json. Запустите: npm run gbp:auth (вход alumineu.pl@gmail.com)'
    );
  }

  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const scopes = String(token.scope || '');
  if (!scopes.includes('business.manage')) {
    throw new Error(
      `Токен ${path.basename(tokenPath)} без scope business.manage. Удалите и: npm run gbp:auth`
    );
  }
  if (!token.refresh_token) {
    throw new Error('В token-gbp.json нет refresh_token. Удалите файл и: npm run gbp:auth');
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
  if (!token) throw new Error('Не удалось получить access token для GBP');
  return token;
}

async function gbpFetch(url, accessToken) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body.error?.message || text.slice(0, 400);
    const quotaZero = (body.error?.details || []).some(
      (d) =>
        d['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo' &&
        d.metadata?.quota_limit_value === '0'
    );
    if (res.status === 429 && quotaZero) {
      throw new Error(
        `GBP API 429: квота 0 QPM — проект ${GCP_PROJECT_ID} (№820829065208) не одобрен для Business Profile API. ` +
          'Подайте заявку «Application for Basic API Access» (GBP API contact form), email = owner/manager карточки.'
      );
    }
    throw new Error(`GBP API ${res.status}: ${msg}`);
  }
  return body;
}

async function listAccounts(accessToken) {
  const data = await gbpFetch(`${ACCOUNT_API}/accounts`, accessToken);
  return data.accounts || [];
}

async function listLocations(accessToken, accountName) {
  const params = new URLSearchParams({
    readMask: 'name,title,storefrontAddress',
    pageSize: '100',
  });
  const url = `${BUSINESS_INFO_API}/${accountName}/locations?${params}`;
  const data = await gbpFetch(url, accessToken);
  return data.locations || [];
}

function pickLocation(locations, root) {
  const override = String(process.env.GBP_LOCATION_NAME || '').trim();
  if (override) {
    const hit = locations.find((l) => l.name === override || l.name.endsWith(`/${override}`));
    if (hit) return hit;
  }

  const cachePath = path.join(root, 'data', 'gbp_location.json');
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const hit = locations.find((l) => l.name === cached.name);
    if (hit) return hit;
  }

  const piastow = locations.find((l) => {
    const addr = l.storefrontAddress || {};
    const line = [addr.locality, addr.addressLines?.join(' '), addr.postalCode]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return line.includes('piast') || (l.title || '').toLowerCase().includes('alumineu');
  });
  if (piastow) return piastow;
  if (locations.length === 1) return locations[0];
  return null;
}

function cacheLocation(root, location) {
  const cachePath = path.join(root, 'data', 'gbp_location.json');
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(
    cachePath,
    JSON.stringify(
      {
        name: location.name,
        title: location.title,
        address: location.storefrontAddress,
        cached_at: new Date().toISOString(),
      },
      null,
      2
    ) + '\n'
  );
}

function buildDailyRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const part = (d) => ({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  });
  return { start_date: part(start), end_date: part(end) };
}

function sumTimeSeriesValues(timeSeries) {
  const dated = timeSeries?.datedValues || [];
  return dated.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
}

async function fetchProfileViews28d(accessToken, locationName, days = 28) {
  const range = buildDailyRange(days);
  const params = new URLSearchParams();
  for (const m of PROFILE_VIEW_METRICS) params.append('dailyMetrics', m);
  params.append('dailyRange.start_date.year', String(range.start_date.year));
  params.append('dailyRange.start_date.month', String(range.start_date.month));
  params.append('dailyRange.start_date.day', String(range.start_date.day));
  params.append('dailyRange.end_date.year', String(range.end_date.year));
  params.append('dailyRange.end_date.month', String(range.end_date.month));
  params.append('dailyRange.end_date.day', String(range.end_date.day));

  const url = `${PERFORMANCE_API}/${locationName}:fetchMultiDailyMetricsTimeSeries?${params}`;
  const data = await gbpFetch(url, accessToken);

  const byMetric = {};
  let total = 0;
  for (const row of data.multiDailyMetricTimeSeries || []) {
    const metric = row.dailyMetricTimeSeries?.dailyMetric;
    const series = row.dailyMetricTimeSeries?.timeSeries;
    const sum = sumTimeSeriesValues(series);
    if (metric) byMetric[metric] = sum;
    total += sum;
  }

  return {
    days,
    profile_views: total,
    by_metric: byMetric,
    period: {
      start: `${range.start_date.year}-${String(range.start_date.month).padStart(2, '0')}-${String(range.start_date.day).padStart(2, '0')}`,
      end: `${range.end_date.year}-${String(range.end_date.month).padStart(2, '0')}-${String(range.end_date.day).padStart(2, '0')}`,
    },
  };
}

async function resolveLocation(accessToken, root) {
  const accountOverride = String(process.env.GBP_ACCOUNT_NAME || '').trim();
  let accounts = await listAccounts(accessToken);
  if (!accounts.length) throw new Error('Нет GBP accounts для этого Google user');

  let account = accounts[0];
  if (accountOverride) {
    account = accounts.find((a) => a.name === accountOverride) || account;
  }

  const locations = await listLocations(accessToken, account.name);
  if (!locations.length) throw new Error(`Нет locations в ${account.name}`);

  const location = pickLocation(locations, root);
  if (!location) {
    const titles = locations.map((l) => `${l.name} · ${l.title}`).join('\n  - ');
    throw new Error(
      `Не удалось выбрать location. Задайте GBP_LOCATION_NAME в .env.\n  - ${titles}`
    );
  }

  cacheLocation(root, location);
  return { account, location };
}

module.exports = {
  GBP_SCOPE,
  GCP_PROJECT_ID,
  PROFILE_VIEW_METRICS,
  pickOAuthCreds,
  pickTokenPath,
  loadRefreshToken,
  getAccessToken,
  listAccounts,
  listLocations,
  fetchProfileViews28d,
  resolveLocation,
};
