#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Push Meta catalog CSV (or pre-built Merchant CSV) into a Google Sheet tab.
 *
 * Aligns with official Google Merchant Center spreadsheet template (RU):
 * - Row 1: attribute headers
 * - Row 2: column hints (restored from snapshot unless MERCHANT_RESTORE_HINT_ROWS=0)
 * - Rows 3–5 of the official template: deleted on apply (not blanked) so they do not exist in the sheet / MC feed
 * - After first apply: products start at row 3 (header + hints + data); re-runs detect this layout
 *
 * Auth: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, token.json (spreadsheets scope).
 *
 * Usage:
 *   node scripts/sync-merchant-sheet-from-meta.js --dry-run
 *   node scripts/sync-merchant-sheet-from-meta.js --apply
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
const {
  resolveMarket,
  resolveMetaCsvPath,
  applyMarketTransformToMatrix,
  resolveSpreadsheetIdForMarket
} = require('./lib/merchant-markets');

const AVAIL_MAP = {
  'in stock': 'in_stock',
  'out of stock': 'out_of_stock',
  preorder: 'preorder',
  backorder: 'backorder'
};

/** Hint row in official template points user to delete rows 2–5 before linking to MC. */
const DELETE_ROWS_HINT_RE =
  /Удалите строки\s*2[\u2013\-–]5/i;
const DELETE_ROWS_HINT_EN_RE = /Delete\s+rows\s*2[\u2013\-–\-]5/i;

function text(v) {
  return String(v == null ? '' : v).trim();
}

/** Merchant feed brand — lowercase alumineu (override via MERCHANT_BRAND). */
function merchantBrand(raw) {
  const override = text(process.env.MERCHANT_BRAND);
  if (override) return override;
  const b = text(raw);
  if (!b || /^alumineu$/i.test(b)) return 'alumineu';
  return b;
}

function truncate(s, max) {
  const t = text(s);
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, Math.max(0, max - 1))}…`;
}

function normAvail(raw) {
  const key = text(raw).toLowerCase();
  return AVAIL_MAP[key] || key.replace(/\s+/g, '_');
}

const VALID_AVAILABILITY = new Set(['in_stock', 'out_of_stock', 'preorder', 'backorder']);
const VALID_CONDITION = new Set(['new', 'refurbished', 'used']);
const VALID_YES_NO = new Set(['yes', 'no', '']);

function normYesNo(raw) {
  const v = text(raw).toLowerCase();
  if (!v) return '';
  if (v === 'y' || v === 'true' || v === '1') return 'yes';
  if (v === 'n' || v === 'false' || v === '0') return 'no';
  return v;
}

function normCondition(raw) {
  const v = text(raw).toLowerCase();
  if (!v) return 'new';
  return VALID_CONDITION.has(v) ? v : v.replace(/\s+/g, '_');
}

/** Normalize enum columns to Google Merchant / Sheets validation lists. */
function normalizeMerchantFeedValuesInMatrix(matrix, headers) {
  const ix = {
    availability: colIdx(headers, 'availability'),
    condition: colIdx(headers, 'condition'),
    idExists: colIdx(headers, 'identifier exists'),
    adult: colIdx(headers, 'adult'),
    gpc: colIdx(headers, 'google product category')
  };
  const stats = { availability: 0, condition: 0, idExists: 0, adult: 0, gpc: 0 };
  for (const row of matrix) {
    if (ix.availability >= 0) {
      const next = normAvail(row[ix.availability]);
      if (text(row[ix.availability]) !== next) {
        row[ix.availability] = next;
        stats.availability += 1;
      }
    }
    if (ix.condition >= 0) {
      const next = normCondition(row[ix.condition]);
      if (text(row[ix.condition]) !== next) {
        row[ix.condition] = next;
        stats.condition += 1;
      }
    }
    if (ix.idExists >= 0) {
      const next = normYesNo(row[ix.idExists]) || 'no';
      if (text(row[ix.idExists]) !== next) {
        row[ix.idExists] = next;
        stats.idExists += 1;
      }
    }
    if (ix.adult >= 0) {
      const next = normYesNo(row[ix.adult]);
      if (text(row[ix.adult]) !== next) {
        row[ix.adult] = next;
        stats.adult += 1;
      }
    }
    if (ix.gpc >= 0) {
      const next = normalizeGoogleProductCategory(row[ix.gpc]);
      if (text(row[ix.gpc]) !== next) {
        row[ix.gpc] = next;
        stats.gpc += 1;
      }
    }
  }
  return stats;
}

function columnLetter(colNum) {
  let n = colNum;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m - 1) / 26);
  }
  return s;
}

function parseArgs(argv) {
  let apply = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') apply = true;
    if (argv[i] === '--dry-run') apply = false;
  }
  return { apply, market: resolveMarket(argv) };
}

async function authorize(repoRoot) {
  const oauth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );
  const tokenPath = path.join(repoRoot, 'token.json');
  if (!fs.existsSync(tokenPath)) {
    throw new Error(
      `Missing token.json at ${tokenPath}. Copy from alumineu-finance-ops or obtain OAuth token with spreadsheets scope.`
    );
  }
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  oauth.setCredentials(token);
  return oauth;
}

async function resolveSpreadsheetId(auth, market) {
  if (market) return resolveSpreadsheetIdForMarket(market, auth);
  const explicit = text(process.env.GOOGLE_MERCHANT_SPREADSHEET_ID);
  if (explicit) return explicit;

  const scriptId = text(process.env.GOOGLE_SCRIPT_ID);
  if (scriptId) {
    const scriptApi = google.script({ version: 'v1', auth });
    const res = await scriptApi.projects.get({ scriptId });
    const parentId = res.data.parentId;
    if (!parentId) throw new Error('GOOGLE_SCRIPT_ID resolved no parentId (bind script to spreadsheet)');
    console.warn('[GGL] Using spreadsheet id from GOOGLE_SCRIPT_ID parentId:', parentId);
    return parentId;
  }

  throw new Error('Set GOOGLE_MERCHANT_SPREADSHEET_ID (recommended) or GOOGLE_SCRIPT_ID bound to the workbook');
}

function loadCsvGrid(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const filtered = raw.split(/\r?\n/).filter((line) => !line.startsWith('#')).join('\n');
  const rows = parse(filtered, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  });
  if (!rows.length) throw new Error('CSV has no rows');
  return rows;
}

function loadMetaObjects(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const filtered = raw.split(/\r?\n/).filter((line) => !line.startsWith('#')).join('\n');
  return parse(filtered, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  });
}

/** Normalize product page URL for matching Tilda export (strip query/editionuid). */
function normalizeProductUrl(raw) {
  const u = text(raw);
  if (!u) return '';
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return u.split('?')[0].replace(/\/$/, '').toLowerCase();
  }
}

function parseTildaPhotoUrls(photoRaw) {
  const urls = text(photoRaw)
    .split(/\s+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u) && /static\.tildacdn\.com/i.test(u));
  return urls;
}

function photosFromTildaUrls(urls) {
  const unique = [...new Set(urls.filter((u) => /static\.tildacdn\.com/i.test(u)))];
  if (!unique.length) return null;
  return {
    primary: unique[0],
    additional: unique.slice(1).join(', ')
  };
}

function mergePhotoPacks(packs) {
  const urls = [];
  for (const pack of packs) {
    if (!pack) continue;
    if (pack.primary) urls.push(pack.primary);
    if (pack.additional) {
      urls.push(
        ...pack.additional
          .split(/[,;]+/)
          .map((u) => u.trim())
          .filter(Boolean)
      );
    }
  }
  return photosFromTildaUrls(urls);
}

/**
 * [GGL] Tilda store CSV (semicolon): photos + per-variant Url/editionuid + title parsing.
 */
function loadTildaStoreIndex(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    delimiter: ';'
  });
  const byExternalIdUrls = new Map();
  const byUrlUrls = new Map();
  const variantByExternalId = new Map();
  let rowsWithPhoto = 0;

  for (const row of rows) {
    const extId = text(row['External ID']);
    if (extId) variantByExternalId.set(extId, row);

    const urls = parseTildaPhotoUrls(row.Photo);
    if (!urls.length) continue;
    rowsWithPhoto += 1;
    if (extId) {
      if (!byExternalIdUrls.has(extId)) byExternalIdUrls.set(extId, new Set());
      for (const u of urls) byExternalIdUrls.get(extId).add(u);
    }
    const urlKey = normalizeProductUrl(row.Url);
    if (urlKey) {
      if (!byUrlUrls.has(urlKey)) byUrlUrls.set(urlKey, new Set());
      for (const u of urls) byUrlUrls.get(urlKey).add(u);
    }
  }

  const byExternalId = new Map();
  for (const [id, set] of byExternalIdUrls) {
    const pack = photosFromTildaUrls([...set]);
    if (pack) byExternalId.set(id, pack);
  }
  const byUrl = new Map();
  for (const [urlKey, set] of byUrlUrls) {
    const pack = photosFromTildaUrls([...set]);
    if (pack) byUrl.set(urlKey, pack);
  }

  return {
    byExternalId,
    byUrl,
    variantByExternalId,
    rowsWithPhoto,
    externalIds: byExternalId.size,
    urls: byUrl.size,
    variantRows: variantByExternalId.size
  };
}

/** @deprecated alias */
function loadTildaPhotoIndex(csvPath) {
  return loadTildaStoreIndex(csvPath);
}

function resolveTildaPhotos(metaRow, tildaIndex) {
  if (!tildaIndex) return null;
  return mergePhotoPacks([
    tildaIndex.byExternalId.get(text(metaRow.id)),
    tildaIndex.byUrl.get(normalizeProductUrl(metaRow.link))
  ]);
}

function applyTildaPhotosToDict(dict, metaRow, tildaIndex) {
  const photos = resolveTildaPhotos(metaRow, tildaIndex);
  if (!photos) return false;
  dict['image link'] = photos.primary;
  dict['additional image link'] = photos.additional || '';
  return true;
}

/** Normalize brand column in sheet matrix (works for Meta and pre-built Merchant CSV). */
function applyMerchantBrandToMatrix(valuesMatrix, headers) {
  const brandIx = colIdx(headers, 'brand');
  if (brandIx < 0 || !valuesMatrix.length) return 0;
  let updated = 0;
  for (const row of valuesMatrix) {
    const next = merchantBrand(row[brandIx]);
    if (text(row[brandIx]) !== next) {
      row[brandIx] = next;
      updated += 1;
    }
  }
  return updated;
}

/** Patch image columns in sheet matrix (works for Meta and pre-built Merchant CSV). */
function applyTildaPhotosToMatrix(valuesMatrix, headers, tildaIndex) {
  if (!tildaIndex || !valuesMatrix.length) return 0;
  const idIx = colIdx(headers, 'id');
  const linkIx = colIdx(headers, 'link');
  const imageIx = colIdx(headers, 'image link');
  const addIx = colIdx(headers, 'additional image link');
  if (idIx < 0 || imageIx < 0) {
    console.warn('[GGL] Cannot apply Tilda photos — missing id or image link column in sheet headers');
    return 0;
  }
  let matched = 0;
  for (const row of valuesMatrix) {
    const pseudo = {
      id: row[idIx],
      link: linkIx >= 0 ? row[linkIx] : ''
    };
    const photos = resolveTildaPhotos(pseudo, tildaIndex);
    if (!photos) continue;
    row[imageIx] = photos.primary;
    if (addIx >= 0) row[addIx] = photos.additional || '';
    matched += 1;
  }
  return matched;
}

function variantKeyFromRow(row, headers) {
  const linkIx = colIdx(headers, 'link');
  const colorIx = colIdx(headers, 'color');
  const sizeIx = colIdx(headers, 'size');
  const idIx = colIdx(headers, 'id');
  const rawLink = linkIx >= 0 ? text(row[linkIx]) : '';
  const link = rawLink.includes('editionuid=') ? rawLink.toLowerCase() : normalizeProductUrl(rawLink);
  const color = colorIx >= 0 ? text(row[colorIx]).toLowerCase() : '';
  const size = sizeIx >= 0 ? text(row[sizeIx]).toLowerCase() : '';
  const id = idIx >= 0 ? text(row[idIx]) : '';
  return `${link}|${color}|${size}|${id}`;
}

function rowDedupeScore(row, headers, tildaIndex, mcState) {
  const idIx = colIdx(headers, 'id');
  const imageIx = colIdx(headers, 'image link');
  const addIx = colIdx(headers, 'additional image link');
  const id = idIx >= 0 ? text(row[idIx]) : '';
  let score = 0;
  if (mcState?.active?.has(id)) score += 100;
  if (mcState?.archived?.has(id)) score -= 200;
  if (tildaIndex?.byExternalId?.has(id)) score += 50;
  const linkIx = colIdx(headers, 'link');
  if (linkIx >= 0 && tildaIndex?.byUrl?.has(normalizeProductUrl(row[linkIx]))) score += 10;
  const image = imageIx >= 0 ? text(row[imageIx]) : '';
  const additional = addIx >= 0 ? text(row[addIx]) : '';
  if (image && !/drive\.google\.com/i.test(image)) score += 5;
  if (additional && !/drive\.google\.com/i.test(additional)) score += 3;
  return score;
}

/**
 * One offer id per variant (link pathname + color + size). Keeps highest-scored row.
 */
function dedupeMerchantMatrixByVariant(valuesMatrix, headers, tildaIndex, mcState) {
  const idIx = colIdx(headers, 'id');
  const titleIx = colIdx(headers, 'title');
  const groups = new Map();
  for (const row of valuesMatrix) {
    const key = variantKeyFromRow(row, headers);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const kept = [];
  const dropped = [];
  for (const rows of groups.values()) {
    rows.sort(
      (a, b) =>
        rowDedupeScore(b, headers, tildaIndex, mcState) -
          rowDedupeScore(a, headers, tildaIndex, mcState) ||
        text(idIx >= 0 ? a[idIx] : '').localeCompare(text(idIx >= 0 ? b[idIx] : ''))
    );
    kept.push(rows[0]);
    dropped.push(...rows.slice(1));
  }
  kept.sort((a, b) =>
    text(titleIx >= 0 ? a[titleIx] : '').localeCompare(text(titleIx >= 0 ? b[titleIx] : ''))
  );
  return { kept, dropped, groups: groups.size };
}

function stripDriveAdditionalImages(valuesMatrix, headers) {
  const imageIx = colIdx(headers, 'image link');
  const addIx = colIdx(headers, 'additional image link');
  let mainFixed = 0;
  let addFixed = 0;
  let addKeptTilda = 0;

  for (const row of valuesMatrix) {
    if (imageIx >= 0) {
      const img = text(row[imageIx]);
      if (img && /drive\.google\.com/i.test(img)) {
        row[imageIx] = '';
        mainFixed += 1;
      }
    }
    if (addIx < 0) continue;
    const raw = text(row[addIx]);
    if (!raw) continue;
    const kept = raw
      .split(/[,;]+/)
      .map((u) => u.trim())
      .filter((u) => u && /static\.tildacdn\.com/i.test(u) && !/drive\.google\.com/i.test(u));
    if (kept.length) addKeptTilda += 1;
    if (kept.join(', ') !== raw) {
      row[addIx] = kept.join(', ');
      addFixed += 1;
    }
  }

  return { mainFixed, addFixed, addKeptTilda };
}

async function loadMerchantCatalogState(repoRoot) {
  if (text(process.env.MERCHANT_DEDUP_SKIP_API) === '1') return null;
  try {
    const { createMerchantClient } = require('./lib/merchant-api-client');
    const { merchantId, merchantFetch, listAllPages } = await createMerchantClient(repoRoot);
    const products = await listAllPages((pageToken) => {
      const q = new URLSearchParams({ pageSize: '250' });
      if (pageToken) q.set('pageToken', pageToken);
      return merchantFetch(`/products/v1/accounts/${merchantId}/products?${q}`);
    });
    return {
      active: new Set(products.filter((p) => !p.archived).map((p) => p.offerId)),
      archived: new Set(products.filter((p) => p.archived).map((p) => p.offerId))
    };
  } catch (e) {
    console.warn('[GGL] MC catalog state skipped for dedupe:', e.message || e);
    return null;
  }
}

function alignGridToSheetHeaders(grid, sheetHeaders) {
  const fileHeaders = grid[0].map(text);
  const dataRows = grid.slice(1);
  const idxForSheetCol = sheetHeaders.map((sh) => fileHeaders.indexOf(text(sh)));
  const missing = sheetHeaders.filter((_, i) => idxForSheetCol[i] < 0);
  if (missing.length) {
    console.warn('[GGL] Sheet columns not found in CSV header:', missing.slice(0, 12).join(' | '), missing.length > 12 ? '…' : '');
  }
  return dataRows.map((row) =>
    idxForSheetCol.map((i) => {
      if (i < 0 || i >= row.length) return '';
      const cell = row[i];
      return cell == null ? '' : String(cell);
    })
  );
}

/**
 * Merchant Center product_detail: exactly section:attribute:value (optional section → leading ':').
 * See https://support.google.com/merchants/answer/9218260
 */
function escapeProductDetailPart(s) {
  const t = text(s);
  if (!t) return '';
  if (/[",:]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function formatProductDetailTriple(section, attributeName, attributeValue) {
  const val = text(attributeValue);
  const name = text(attributeName);
  if (!val || !name) return '';
  const sec = text(section);
  const pName = escapeProductDetailPart(name);
  const pVal = escapeProductDetailPart(val);
  if (sec) return `${escapeProductDetailPart(sec)}:${pName}:${pVal}`;
  return `:${pName}:${pVal}`;
}

const MATERIAL_IN_SIZE_VALUES = new Set(
  [
    'aluminowy',
    'aluminiu',
    'aluminium',
    'poliwęglan',
    'polichlorek winylu',
    'polichlorek winylu - otw.',
    'stal ocynkowana',
    'z powłoką teflonową'
  ].map((s) => s.toLowerCase())
);

const LENGTH_SIZE_RE = /^(?:długość|lungime|länge)\s+\d+/i;
const PROFILE_CODE_IN_SIZE_RE = /^[xzwy]\d[\d\s]*[a-z]?$/i;

/** Parse "Profil CURTINA X405 - biały mat - 2,0 m.b." → color + length size. */
function parseTildaTitleVariants(title) {
  const parts = text(title).split(/\s+-\s+/);
  if (parts.length < 2) return { color: '', size: '' };
  let color = '';
  let size = '';
  for (const part of parts.slice(1)) {
    const lenMatch = part.match(/^(\d)[,.](\d+)\s*m\.?\s*b\.?$/i);
    if (lenMatch) {
      const mm = Math.round(parseFloat(`${lenMatch[1]}.${lenMatch[2]}`) * 1000);
      size = `długość ${mm} mm`;
    } else if (!color) {
      color = part.trim();
    }
  }
  return { color, size };
}

function buildProductDetailCell({ color, size, material, compatibleProfile }) {
  const parts = [];
  const add = (attr, val) => {
    const p = formatProductDetailTriple('', attr, val);
    if (p) parts.push(p);
  };
  add('Color', color);
  add('Size', size);
  add('Material', material);
  add('Compatible profile', compatibleProfile);
  return parts.join(', ');
}

/**
 * Google Shopping variants: color + length in dedicated columns; material/profile codes elsewhere.
 * Prefer Tilda editionuid link when Meta omits it (same page, distinct variant landing URL).
 */
function normalizeMerchantVariantFields(fields, tildaRow) {
  let color = text(fields.color);
  let size = text(fields.size);
  let material = text(fields.material);
  let link = text(fields.link);
  let compatibleProfile = '';

  ({ material, size } = splitCombinedMaterialLengthSize(size, material));

  if (tildaRow) {
    const tildaUrl = text(tildaRow.Url);
    if (tildaUrl.includes('editionuid')) link = tildaUrl;
    const parsed = parseTildaTitleVariants(tildaRow.Title);
    if (!LENGTH_SIZE_RE.test(size) && parsed.size) size = parsed.size;
    if ((!color || color === '-') && parsed.color) color = parsed.color;
    const mod = text(tildaRow.Modifications || tildaRow.modifications);
    const colorMod = mod.match(/(?:culoare|farbe|color)\s*:\s*(.+)/i);
    if ((!color || color === '-') && colorMod) color = colorMod[1].trim();
  }

  if (color === '-') color = '';

  const sizeLower = size.toLowerCase();
  if (size && MATERIAL_IN_SIZE_VALUES.has(sizeLower)) {
    if (!material) material = size;
    size = '';
  } else if (size && PROFILE_CODE_IN_SIZE_RE.test(sizeLower)) {
    compatibleProfile = size;
    size = '';
  }

  return { color, size, material, link, compatibleProfile };
}

function normalizeVariantFieldsInMatrix(valuesMatrix, headers, tildaStoreIndex) {
  const idIx = colIdx(headers, 'id');
  const linkIx = colIdx(headers, 'link');
  const colorIx = colIdx(headers, 'color');
  const sizeIx = colIdx(headers, 'size');
  const materialIx = colIdx(headers, 'material');
  const pdIx = colIdx(headers, 'product detail');
  const titleIx = colIdx(headers, 'title');
  const variantMap = tildaStoreIndex?.variantByExternalId;
  let links = 0;
  let colors = 0;
  let sizes = 0;
  let materials = 0;
  let details = 0;

  for (const row of valuesMatrix) {
    const id = idIx >= 0 ? text(row[idIx]) : '';
    const tildaRow = variantMap?.get(id) || null;
    const before = {
      color: colorIx >= 0 ? text(row[colorIx]) : '',
      size: sizeIx >= 0 ? text(row[sizeIx]) : '',
      material: materialIx >= 0 ? text(row[materialIx]) : '',
      link: linkIx >= 0 ? text(row[linkIx]) : '',
      title: titleIx >= 0 ? text(row[titleIx]) : ''
    };
    const norm = normalizeMerchantVariantFields(before, tildaRow);

    if (linkIx >= 0 && norm.link && norm.link !== before.link) {
      row[linkIx] = norm.link;
      links += 1;
    }
    if (colorIx >= 0 && norm.color !== before.color) {
      row[colorIx] = norm.color;
      colors += 1;
    }
    if (sizeIx >= 0 && norm.size !== before.size) {
      row[sizeIx] = norm.size;
      sizes += 1;
    }
    if (materialIx >= 0 && norm.material !== before.material) {
      row[materialIx] = norm.material;
      materials += 1;
    }
    if (pdIx >= 0) {
      const pd = buildProductDetailCell(norm);
      if (pd !== text(row[pdIx])) {
        row[pdIx] = pd;
        details += 1;
      }
    }
  }

  return { links, colors, sizes, materials, details };
}

/** Numeric GPC: Hardware > Building Materials > Molding (7112). Legacy text path is not in Google taxonomy. */
const DEFAULT_GOOGLE_PRODUCT_CATEGORY = '7112';
/** Meta FPC: building moldings & trims (1457). Legacy Ceiling Materials path is invalid in Meta taxonomy. */
const DEFAULT_FB_PRODUCT_CATEGORY = '1457';
const LEGACY_GPC_TEXT =
  'Hardware > Building Materials > Ceiling Materials > Ceiling Profiles';
const LEGACY_FB_TEXT =
  'Home & Garden > Home Improvement > Building Materials > Ceiling Materials';

const GPC_IN_PRODUCT_DETAIL_RE = /^google[_ ]product[_ ]category\s*:\s*/i;

function normalizeGoogleProductCategory(val) {
  const v = text(val);
  if (!v) return DEFAULT_GOOGLE_PRODUCT_CATEGORY;
  if (v === LEGACY_GPC_TEXT || /ceiling materials > ceiling profiles/i.test(v)) {
    return DEFAULT_GOOGLE_PRODUCT_CATEGORY;
  }
  return v;
}

function normalizeFbProductCategory(val) {
  const v = text(val);
  if (!v) return DEFAULT_FB_PRODUCT_CATEGORY;
  if (v === LEGACY_FB_TEXT || /ceiling materials/i.test(v)) {
    return DEFAULT_FB_PRODUCT_CATEGORY;
  }
  return v;
}

function extractGoogleProductCategory(m) {
  const direct = text(m.google_product_category) || text(m['google product category']);
  if (direct) return normalizeGoogleProductCategory(direct);
  const pd = text(m['product detail']) || text(m.product_detail);
  if (GPC_IN_PRODUCT_DETAIL_RE.test(pd)) {
    return normalizeGoogleProductCategory(
      pd.replace(GPC_IN_PRODUCT_DETAIL_RE, '').trim()
    );
  }
  return DEFAULT_GOOGLE_PRODUCT_CATEGORY;
}

function baseProductTitle(title) {
  return text(title).split(' — ')[0].trim();
}

/** Shopping title: short product name only — color/size/type live in dedicated columns. */
function merchantShoppingTitle(title) {
  return truncate(baseProductTitle(title), 150);
}

/** Meta DE: "Aluminium - Länge 3200 mm" in size column. */
function splitCombinedMaterialLengthSize(size, material) {
  const s = text(size);
  const combo = s.match(/^(.+?)\s*-\s*(Länge\s+\d+(?:[.,]\d+)?\s*mm)\s*$/i);
  if (combo) {
    return { material: text(material) || combo[1].trim(), size: combo[2].trim() };
  }
  return { material: text(material), size: s };
}

/** Parse length columns (PL/RO/DE) → meters for unit pricing. */
function parseLengthMetersFromSize(size) {
  const s = text(size);
  const plMm =
    s.match(/długość\s+(\d+(?:[.,]\d+)?)\s*mm/i) || s.match(/^(\d+(?:[.,]\d+)?)\s*mm$/i);
  if (plMm) {
    const mm = Number(plMm[1].replace(',', '.'));
    if (Number.isFinite(mm) && mm > 0) return mm / 1000;
  }
  const deMm = s.match(/länge\s+(\d+(?:[.,]\d+)?)\s*mm/i);
  if (deMm) {
    const mm = Number(deMm[1].replace(',', '.'));
    if (Number.isFinite(mm) && mm > 0) return mm / 1000;
  }
  const roLen = s.match(/lungime\s+(\d+(?:[.,]\d+)?)\s*m\b/i);
  if (roLen) {
    const val = Number(roLen[1].replace(',', '.'));
    if (!Number.isFinite(val) || val <= 0) return null;
    if (val >= 100) return val / 1000;
    return val;
  }
  const roMm = s.match(/lungime\s+(\d+(?:[.,]\d+)?)\s*mm/i);
  if (roMm) {
    const mm = Number(roMm[1].replace(',', '.'));
    if (Number.isFinite(mm) && mm > 0) return mm / 1000;
  }
  return null;
}

function formatMerchantMeasureUnit(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  const rounded = Math.round(n * 1000) / 1000;
  const textVal = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${textVal} ${unit}`;
}

/** EU/PL: unit pricing measure + base (ct for pieces, m for length profiles). */
function deriveUnitPricing(size) {
  const meters = parseLengthMetersFromSize(size);
  if (meters) {
    return {
      measure: formatMerchantMeasureUnit(meters, 'm'),
      base: '1 m'
    };
  }
  return { measure: '1 ct', base: '1 ct' };
}

function normalizeUnitPricingInMatrix(valuesMatrix, headers) {
  const measureIx = colIdx(headers, 'unit pricing measure');
  const baseIx = colIdx(headers, 'unit pricing base measure');
  const sizeIx = colIdx(headers, 'size');
  if (measureIx < 0 && baseIx < 0) return { rows: 0 };
  let rows = 0;
  for (const row of valuesMatrix) {
    const size = sizeIx >= 0 ? text(row[sizeIx]) : '';
    const { measure, base } = deriveUnitPricing(size);
    let changed = false;
    if (measureIx >= 0 && text(row[measureIx]) !== measure) {
      row[measureIx] = measure;
      changed = true;
    }
    if (baseIx >= 0 && text(row[baseIx]) !== base) {
      row[baseIx] = base;
      changed = true;
    }
    if (changed) rows += 1;
  }
  return { rows };
}

/** One item_group_id per model line; variants share group via color/size columns. */
function deriveItemGroupId(title, link, fallback) {
  const base = baseProductTitle(title);
  const model = base.match(/\b([A-Za-z]{2,})\s+((?:[A-Z]?\d+[A-Za-z]*)(?:\s+[A-Z])?)\s*$/i);
  if (model) {
    return `${model[1].toLowerCase()}_${model[2].toLowerCase().replace(/\s+/g, '_')}`.replace(/__+/g, '_');
  }
  const slug = text(link).split('?')[0].split('/').filter(Boolean).pop() || '';
  if (slug) return slug.replace(/-/g, '_').toLowerCase();
  return text(fallback);
}

function normalizeItemGroupIdsInMatrix(valuesMatrix, headers) {
  const titleIx = colIdx(headers, 'title');
  const linkIx = colIdx(headers, 'link');
  const groupIx = colIdx(headers, 'item group id');
  let titles = 0;
  let groups = 0;
  for (const row of valuesMatrix) {
    const link = linkIx >= 0 ? text(row[linkIx]) : '';
    if (titleIx >= 0) {
      const oldTitle = text(row[titleIx]);
      const cleanTitle = merchantShoppingTitle(oldTitle);
      if (cleanTitle && cleanTitle !== oldTitle) {
        row[titleIx] = cleanTitle;
        titles += 1;
      }
    }
    if (groupIx >= 0) {
      const oldGroup = text(row[groupIx]);
      const title = titleIx >= 0 ? text(row[titleIx]) : '';
      const newGroup = deriveItemGroupId(title, link, oldGroup);
      if (newGroup && newGroup !== oldGroup) {
        row[groupIx] = newGroup;
        groups += 1;
      }
    }
  }
  return { titles, groups };
}

/** Optional structured specs from Meta catalog columns → comma-separated triples for spreadsheet. */
function metaToProductDetailCell(m, tildaRow, normOverride) {
  const norm =
    normOverride ||
    normalizeMerchantVariantFields(
      { color: m.color, size: m.size, material: m.material, link: m.link, title: m.title },
      tildaRow || null
    );
  const parts = [];
  const add = (section, attr, val) => {
    const p = formatProductDetailTriple(section, attr, val);
    if (p) parts.push(p);
  };
  add('', 'Color', norm.color);
  add('', 'Size', norm.size);
  add('', 'Material', norm.material);
  add('', 'Compatible profile', norm.compatibleProfile);
  add('', 'Pattern', m.pattern);
  add('', 'Product tag', m['product_tags[0]']);
  add('', 'Product tag', m['product_tags[1]']);
  add('', 'Custom label', m.custom_label_0);
  add('', 'Custom label', m.custom_label_1);
  const joined = parts.join(', ');
  const max = 5000;
  return joined.length <= max ? joined : `${joined.slice(0, max - 1)}…`;
}

function metaToMerchantDict(m, tildaStoreIndex) {
  const tildaRow = tildaStoreIndex?.variantByExternalId?.get(text(m.id)) || null;
  const norm = normalizeMerchantVariantFields(
    { color: m.color, size: m.size, material: m.material, link: m.link, title: m.title },
    tildaRow
  );
  const dict = {};
  dict.id = text(m.id);
  dict.title = merchantShoppingTitle(m.title);
  dict.description = truncate(m.description, 5000);
  dict.availability = normAvail(m.availability);
  dict['availability date'] = '';
  dict['expiration date'] = '';
  dict.link = norm.link || text(m.link);
  dict['mobile link'] = '';
  dict['image link'] = text(m.image_link);
  dict.price = text(m.price).replace(',', '.');
  dict['sale price'] = text(m.sale_price).replace(',', '.');
  dict['sale price effective date'] = text(m.sale_price_effective_date);
  dict['identifier exists'] = 'no';
  dict.gtin = '';
  dict.mpn = '';
  dict.brand = merchantBrand(m.brand);
  dict['product highlight'] = '';
  /** product_detail must be exactly section:attribute:value (use leading colon if no section). Never stuff GPC here — use google product category. */
  dict['google product category'] = extractGoogleProductCategory(m);
  dict['product detail'] = metaToProductDetailCell(m, tildaRow, norm);
  dict['additional image link'] = text(m.additional_image_link);
  dict.condition = (text(m.condition) || 'new').toLowerCase();
  if (tildaStoreIndex) applyTildaPhotosToDict(dict, m, tildaStoreIndex);
  dict.adult = '';
  dict.color = norm.color;
  dict.size = norm.size;
  dict['size type'] = '';
  dict['size system'] = '';
  dict.gender = '';
  dict.material = norm.material;
  dict.pattern = '';
  dict['age group'] = '';
  dict.multipack = '';
  dict['is bundle'] = '';
  const unitPricing = deriveUnitPricing(norm.size);
  dict['unit pricing measure'] = unitPricing.measure;
  dict['unit pricing base measure'] = unitPricing.base;
  dict['energy efficiency class'] = '';
  dict['min energy efficiency class'] = '';
  dict['item group id'] = deriveItemGroupId(dict.title, dict.link, m.item_group_id);
  dict['sell on google quantity'] = text(m.quantity_to_sell_on_facebook);
  return dict;
}

function dictToRow(headers, dict) {
  return headers.map((h) => {
    const key = text(h);
    if (!key) return '';
    const v = dict[key];
    return v == null ? '' : String(v);
  });
}

function sheetRangeA1(sheetName, c1, r1, c2, r2) {
  const escaped = sheetName.replace(/'/g, "''");
  const col = (n) => columnLetter(n);
  return `'${escaped}'!${col(c1)}${r1}:${col(c2)}${r2}`;
}

function rowJoinCells(row) {
  return (row || [])
    .map((c) => (c != null ? String(c) : ''))
    .join(' ')
    .trim();
}

/** Recognize Google Merchant Center spreadsheet export by header row (wide attribute row). */
function looksLikeMerchantTemplateHeaders(headers) {
  const h = headers.map((x) => text(x).toLowerCase());
  if (h.length < 30) return false;
  if (h[0] !== 'id') return false;
  if (!h.includes('title') || !h.includes('description')) return false;
  const hasImage =
    h.includes('image link') || h.includes('image_link') || h.some((x) => x.replace(/\s+/g, ' ') === 'image link');
  if (!hasImage || !h.includes('price')) return false;
  if (!h.includes('sell on google quantity')) return false;
  return true;
}

/** Sheet rows headerRow+2 … headerRow+4 (1-based) = template sample block — remove via DeleteDimension. */
function shouldDeleteMerchantTemplateRows(headerRow, resolvedDataStartRow) {
  if (text(process.env.MERCHANT_KEEP_GOOGLE_EXAMPLES) === '1') return false;
  return resolvedDataStartRow === headerRow + 5;
}

/**
 * Delete three sheet rows below hints (official template rows 3–5): examples + «удалите строки…».
 * 0-based API indices: rows [headerRow+1, headerRow+4).
 */
async function deleteMerchantTemplateRows(sheetsApi, spreadsheetId, sheetId, headerRow) {
  const startIndex = headerRow + 1;
  const endIndex = headerRow + 4;
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex
            }
          }
        }
      ]
    }
  });
  console.log(
    '[GGL] Удалены строки листа',
    headerRow + 2,
    '–',
    headerRow + 4,
    '(API rows',
    startIndex,
    '–',
    endIndex - 1,
    '): примеры Google и служебная строка шаблона.'
  );
}

async function fetchSheetRows(sheetsApi, spreadsheetId, sheetName, rowStart, rowEnd) {
  const esc = sheetName.replace(/'/g, "''");
  const range = `'${esc}'!${rowStart}:${rowEnd}`;
  const { data } = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: 'ROWS'
  });
  return data.values || [];
}

function cellA(row) {
  const r = row || [];
  return text(r[0]);
}

/**
 * Rows arg: values from range starting at sheet row (headerRow+1); index 0 = row below header.
 */
function detectMerchantTemplateDataStart(rowsBelowHeader, headerRow) {
  const rowAt = (i) => rowsBelowHeader[i] || [];
  const id3 = cellA(rowAt(1));
  const id6 = cellA(rowAt(4));
  const join5 = rowJoinCells(rowAt(3));

  const googleSampleIds = new Set(['a3b5', '6429416']);

  const isOurOfferId = (t) => {
    const s = text(t);
    if (!s || s.length < 10) return false;
    if (googleSampleIds.has(s.toLowerCase())) return false;
    return /^[A-Za-z0-9_-]+$/.test(s);
  };

  if (isOurOfferId(id3)) {
    console.log('[GGL] Лист уже без строк 3–5 шаблона — данные с строки', headerRow + 2);
    return headerRow + 2;
  }

  if (DELETE_ROWS_HINT_RE.test(join5) || DELETE_ROWS_HINT_EN_RE.test(join5)) {
    console.log(
      '[GGL] Обнаружена подсказка «удалите строки» в строке',
      headerRow + 4,
      '→ данные с строки',
      headerRow + 5
    );
    return headerRow + 5;
  }

  const id3Lower = id3.toLowerCase();
  if (googleSampleIds.has(id3Lower)) return headerRow + 5;

  const row3Joined = rowJoinCells(rowAt(1));
  if (/example\.com/i.test(row3Joined) && !isOurOfferId(id3)) return headerRow + 5;

  if (!id3 && isOurOfferId(id6)) {
    console.log('[GGL] Строки 3–5 пустые/без id, каталог с строки', headerRow + 5);
    return headerRow + 5;
  }

  console.log('[GGL] Шаблон Merchant по заголовкам → данные с строки', headerRow + 5, '(если неверно — MERCHANT_DATA_START_ROW)');
  return headerRow + 5;
}

/**
 * @param {'off' | 'row2' | 'full_examples'} mode
 */
async function restoreMerchantHintRows(sheetsApi, spreadsheetId, sheetName, headerRow, colCount, mode) {
  if (mode === 'off') {
    console.log('[GGL] MERCHANT_RESTORE_HINT_ROWS=0 — подсказки из снимка не пишем');
    return;
  }
  const fp = path.join(ROOT, 'feeds/templates/merchant_products_source_rows_2_5.json');
  if (!fs.existsSync(fp)) {
    console.warn('[GGL] Нет файла снимка подсказок:', fp);
    return;
  }
  let snap;
  try {
    snap = JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    console.warn('[GGL] Ошибка чтения JSON подсказок:', e.message);
    return;
  }
  if (!Array.isArray(snap) || snap.length !== 4) {
    console.warn('[GGL] Снимок подсказок: ожидаются 4 строки (лист строки 2–5)');
    return;
  }

  const padRow = (row) => {
    const r = Array.isArray(row) ? row.map((c) => (c == null ? '' : String(c))) : [];
    const out = r.slice(0, colCount);
    while (out.length < colCount) out.push('');
    return out;
  };

  if (mode === 'row2') {
    const range = sheetRangeA1(sheetName, 1, headerRow + 1, colCount, headerRow + 1);
    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [padRow(snap[0])] }
    });
    console.log('[GGL] Восстановлена только строка подсказок', headerRow + 1);
    return;
  }

  const padded = snap.map(padRow);
  const startR = headerRow + 1;
  const endR = headerRow + 4;
  const range = sheetRangeA1(sheetName, 1, startR, colCount, endR);
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: padded }
  });
  console.log('[GGL] Восстановлены строки', startR, '–', endR, '(режим примеров Google: MERCHANT_KEEP_GOOGLE_EXAMPLES=1)');
}

/** Resolve worksheet by title; log gid — must match browser URL #gid=. */
async function assertSheetAndLogGid(sheetsApi, spreadsheetId, sheetName) {
  const meta = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets(properties(sheetId,title))'
  });
  const wanted = text(sheetName);
  const sheets = meta.data.sheets || [];
  const match = sheets.find((s) => text(s.properties.title) === wanted);
  if (!match) {
    const avail = sheets
      .map((s) => `${JSON.stringify(text(s.properties.title))} → gid=${s.properties.sheetId}`)
      .join('\n  ');
    console.error('[GGL] Sheet title not found:', JSON.stringify(wanted));
    console.error('[GGL] Worksheets:\n  ', avail);
    throw new Error(`Worksheet "${wanted}" not found — fix MERCHANT_OUTPUT_SHEET_NAME`);
  }
  const gid = match.properties.sheetId;
  console.log('[GGL] Worksheet matched:', wanted, '| gid =', gid);
  console.log('[GGL] Your browser URL for THIS tab must contain #gid=' + gid);
  return gid;
}

async function fetchHeaderRow(sheetsApi, spreadsheetId, sheetName, headerRow) {
  const range = `'${sheetName.replace(/'/g, "''")}'!${headerRow}:${headerRow}`;
  const headerResp = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: 'ROWS'
  });
  const headers = (headerResp.data.values && headerResp.data.values[0]) || [];
  if (!headers.length) throw new Error(`No headers in ${sheetName} row ${headerRow}`);
  return headers;
}

function normalizeSheetHeaders(headers) {
  return headers.map((h) => text(h));
}

async function writeHeaderRow(sheetsApi, spreadsheetId, sheetName, headerRow, headers) {
  const range = `'${sheetName.replace(/'/g, "''")}'!${headerRow}:${headerRow}`;
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] }
  });
}

/**
 * Detect first product-data row under official Google template block.
 * If sheet row 2 was overwritten by data, sheet scan fails — use header signature → row 6.
 */
async function resolveDataStartRow(sheetsApi, spreadsheetId, sheetName, headerRow, headers) {
  const manual = Number(process.env.MERCHANT_DATA_START_ROW);
  const manualRow = Number.isFinite(manual) && manual > headerRow ? manual : null;

  if (manualRow != null) {
    if (headers && looksLikeMerchantTemplateHeaders(headers)) {
      const scanLast = headerRow + 12;
      const rowsBelow = await fetchSheetRows(sheetsApi, spreadsheetId, sheetName, headerRow + 1, scanLast);
      const detected = detectMerchantTemplateDataStart(rowsBelow, headerRow);
      if (detected === headerRow + 2 && manualRow === headerRow + 5) {
        console.warn(
          '[GGL] MERCHANT_DATA_START_ROW=6 в .env, а лист уже без строк 3–5 шаблона (данные с строки 3). Используем 3 — удалите переменную или задайте MERCHANT_DATA_START_ROW=3.'
        );
        return detected;
      }
    }
    console.log('[GGL] MERCHANT_DATA_START_ROW (manual):', manualRow);
    return manualRow;
  }

  if (text(process.env.MERCHANT_ASSUME_OFFICIAL_TEMPLATE) === '1') {
    const row = headerRow + 5;
    console.log('[GGL] MERCHANT_ASSUME_OFFICIAL_TEMPLATE=1 → data starts row', row);
    return row;
  }

  if (headers && looksLikeMerchantTemplateHeaders(headers)) {
    const scanLast = headerRow + 12;
    const rowsBelow = await fetchSheetRows(sheetsApi, spreadsheetId, sheetName, headerRow + 1, scanLast);
    return detectMerchantTemplateDataStart(rowsBelow, headerRow);
  }

  const esc = sheetName.replace(/'/g, "''");
  const scanFirst = headerRow + 1;
  const scanLast = headerRow + 15;
  const range = `'${esc}'!${scanFirst}:${scanLast}`;
  const { data } = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: 'ROWS'
  });
  const rows = data.values || [];

  for (let i = 0; i < rows.length; i++) {
    const joined = rowJoinCells(rows[i]);
    if (DELETE_ROWS_HINT_RE.test(joined) || DELETE_ROWS_HINT_EN_RE.test(joined)) {
      const hintAbsoluteRow = headerRow + 1 + i;
      const dataRow = hintAbsoluteRow + 1;
      console.log('[GGL] Detected delete-rows hint on sheet row', hintAbsoluteRow, '→ data starts row:', dataRow);
      return dataRow;
    }
  }

  const row2joined = rowJoinCells(rows[0]);
  if (
    row2joined.includes('Заполните обязательное поле') ||
    row2joined.includes('Заполните') ||
    row2joined.toLowerCase().includes('required') ||
    row2joined.includes('Обязательное поле')
  ) {
    const assumed = headerRow + 5;
    console.warn(
      '[GGL] Template hint row detected (full-row scan) → assuming Google block rows 2–5 → data row:',
      assumed
    );
    return assumed;
  }

  const fallback = headerRow + 1;
  console.warn(
    '[GGL] No Google template block detected → data starts row:',
    fallback,
    '(set MERCHANT_DATA_START_ROW=6 or MERCHANT_ASSUME_OFFICIAL_TEMPLATE=1 if wrong)'
  );
  return fallback;
}

function colIdx(headers, name) {
  return headers.findIndex((h) => text(h) === name);
}

function googleProductCategoryInsertIndex(headers) {
  const highlightIx = colIdx(headers, 'product highlight');
  if (highlightIx >= 0) return highlightIx + 1;
  const pdIx = colIdx(headers, 'product detail');
  if (pdIx >= 0) return pdIx;
  return headers.length;
}

async function ensureGoogleProductCategoryColumn(
  sheetsApi,
  spreadsheetId,
  sheetId,
  sheetName,
  headerRow,
  headers,
  apply
) {
  if (colIdx(headers, 'google product category') >= 0) return headers;
  const insertAt = googleProductCategoryInsertIndex(headers);
  console.log(
    '[GGL] Missing "google product category" column — insert at column',
    insertAt + 1,
    apply ? '(applying)' : '(dry-run: local headers only)'
  );
  if (!apply) {
    return [...headers.slice(0, insertAt), 'google product category', ...headers.slice(insertAt)];
  }
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: insertAt,
              endIndex: insertAt + 1
            },
            inheritFromBefore: true
          }
        }
      ]
    }
  });
  const col = columnLetter(insertAt + 1);
  const escaped = sheetName.replace(/'/g, "''");
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: `'${escaped}'!${col}${headerRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['google product category']] }
  });
  return fetchHeaderRow(sheetsApi, spreadsheetId, sheetName, headerRow);
}

function rebuildProductDetailFromRow(row, headers) {
  const parts = [];
  const add = (attr, colName) => {
    const ix = colIdx(headers, colName);
    if (ix < 0) return;
    const p = formatProductDetailTriple('', attr, row[ix]);
    if (p) parts.push(p);
  };
  add('Color', 'color');
  add('Size', 'size');
  add('Material', 'material');
  add('Pattern', 'pattern');
  return parts.join(', ');
}

/** Move GPC out of product detail and ensure google product category column is filled. */
function sanitizeMerchantProductColumns(valuesMatrix, headers) {
  const pdIx = colIdx(headers, 'product detail');
  const gpcIx = colIdx(headers, 'google product category');
  if (pdIx < 0 && gpcIx < 0) return { moved: 0, filled: 0 };
  let moved = 0;
  let filled = 0;
  for (const row of valuesMatrix) {
    let gpcVal = gpcIx >= 0 ? text(row[gpcIx]) : '';
    if (pdIx >= 0) {
      const pd = text(row[pdIx]);
      if (GPC_IN_PRODUCT_DETAIL_RE.test(pd)) {
        gpcVal = pd.replace(GPC_IN_PRODUCT_DETAIL_RE, '').trim() || gpcVal;
        row[pdIx] = rebuildProductDetailFromRow(row, headers);
        moved += 1;
      }
    }
    if (gpcIx >= 0) {
      gpcVal = normalizeGoogleProductCategory(gpcVal);
      const current = text(row[gpcIx]);
      if (!current) {
        row[gpcIx] = gpcVal;
        filled += 1;
      } else if (normalizeGoogleProductCategory(current) !== current) {
        row[gpcIx] = normalizeGoogleProductCategory(current);
        filled += 1;
      } else if (moved && current !== gpcVal) {
        row[gpcIx] = gpcVal;
      }
    }
  }
  return { moved, filled };
}

async function clearSheetHintRow(sheetsApi, spreadsheetId, sheetName, headerRow, colCount) {
  const hintRow = headerRow + 1;
  const empty = Array.from({ length: colCount }, () => '');
  const escaped = sheetName.replace(/'/g, "''");
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: `'${escaped}'!${hintRow}:${hintRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [empty] }
  });
  console.log('[GGL] Очищена строка подсказок', hintRow, '(MERCHANT_RESTORE_HINT_ROWS=0)');
}

/** Validation vs Merchant baseline (PL feed); warns only unless MERCHANT_STRICT_VALIDATION=1 */
function validateMerchantMatrix(matrix, headers, metaSource) {
  const warnings = [];
  const errors = [];
  const ix = {
    id: colIdx(headers, 'id'),
    title: colIdx(headers, 'title'),
    description: colIdx(headers, 'description'),
    availability: colIdx(headers, 'availability'),
    link: colIdx(headers, 'link'),
    image: colIdx(headers, 'image link'),
    price: colIdx(headers, 'price'),
    idExists: colIdx(headers, 'identifier exists'),
    brand: colIdx(headers, 'brand'),
    condition: colIdx(headers, 'condition'),
    gtin: colIdx(headers, 'gtin'),
    mpn: colIdx(headers, 'mpn'),
    availDate: colIdx(headers, 'availability date')
  };

  const priceOk = (p) => /\d/.test(p) && /\b[A-Z]{3}\s*$/.test(p.replace(/\s+/g, ' ').trim());

  matrix.forEach((row, ri) => {
    const line = ri + 1;
    const g = (k) => (ix[k] >= 0 ? text(row[ix[k]]) : '');

    if (!g('id')) errors.push(`data row ${line}: empty id`);
    if (!g('title')) errors.push(`data row ${line}: empty title`);
    if (!g('description')) errors.push(`data row ${line}: empty description`);
    if (!g('availability')) errors.push(`data row ${line}: empty availability`);

    const av = g('availability');
    if (av && !VALID_AVAILABILITY.has(av)) {
      errors.push(`data row ${line}: invalid availability "${av}" (use in_stock|out_of_stock|preorder|backorder)`);
    }
    if (av === 'preorder' || av === 'backorder') {
      if (!g('availDate')) warnings.push(`data row ${line}: availability ${av} usually needs "availability date"`);
    }

    if (!g('link')) errors.push(`data row ${line}: empty link`);
    else if (!/^https?:\/\//i.test(g('link'))) warnings.push(`data row ${line}: link should start with http(s)`);

    if (!g('image')) errors.push(`data row ${line}: empty image link`);
    else {
      if (!/^https?:\/\//i.test(g('image'))) warnings.push(`data row ${line}: image link should start with http(s)`);
      if (/drive\.google\.com/i.test(g('image'))) warnings.push(`data row ${line}: Google Drive image URLs often fail in Merchant`);
    }

    if (!g('price')) errors.push(`data row ${line}: empty price`);
    else if (!priceOk(g('price'))) warnings.push(`data row ${line}: price should be like "12.00 PLN" (number + space + ISO 4217)`);

    if (!g('idExists')) warnings.push(`data row ${line}: missing identifier exists`);
    else if (g('idExists').toLowerCase() === 'yes') {
      if (!g('gtin')) warnings.push(`data row ${line}: identifier exists yes → GTIN usually required`);
      if (!g('mpn') && !g('brand')) warnings.push(`data row ${line}: identifier exists yes → brand + MPN often required`);
    }

    if (!g('brand')) warnings.push(`data row ${line}: empty brand (often required for Shopping)`);
    if (!g('condition')) warnings.push(`data row ${line}: empty condition (use new/refurbished/used)`);
    else if (!VALID_CONDITION.has(g('condition'))) {
      warnings.push(`data row ${line}: invalid condition "${g('condition')}"`);
    }

    const idEx = g('idExists');
    if (idEx && !VALID_YES_NO.has(idEx)) {
      warnings.push(`data row ${line}: identifier exists should be yes or no`);
    }

    const tl = g('title').length;
    if (tl > 150) warnings.push(`data row ${line}: title length ${tl} (template recommends ≤150)`);

    const dl = g('description').length;
    if (metaSource && dl > 5000) warnings.push(`data row ${line}: description length ${dl} (limit commonly 5000)`);
  });

  return { warnings, errors };
}

function merchantHintRestoreMode(headers) {
  if (text(process.env.MERCHANT_RESTORE_HINT_ROWS) === '0') return 'off';
  if (!looksLikeMerchantTemplateHeaders(headers)) return 'off';
  if (text(process.env.MERCHANT_KEEP_GOOGLE_EXAMPLES) === '1') return 'full_examples';
  return 'row2';
}

async function main() {
  const { apply, market } = parseArgs(process.argv);
  const { csvPath, usedFallback, fallbackRel, missing } = resolveMetaCsvPath(ROOT, market);

  if (missing) {
    throw new Error(
      `CSV not found: ${csvPath}\nSet META_CSV_PATH or place export at ${market.metaCsvPath}`
    );
  }

  console.log(
    `[GGL] Market ${market.code}: feedLabel=${market.feedLabel} lang=${market.contentLanguage} countries=${market.targetCountries.join(',')} currency=${market.currency} site=${market.siteOrigin}`
  );
  if (usedFallback) {
    console.warn(
      `[GGL] Using fallback catalog ${fallbackRel} — links/prices rewritten for ${market.code} (rate PLN→${market.currency}: ${market.plnToLocalRate})`
    );
  }

  const sheetName = market.sheetName;
  const headerRow = Math.max(1, Number(process.env.MERCHANT_HEADER_ROW) || 1);

  const auth = await authorize(ROOT);
  const sheetsApi = google.sheets({ version: 'v4', auth });
  const spreadsheetId = await resolveSpreadsheetId(auth, market);
  const sheetId = await assertSheetAndLogGid(sheetsApi, spreadsheetId, sheetName);
  let headers = await fetchHeaderRow(sheetsApi, spreadsheetId, sheetName, headerRow);
  const trimmedHeaders = normalizeSheetHeaders(headers);
  if (trimmedHeaders.some((h, i) => h !== headers[i])) {
    console.log('[GGL] Trimming sheet header whitespace (Merchant Center column mapping)');
    headers = trimmedHeaders;
    if (apply) await writeHeaderRow(sheetsApi, spreadsheetId, sheetName, headerRow, headers);
  }
  headers = await ensureGoogleProductCategoryColumn(
    sheetsApi,
    spreadsheetId,
    sheetId,
    sheetName,
    headerRow,
    headers,
    apply
  );
  const dataStartRow = await resolveDataStartRow(sheetsApi, spreadsheetId, sheetName, headerRow, headers);

  if (dataStartRow <= headerRow) {
    throw new Error(`dataStartRow ${dataStartRow} must be below header row ${headerRow}`);
  }

  const grid = loadCsvGrid(csvPath);
  const fileHeaders = grid[0].map(text);
  const isMetaCatalog = fileHeaders.includes('image_link') && fileHeaders.includes('item_group_id');

  let tildaStoreIndex = null;
  const tildaCsvPath = text(market.tildaCsvPath);
  if (tildaCsvPath) {
    const tildaResolved = path.resolve(ROOT, tildaCsvPath);
    if (fs.existsSync(tildaResolved)) {
      tildaStoreIndex = loadTildaStoreIndex(tildaResolved);
      console.log(
        '[GGL] Tilda store index:',
        tildaResolved,
        `| rows with Photo: ${tildaStoreIndex.rowsWithPhoto}`,
        `| variant rows: ${tildaStoreIndex.variantRows}`,
        `| External ID: ${tildaStoreIndex.externalIds}`,
        `| Url keys: ${tildaStoreIndex.urls}`
      );
    } else {
      console.warn('[GGL] MERCHANT_TILDA_CSV_PATH not found:', tildaResolved);
    }
  }

  let valuesMatrix;
  if (isMetaCatalog) {
    const records = loadMetaObjects(csvPath);
    valuesMatrix = records.map((m) => dictToRow(headers, metaToMerchantDict(m, tildaStoreIndex)));
    console.log('[GGL] Source format: Meta catalog (image_link + item_group_id)');
  } else {
    valuesMatrix = alignGridToSheetHeaders(grid, headers);
    console.log('[GGL] Source format: grid CSV aligned to sheet headers by column name');
  }

  const brandUpdated = applyMerchantBrandToMatrix(valuesMatrix, headers);
  if (brandUpdated) {
    console.log(`[GGL] Brand normalized to "${merchantBrand()}" in ${brandUpdated}/${valuesMatrix.length} row(s)`);
  }

  const marketTransform = applyMarketTransformToMatrix(valuesMatrix, headers, market);
  if (marketTransform.links || marketTransform.prices || marketTransform.salePrices) {
    console.log(
      `[GGL] Market transform (${market.code}): links ${marketTransform.links}, price ${marketTransform.prices}, sale price ${marketTransform.salePrices}`
    );
  }

  if (tildaStoreIndex) {
    const variantStats = normalizeVariantFieldsInMatrix(valuesMatrix, headers, tildaStoreIndex);
    if (variantStats.links || variantStats.colors || variantStats.sizes || variantStats.materials) {
      console.log(
        `[GGL] Variant fields normalized: link+editionuid ${variantStats.links}, color ${variantStats.colors}, size ${variantStats.sizes}, material ${variantStats.materials}, product detail ${variantStats.details}`
      );
    }
    const tildaMatched = applyTildaPhotosToMatrix(valuesMatrix, headers, tildaStoreIndex);
    console.log(`[GGL] Tilda photos applied: ${tildaMatched}/${valuesMatrix.length}`);
    if (tildaMatched < valuesMatrix.length) {
      console.warn('[GGL] Some rows have no Tilda photo match — Drive URLs may remain');
    }
    const withAdditional = valuesMatrix.filter((row) => {
      const addIx = colIdx(headers, 'additional image link');
      return addIx >= 0 && text(row[addIx]);
    }).length;
    if (withAdditional) console.log(`[GGL] Rows with Tilda additional image link: ${withAdditional}`);
  }

  const driveAdditionalFixed = stripDriveAdditionalImages(valuesMatrix, headers);
  if (driveAdditionalFixed.mainFixed || driveAdditionalFixed.addFixed) {
    console.log(
      `[GGL] Image sanitize: main drive cleared ${driveAdditionalFixed.mainFixed}, additional drive cleared ${driveAdditionalFixed.addFixed}, additional tildacdn kept ${driveAdditionalFixed.addKeptTilda}`
    );
  }

  const imageIx = colIdx(headers, 'image link');
  const addIx = colIdx(headers, 'additional image link');
  let driveMainLeft = 0;
  let driveAddLeft = 0;
  for (const row of valuesMatrix) {
    if (imageIx >= 0 && /drive\.google\.com/i.test(text(row[imageIx]))) driveMainLeft += 1;
    if (addIx >= 0 && /drive\.google\.com/i.test(text(row[addIx]))) driveAddLeft += 1;
  }
  if (driveMainLeft || driveAddLeft) {
    console.warn(`[GGL] Drive URLs remain after sanitize: main=${driveMainLeft}, additional=${driveAddLeft}`);
  } else {
    console.log('[GGL] Image links OK: no drive.google.com in main or additional columns');
  }

  if (text(process.env.MERCHANT_DEDUP_VARIANTS) !== '0') {
    const mcState = await loadMerchantCatalogState(ROOT);
    const { kept, dropped, groups } = dedupeMerchantMatrixByVariant(
      valuesMatrix,
      headers,
      tildaStoreIndex,
      mcState
    );
    if (dropped.length) {
      console.log(
        `[GGL] Variant dedupe (link+color+size): ${groups} keys | kept ${kept.length} | dropped ${dropped.length}`
      );
      for (const row of dropped.slice(0, 15)) {
        const idIx = colIdx(headers, 'id');
        const titleIx = colIdx(headers, 'title');
        console.log(`  - drop id=${text(row[idIx])} title=${text(row[titleIx])}`);
      }
      if (dropped.length > 15) console.log(`  … +${dropped.length - 15} more`);
    } else {
      console.log(`[GGL] Variant dedupe (link+color+size): ${groups} unique variants, 0 duplicates removed`);
    }
    valuesMatrix = kept;
  }

  const { moved: gpcMoved, filled: gpcFilled } = sanitizeMerchantProductColumns(valuesMatrix, headers);
  if (gpcMoved || gpcFilled) {
    console.log(
      `[GGL] google product category: moved from product detail ${gpcMoved} row(s), filled empty ${gpcFilled} row(s)`
    );
  }

  const { titles: titlesCleaned, groups: groupsFixed } = normalizeItemGroupIdsInMatrix(valuesMatrix, headers);
  if (titlesCleaned || groupsFixed) {
    console.log(
      `[GGL] Shopping titles cleaned (suffix removed): ${titlesCleaned} row(s) | item group id normalized: ${groupsFixed} row(s)`
    );
  }

  const { rows: unitPricingRows } = normalizeUnitPricingInMatrix(valuesMatrix, headers);
  if (unitPricingRows) {
    console.log(`[GGL] Unit pricing measure/base filled or updated: ${unitPricingRows} row(s)`);
  }

  const enumStats = normalizeMerchantFeedValuesInMatrix(valuesMatrix, headers);
  if (enumStats.availability || enumStats.condition || enumStats.idExists || enumStats.adult || enumStats.gpc) {
    console.log(
      `[GGL] Feed enums normalized: availability ${enumStats.availability}, condition ${enumStats.condition}, identifier exists ${enumStats.idExists}, adult ${enumStats.adult}, google product category ${enumStats.gpc}`
    );
  }

  const { warnings, errors } = validateMerchantMatrix(valuesMatrix, headers, isMetaCatalog);
  if (warnings.length) {
    console.warn('[GGL] Validation warnings (first 30):');
    warnings.slice(0, 30).forEach((w) => console.warn('  -', w));
    if (warnings.length > 30) console.warn(`  … +${warnings.length - 30} more`);
  }
  if (errors.length) {
    console.error('[GGL] Validation errors (first 40):');
    errors.slice(0, 40).forEach((e) => console.error('  -', e));
    if (errors.length > 40) console.error(`  … +${errors.length - 40} more`);
    if (text(process.env.MERCHANT_STRICT_VALIDATION) === '1') {
      throw new Error('MERCHANT_STRICT_VALIDATION=1 and validation errors present — abort');
    }
  }

  const lastCol = headers.length;
  const deleteTemplateBand =
    looksLikeMerchantTemplateHeaders(headers) && shouldDeleteMerchantTemplateRows(headerRow, dataStartRow);
  const writeStartRow = deleteTemplateBand ? headerRow + 2 : dataStartRow;
  const lastRow = writeStartRow + valuesMatrix.length - 1;
  const dataRange = sheetRangeA1(sheetName, 1, writeStartRow, lastCol, lastRow);

  console.log('[GGL] Spreadsheet:', spreadsheetId);
  console.log('[GGL] Sheet:', sheetName);
  console.log('[GGL] Header row:', headerRow, '| Resolved data row (sheet):', dataStartRow);
  if (deleteTemplateBand) {
    console.log('[GGL] После удаления строк 3–5 шаблона запись каталога с строки', writeStartRow);
  }
  console.log('[GGL] Columns:', headers.length, '| Data rows:', valuesMatrix.length);
  console.log('[GGL] Target range:', dataRange);
  console.log('[GGL] Preview:', JSON.stringify(valuesMatrix[0]?.slice(0, 6)));

  if (!apply) {
    console.log('[GGL] Dry-run only. Pass --apply — строки 3–5 официального шаблона удаляются (DeleteDimension), каталог пишется со строки', writeStartRow, '.');
    console.log('[GGL] Merchant Center: см. docs/MERCHANT_SHEETS_GOOGLE_API.md');
    return;
  }

  const hintMode = merchantHintRestoreMode(headers);
  if (hintMode !== 'off') {
    await restoreMerchantHintRows(sheetsApi, spreadsheetId, sheetName, headerRow, lastCol, hintMode);
  } else {
    await clearSheetHintRow(sheetsApi, spreadsheetId, sheetName, headerRow, lastCol);
  }

  if (deleteTemplateBand) {
    await deleteMerchantTemplateRows(sheetsApi, spreadsheetId, sheetId, headerRow);
  }

  const clearRange = sheetRangeA1(sheetName, 1, writeStartRow, lastCol, 20000);
  await sheetsApi.spreadsheets.values.clear({
    spreadsheetId,
    range: clearRange
  });

  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: dataRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: valuesMatrix }
  });

  const verify = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName.replace(/'/g, "''")}'!A${writeStartRow}:C${writeStartRow}`
  });
  const vr = verify.data.values && verify.data.values[0];
  console.log('[GGL] Read-back row', writeStartRow, 'A:C:', JSON.stringify(vr));

  if (writeStartRow <= headerRow + 1) {
    console.warn('[GGL] Каталог почти под заголовком — проверьте MERCHANT_DATA_START_ROW.');
  } else {
    console.log('[GGL] Готово: подсказки в строке', headerRow + 1, '| каталог с', writeStartRow, deleteTemplateBand ? '(шаблонные строки 3–5 удалены)' : '');
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
