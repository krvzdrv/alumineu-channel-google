/**
 * [GGL] Merchant Center market profiles — one site + one primary feed per market.
 */
const fs = require('fs');
const path = require('path');

function text(v) {
  return String(v == null ? '' : v).trim();
}

function envNum(name, fallback) {
  const raw = text(process.env[name]);
  if (!raw) return fallback;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** @typedef {object} MerchantMarket */
const MARKETS = {
  PL: {
    code: 'PL',
    feedLabel: 'PL',
    merchantAccountId: '5785188396',
    contentLanguage: 'pl',
    targetCountries: ['PL'],
    siteOrigin: 'https://alumineu.pl',
    linkRewriteFromHost: 'alumineu.pl',
    currency: 'PLN',
    sheetName: 'Alumineu Merchant — PL',
    spreadsheetId: '1M0VnJVUuOSgrka1EoQwkDK7W2usp3qM1V951DPjO1rw',
    metaCsvPath: 'feeds/google_merchant_from_meta_pl.csv',
    metaCsvFallbackPath: '',
    tildaCsvPath: 'feeds/tilda-store-export.csv',
    supportUri: 'https://alumineu.pl/kontakt',
    returnsPolicyUri: 'https://alumineu.pl/wysylka-i-zwrot',
    shippingServiceName: 'Dostawa PL',
    shippingFlatRate: 50,
    plnToLocalRate: 1,
    timezone: 'Europe/Warsaw',
    minTransitDays: 1,
    maxTransitDays: 3
  },
  DE: {
    code: 'DE',
    feedLabel: 'DE',
    merchantAccountId: '5798257792',
    contentLanguage: 'de',
    targetCountries: ['DE'],
    siteOrigin: 'https://alumineu.de',
    linkRewriteFromHost: 'alumineu.de',
    currency: 'EUR',
    sheetName: 'Alumineu Merchant — DE',
    spreadsheetId: '1-a8S1X6JHgxvPYYiYu3tGocBLKgS-HzZrR5HXMpVbDs',
    sheetGid: '2043783323',
    metaCsvPath: 'feeds/google_merchant_from_meta_de.csv',
    metaCsvFallbackPath: '',
    tildaCsvPath: 'feeds/tilda-store-export-de.csv',
    supportUri: 'https://alumineu.de/kontakt',
    returnsPolicyUri: 'https://alumineu.de/versand-und-ruckgabe',
    shippingServiceName: 'Versand DE',
    shippingFlatRate: 9.99,
    plnToLocalRate: 0.23,
    timezone: 'Europe/Berlin',
    minTransitDays: 2,
    maxTransitDays: 5
  },
  RO: {
    code: 'RO',
    feedLabel: 'RO',
    merchantAccountId: '5798002953',
    contentLanguage: 'ro',
    targetCountries: ['RO'],
    siteOrigin: 'https://alumineu.ro',
    linkRewriteFromHost: 'alumineu.ro',
    currency: 'RON',
    sheetName: 'Alumineu Merchant — RO',
    spreadsheetId: '1ARpPpYbjeBbdFOFnfIpLU4GVcToZRR5Hm_EtQ3cMhAo',
    sheetGid: '2043783323',
    metaCsvPath: 'feeds/google_merchant_from_meta_ro.csv',
    metaCsvFallbackPath: '',
    tildaCsvPath: 'feeds/tilda-store-export-ro.csv',
    supportUri: 'https://alumineu.ro/kontakt',
    returnsPolicyUri: 'https://alumineu.ro/expediere-si-returnare',
    shippingServiceName: 'Livrare RO',
    shippingFlatRate: 49,
    plnToLocalRate: 1.15,
    timezone: 'Europe/Bucharest',
    minTransitDays: 2,
    maxTransitDays: 5
  },
  EU: {
    code: 'EU',
    feedLabel: 'EU',
    merchantAccountId: '5798434120',
    contentLanguage: 'en',
    /** EU-27 minus PL/DE/RO + UK and EFTA where we ship from alumineu.com. */
    targetCountries: [
      'AT',
      'BE',
      'BG',
      'CH',
      'CY',
      'CZ',
      'DK',
      'EE',
      'ES',
      'FI',
      'FR',
      'GB',
      'GR',
      'HR',
      'HU',
      'IE',
      'IT',
      'LT',
      'LU',
      'LV',
      'MT',
      'NL',
      'NO',
      'PT',
      'SE',
      'SI',
      'SK'
    ],
    siteOrigin: 'https://alumineu.com',
    linkRewriteFromHost: 'alumineu.com',
    currency: 'EUR',
    sheetName: 'Alumineu Merchant — EU',
    spreadsheetId: '1k4TRMh1nok24hKqK-4bDVmptHT5ZF7TrUL6JNoRRhr8',
    sheetGid: '2043783323',
    metaCsvPath: 'feeds/google_merchant_from_meta_eu.csv',
    metaCsvFallbackPath: '',
    tildaCsvPath: 'feeds/tilda-store-export-eu.csv',
    supportUri: 'https://alumineu.com/contact',
    returnsPolicyUri: 'https://alumineu.com/shipping-and-returns',
    shippingServiceName: 'Shipping EU',
    shippingFlatRate: 14.99,
    plnToLocalRate: 0.23,
    timezone: 'Europe/Berlin',
    minTransitDays: 3,
    maxTransitDays: 7
  },
  NL: {
    code: 'NL',
    feedLabel: 'NL',
    merchantAccountId: '5849784515',
    contentLanguage: 'nl',
    targetCountries: ['NL'],
    siteOrigin: 'https://alumineu.nl',
    linkRewriteFromHost: 'alumineu.nl',
    currency: 'EUR',
    sheetName: '',
    metaCsvPath: '',
    metaCsvFallbackPath: '',
    tildaCsvPath: '',
    supportUri: 'https://alumineu.nl/contact',
    returnsPolicyUri: 'https://alumineu.nl/retour',
    shippingServiceName: 'Verzending NL',
    shippingFlatRate: 9.99,
    plnToLocalRate: 0.23,
    timezone: 'Europe/Amsterdam',
    minTransitDays: 2,
    maxTransitDays: 5
  },
  FR: {
    code: 'FR',
    feedLabel: 'FR',
    merchantAccountId: '5849001558',
    contentLanguage: 'fr',
    targetCountries: ['FR'],
    siteOrigin: 'https://alumineu.fr',
    linkRewriteFromHost: 'alumineu.fr',
    currency: 'EUR',
    sheetName: '',
    metaCsvPath: '',
    metaCsvFallbackPath: '',
    tildaCsvPath: '',
    supportUri: 'https://alumineu.fr/contact',
    returnsPolicyUri: 'https://alumineu.fr/retour',
    shippingServiceName: 'Livraison FR',
    shippingFlatRate: 14.99,
    plnToLocalRate: 0.23,
    timezone: 'Europe/Paris',
    minTransitDays: 3,
    maxTransitDays: 7
  },
  ES: {
    code: 'ES',
    feedLabel: 'ES',
    merchantAccountId: '5849001567',
    contentLanguage: 'es',
    targetCountries: ['ES'],
    siteOrigin: 'https://alumineu.es',
    linkRewriteFromHost: 'alumineu.es',
    currency: 'EUR',
    sheetName: '',
    metaCsvPath: '',
    metaCsvFallbackPath: '',
    tildaCsvPath: '',
    supportUri: 'https://alumineu.es/contacto',
    returnsPolicyUri: 'https://alumineu.es/devolucion',
    shippingServiceName: 'Envío ES',
    shippingFlatRate: 14.99,
    plnToLocalRate: 0.23,
    timezone: 'Europe/Madrid',
    minTransitDays: 3,
    maxTransitDays: 7
  }
};

function listMarketCodes() {
  return Object.keys(MARKETS);
}

function resolveMarketCode(argv = process.argv) {
  const envCode = text(process.env.MERCHANT_MARKET).toUpperCase();
  if (envCode) return envCode === 'COM' ? 'EU' : envCode;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--market=')) {
      const code = text(a.slice(9)).toUpperCase();
      return code === 'COM' ? 'EU' : code;
    }
    if (a === '--market' && argv[i + 1]) {
      const code = text(argv[i + 1]).toUpperCase();
      return code === 'COM' ? 'EU' : code;
    }
  }
  return 'PL';
}

function wasMarketExplicit(argv) {
  if (text(process.env.MERCHANT_MARKET)) return true;
  if (!Array.isArray(argv)) return false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--market=')) return true;
    if (a === '--market' && argv[i + 1]) return true;
  }
  return false;
}

/** @returns {MerchantMarket} */
function resolveMarket(argvOrCode) {
  const argv = Array.isArray(argvOrCode) ? argvOrCode : process.argv;
  const code =
    typeof argvOrCode === 'string'
      ? text(argvOrCode).toUpperCase()
      : resolveMarketCode(argv);
  const base = MARKETS[code];
  if (!base) {
    throw new Error(
      `Unknown MERCHANT_MARKET="${code}". Supported: ${listMarketCodes().join(', ')}`
    );
  }

  const explicit = wasMarketExplicit(argv);
  const plnToEur = envNum('MERCHANT_PLN_TO_EUR', MARKETS.DE.plnToLocalRate);
  const plnToRon = envNum('MERCHANT_PLN_TO_RON', MARKETS.RO.plnToLocalRate);

  const market = { ...base };
  if (code === 'DE' || code === 'EU') market.plnToLocalRate = plnToEur;
  if (code === 'RO') market.plnToLocalRate = plnToRon;

  const flatOverride = text(process.env.MERCHANT_SHIPPING_FLAT_RATE);
  if (flatOverride !== '') {
    const n = Number(flatOverride.replace(',', '.'));
    if (Number.isFinite(n)) market.shippingFlatRate = n;
  }

  if (!explicit) {
    const sheetOverride = text(process.env.MERCHANT_OUTPUT_SHEET_NAME);
    if (sheetOverride) market.sheetName = sheetOverride;

    const metaOverride = text(process.env.META_CSV_PATH);
    if (metaOverride) market.metaCsvPath = metaOverride;

    const tildaOverride = text(process.env.MERCHANT_TILDA_CSV_PATH);
    if (tildaOverride) market.tildaCsvPath = tildaOverride;
  }

  return market;
}

function applyMarketToEnv(market, env = process.env) {
  env.MERCHANT_MARKET = market.code;
  env.MERCHANT_OUTPUT_SHEET_NAME = market.sheetName;
  env.META_CSV_PATH = market.metaCsvPath;
  env.MERCHANT_TILDA_CSV_PATH = market.tildaCsvPath;
  env.MERCHANT_FEED_LABEL = market.feedLabel;
  env.MERCHANT_CONTENT_LANGUAGE = market.contentLanguage;
  env.MERCHANT_TARGET_COUNTRIES = market.targetCountries.join(',');
  env.MERCHANT_SITE_ORIGIN = market.siteOrigin;
  env.MERCHANT_CURRENCY = market.currency;
  env.MERCHANT_SUPPORT_URI = market.supportUri;
  env.MERCHANT_SHIPPING_SERVICE_NAME = market.shippingServiceName;
  env.MERCHANT_SHIPPING_FLAT_RATE = String(market.shippingFlatRate);
  env.MERCHANT_SHIPPING_MIN_TRANSIT_DAYS = String(market.minTransitDays);
  env.MERCHANT_SHIPPING_MAX_TRANSIT_DAYS = market.maxTransitDays;
}

function resolveMetaCsvPath(repoRoot, market) {
  const primary = path.resolve(repoRoot, market.metaCsvPath);
  if (fs.existsSync(primary)) {
    return { csvPath: primary, usedFallback: false };
  }
  const fallbackRel = text(market.metaCsvFallbackPath);
  if (fallbackRel) {
    const fallback = path.resolve(repoRoot, fallbackRel);
    if (fs.existsSync(fallback)) {
      return { csvPath: fallback, usedFallback: true, fallbackRel };
    }
  }
  return { csvPath: primary, usedFallback: false, missing: true };
}

function hostOnly(urlish) {
  try {
    return new URL(urlish.startsWith('http') ? urlish : `https://${urlish}`).hostname.replace(
      /^www\./i,
      ''
    );
  } catch {
    return text(urlish).replace(/^www\./i, '');
  }
}

function rewriteLinkForMarket(link, market) {
  const raw = text(link);
  if (!raw || !market?.siteOrigin) return raw;
  try {
    const parsed = new URL(raw);
    const fromHost = hostOnly(market.linkRewriteFromHost || 'alumineu.pl');
    if (hostOnly(parsed.href) !== fromHost) return raw;
    parsed.hostname = hostOnly(market.siteOrigin);
    return parsed.toString();
  } catch {
    return raw;
  }
}

function parsePriceAmount(raw) {
  const m = text(raw).match(/^([\d.,]+)\s*([A-Za-z]{3})?$/);
  if (!m) return null;
  const amount = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(amount)) return null;
  return { amount, currency: text(m[2] || 'PLN').toUpperCase() };
}

function formatMerchantPrice(amount, currency) {
  const n = Math.round(Number(amount) * 100) / 100;
  return `${n.toFixed(2)} ${currency}`;
}

function convertPriceCell(priceRaw, market) {
  const raw = text(priceRaw);
  if (!raw) return raw;
  const parsed = parsePriceAmount(raw);
  if (!parsed) return raw;
  const target = market.currency.toUpperCase();
  if (parsed.currency === target) return formatMerchantPrice(parsed.amount, target);
  if (parsed.currency === 'PLN' && market.plnToLocalRate && target !== 'PLN') {
    return formatMerchantPrice(parsed.amount * market.plnToLocalRate, target);
  }
  return raw;
}

function applyMarketTransformToMatrix(valuesMatrix, headers, market) {
  const linkIx = colIdx(headers, 'link');
  const priceIx = colIdx(headers, 'price');
  const saleIx = colIdx(headers, 'sale price');
  let links = 0;
  let prices = 0;
  let salePrices = 0;

  for (const row of valuesMatrix) {
    if (linkIx >= 0) {
      const next = rewriteLinkForMarket(row[linkIx], market);
      if (next !== text(row[linkIx])) {
        row[linkIx] = next;
        links += 1;
      }
    }
    if (priceIx >= 0) {
      const next = convertPriceCell(row[priceIx], market);
      if (next !== text(row[priceIx])) {
        row[priceIx] = next;
        prices += 1;
      }
    }
    if (saleIx >= 0 && text(row[saleIx])) {
      const next = convertPriceCell(row[saleIx], market);
      if (next !== text(row[saleIx])) {
        row[saleIx] = next;
        salePrices += 1;
      }
    }
  }

  return { links, prices, salePrices };
}

function colIdx(headers, name) {
  const want = text(name).toLowerCase();
  return headers.findIndex((h) => text(h).toLowerCase() === want);
}

function buildShippingService(market, templateService) {
  const svc = templateService ? JSON.parse(JSON.stringify(templateService)) : {};
  svc.serviceName = market.shippingServiceName;
  svc.active = true;
  svc.deliveryCountries = [...market.targetCountries];
  svc.currencyCode = market.currency;
  svc.shipmentType = svc.shipmentType || 'DELIVERY';
  svc.deliveryTime = svc.deliveryTime || {};
  svc.deliveryTime.minTransitDays = market.minTransitDays;
  svc.deliveryTime.maxTransitDays = market.maxTransitDays;
  if (market.timezone) {
    svc.deliveryTime.cutoffTime = svc.deliveryTime.cutoffTime || {
      hour: 14,
      minute: 0,
      timeZone: market.timezone
    };
    svc.deliveryTime.cutoffTime.timeZone = market.timezone;
  }
  svc.rateGroups = svc.rateGroups || [{}];
  svc.rateGroups[0] = svc.rateGroups[0] || {};
  svc.rateGroups[0].singleValue = {
    flatRate: {
      amountMicros: String(Math.round(market.shippingFlatRate * 1_000_000)),
      currencyCode: market.currency
    }
  };
  return svc;
}

function mergeShippingServices(existingServices, marketServices) {
  const byName = new Map((existingServices || []).map((s) => [text(s.serviceName), s]));
  for (const svc of marketServices) {
    byName.set(text(svc.serviceName), svc);
  }
  return [...byName.values()];
}

async function resolveSpreadsheetIdForMarket(market, auth) {
  const perMarket = text(process.env[`GOOGLE_MERCHANT_SPREADSHEET_ID_${market.code}`]);
  if (perMarket) return perMarket;
  if (text(market.spreadsheetId)) return market.spreadsheetId;

  const explicit = text(process.env.GOOGLE_MERCHANT_SPREADSHEET_ID);
  if (explicit) return explicit;

  const scriptId = text(process.env.GOOGLE_SCRIPT_ID);
  if (scriptId && auth) {
    const { google } = require('googleapis');
    const scriptApi = google.script({ version: 'v1', auth });
    const res = await scriptApi.projects.get({ scriptId });
    const parentId = res.data.parentId;
    if (!parentId) throw new Error('GOOGLE_SCRIPT_ID resolved no parentId (bind script to spreadsheet)');
    console.warn('[GGL] Using spreadsheet id from GOOGLE_SCRIPT_ID parentId:', parentId);
    return parentId;
  }

  throw new Error(
    `Set spreadsheet for ${market.code}: GOOGLE_MERCHANT_SPREADSHEET_ID_${market.code} or spreadsheetId in merchant-markets.js`
  );
}

module.exports = {
  MARKETS,
  listMarketCodes,
  resolveMarket,
  resolveMarketCode,
  applyMarketToEnv,
  resolveMetaCsvPath,
  resolveSpreadsheetIdForMarket,
  rewriteLinkForMarket,
  convertPriceCell,
  applyMarketTransformToMatrix,
  buildShippingService,
  mergeShippingServices
};
