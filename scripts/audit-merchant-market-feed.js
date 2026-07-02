#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Audit a market feed (PL/DE/RO/COM): data source, catalog, shipping, homepage.
 * Usage: npm run merchant:api:audit-market -- --market=RO
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { createMerchantClient } = require('./lib/merchant-api-client');
const {
  resolveMarket,
  resolveMarketCode,
  resolveSpreadsheetIdForMarket
} = require('./lib/merchant-markets');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

function text(v) {
  return String(v == null ? '' : v).trim();
}

function finding(level, area, message, action = '') {
  return { level, area, message, action };
}

function parseMarketFlags(argv) {
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--market=')) return text(a.slice(9)).toUpperCase();
    if (a === '--market' && argv[i + 1]) return text(argv[i + 1]).toUpperCase();
  }
  return resolveMarketCode(argv);
}

function hostFromUrl(urlish) {
  try {
    return new URL(urlish).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function expectedSpreadsheetDriveUri(market) {
  const id = market.spreadsheetId || text(process.env[`GOOGLE_MERCHANT_SPREADSHEET_ID_${market.code}`]);
  return id ? `drive://${id}` : '';
}

async function loadSheetStats(market) {
  const oauth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );
  oauth.setCredentials(JSON.parse(fs.readFileSync(path.join(ROOT, 'token.json'), 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth: oauth });
  const spreadsheetId = await resolveSpreadsheetIdForMarket(market, oauth);
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${market.sheetName.replace(/'/g, "''")}'!A:AM`
  });
  const rows = data.values || [];
  const headers = (rows[0] || []).map((h) => text(h));
  const idIx = headers.indexOf('id');
  const linkIx = headers.indexOf('link');
  const priceIx = headers.indexOf('price');
  const ids = new Set();
  let roLinks = 0;
  let ronPrices = 0;
  for (const row of rows.slice(2)) {
    const id = text(row[idIx]);
    if (!id) continue;
    ids.add(id);
    const link = text(row[linkIx]);
    if (hostFromUrl(link) === hostFromUrl(market.siteOrigin)) roLinks += 1;
    if (text(row[priceIx]).toUpperCase().includes(market.currency)) ronPrices += 1;
  }
  return { spreadsheetId, sheetRows: ids.size, roLinks, currencyPrices: ronPrices };
}

function summarizeIssues(products) {
  const counts = new Map();
  for (const p of products) {
    for (const issue of p.productStatus?.itemLevelIssues || []) {
      const key = text(issue.code) || text(issue.description) || 'unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const marketCode = parseMarketFlags(process.argv);
  const market = resolveMarket(marketCode);
  const merchantId = text(market.merchantAccountId) || process.env.GOOGLE_MERCHANT_ID;
  process.env.GOOGLE_MERCHANT_ID = merchantId;
  const { merchantFetch, listAllPages } = await createMerchantClient(ROOT);
  const findings = [];

  console.log(
    `[GGL] Market audit ${market.code}: feedLabel=${market.feedLabel} lang=${market.contentLanguage} countries=${market.targetCountries.join(',')} currency=${market.currency}`
  );

  const sheet = await loadSheetStats(market);
  findings.push(
    finding(
      'OK',
      'sheet',
      `Sheets ${sheet.spreadsheetId} / "${market.sheetName}": ${sheet.sheetRows} rows, ${sheet.currencyPrices} prices in ${market.currency}, ${sheet.roLinks} links on ${hostFromUrl(market.siteOrigin)}`
    )
  );

  const dataSources = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '50' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/datasources/v1/accounts/${merchantId}/dataSources?${q}`);
  });

  const expectedUri = expectedSpreadsheetDriveUri(market);
  const marketSources = dataSources.filter((ds) => {
    const uri = text(ds.fileInput?.fetchSettings?.fetchUri);
    const p = ds.primaryProductDataSource || {};
    return uri === expectedUri || text(p.feedLabel).toUpperCase() === market.feedLabel;
  });

  if (!marketSources.length) {
    findings.push(
      finding(
        'FAIL',
        'datasource',
        `Нет primary feed для ${market.code} (ожидали spreadsheet ${expectedUri || market.spreadsheetId})`,
        'MC → Products → Feeds → Add primary feed → Google Sheets'
      )
    );
  }

  for (const ds of marketSources) {
    const p = ds.primaryProductDataSource || {};
    const uri = text(ds.fileInput?.fetchSettings?.fetchUri);
    const labelOk = text(p.feedLabel).toUpperCase() === market.feedLabel;
    const langOk = text(p.contentLanguage).toLowerCase() === market.contentLanguage.toLowerCase();
    const countries = (p.countries || []).map((c) => text(c).toUpperCase());
    const countriesOk =
      market.targetCountries.every((c) => countries.includes(c)) &&
      countries.length === market.targetCountries.length;

    findings.push(
      finding(
        labelOk ? 'OK' : 'FAIL',
        'datasource',
        `${ds.displayName} (${ds.dataSourceId}): feedLabel=${p.feedLabel || '?'} (need ${market.feedLabel})`,
        labelOk
          ? ''
          : 'feedLabel нельзя сменить через API — удалите фид и создайте заново с feedLabel RO'
      )
    );
    findings.push(
      finding(
        langOk ? 'OK' : 'FAIL',
        'datasource',
        `${ds.displayName}: contentLanguage=${p.contentLanguage || '?'} (need ${market.contentLanguage})`,
        langOk ? '' : 'Язык фида задаётся только при создании primary feed'
      )
    );
    findings.push(
      finding(
        countriesOk ? 'OK' : 'WARN',
        'datasource',
        `${ds.displayName}: countries=${countries.join(',') || '?'} (need ${market.targetCountries.join(',')})`,
        countriesOk ? '' : `MC → Edit feed → target countries только ${market.targetCountries.join(', ')}`
      )
    );
    findings.push(
      finding(
        uri === expectedUri ? 'OK' : 'WARN',
        'datasource',
        `${ds.displayName}: fetchUri=${uri || '?'}`,
        uri === expectedUri ? '' : `Привяжите таблицу ${expectedUri}`
      )
    );
  }

  const homepage = await merchantFetch(`/accounts/v1/accounts/${merchantId}/homepage`);
  const claimedHost = hostFromUrl(homepage.uri);
  const marketHost = hostFromUrl(market.siteOrigin);
  if (homepage.claimed && claimedHost === marketHost) {
    findings.push(finding('OK', 'homepage', `Claimed: ${homepage.uri}`));
  } else {
    findings.push(
      finding(
        'FAIL',
        'homepage',
        `Claimed homepage: ${homepage.uri || '?'} — товары ${market.code} ведут на ${market.siteOrigin}`,
        `MC → Business info → Website → Claim ${market.siteOrigin}`
      )
    );
  }

  const shipping = await merchantFetch(`/accounts/v1/accounts/${merchantId}/shippingSettings`);
  for (const country of market.targetCountries) {
    const svc = (shipping.services || []).find((s) =>
      (s.deliveryCountries || []).includes(country)
    );
    if (!svc) {
      findings.push(
        finding(
          'FAIL',
          'shipping',
          `Нет доставки для ${country}`,
          `npm run merchant:api:market-shipping -- --market=${market.code} --apply`
        )
      );
      continue;
    }
    const flat = svc.rateGroups?.[0]?.singleValue?.flatRate;
    const curOk = text(flat?.currencyCode).toUpperCase() === market.currency;
    findings.push(
      finding(
        curOk ? 'OK' : 'FAIL',
        'shipping',
        `${svc.serviceName}: ${country} flat ${flat ? Number(flat.amountMicros) / 1e6 : '?'} ${flat?.currencyCode || '?'}`,
        curOk ? '' : `Валюта доставки должна быть ${market.currency}`
      )
    );
  }

  const products = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '250' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/products/v1/accounts/${merchantId}/products?${q}`);
  });

  const marketProducts = products.filter(
    (p) => text(p.feedLabel).toUpperCase() === market.feedLabel
  );
  const wrongLabelFromSheet = products.filter((p) => {
    const uri = expectedUri;
    if (!uri) return false;
    const ds = marketSources.find((d) => text(d.fileInput?.fetchSettings?.fetchUri) === uri);
    if (!ds) return false;
    return text(p.feedLabel).toUpperCase() !== market.feedLabel;
  });

  if (marketProducts.length) {
    const approved = marketProducts.filter((p) =>
      (p.productStatus?.destinationStatuses || []).some(
        (d) => text(d.status) === 'APPROVED' || text(d.approvedCountriesCount)
      )
    );
    findings.push(
      finding(
        marketProducts.length === sheet.sheetRows ? 'OK' : 'WARN',
        'catalog',
        `MC feedLabel=${market.feedLabel}: ${marketProducts.length} products (sheet ${sheet.sheetRows})`
      )
    );
    const issues = summarizeIssues(marketProducts);
    if (issues.length) {
      findings.push(
        finding(
          'WARN',
          'catalog',
          `Top issues: ${issues
            .slice(0, 5)
            .map(([k, n]) => `${k}×${n}`)
            .join(', ')}`,
          'MC → Products → Diagnostics'
        )
      );
    }
  } else if (wrongLabelFromSheet.length) {
    findings.push(
      finding(
        'FAIL',
        'catalog',
        `Таблица RO импортирована, но ${wrongLabelFromSheet.length} товаров с feedLabel=${wrongLabelFromSheet[0]?.feedLabel} / lang=${wrongLabelFromSheet[0]?.contentLanguage} вместо ${market.feedLabel}/${market.contentLanguage}`,
        'Пересоздайте primary feed с feedLabel RO и языком ro'
      )
    );
    const issues = summarizeIssues(wrongLabelFromSheet);
    if (issues.length) {
      findings.push(
        finding(
          'FAIL',
          'catalog',
          `Ошибки импорта: ${issues
            .slice(0, 6)
            .map(([k, n]) => `${k}×${n}`)
            .join(', ')}`
        )
      );
    }
  } else {
    findings.push(
      finding(
        'FAIL',
        'catalog',
        `В MC нет товаров feedLabel=${market.feedLabel}`,
        `MC → ${marketSources[0]?.displayName || 'feed'} → Update`
      )
    );
  }

  const order = { FAIL: 0, WARN: 1, MANUAL: 2, OK: 3 };
  findings.sort((a, b) => order[a.level] - order[b.level] || a.area.localeCompare(b.area));
  const counts = { FAIL: 0, WARN: 0, MANUAL: 0, OK: 0 };
  console.log('\n[GGL] Findings:');
  for (const f of findings) {
    counts[f.level] += 1;
    console.log(`  [${f.level}] ${f.area}: ${f.message}`);
    if (f.action) console.log(`        → ${f.action}`);
  }
  console.log(
    `\n[GGL] Summary: FAIL=${counts.FAIL} WARN=${counts.WARN} MANUAL=${counts.MANUAL} OK=${counts.OK}`
  );

  process.exitCode = counts.FAIL > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
