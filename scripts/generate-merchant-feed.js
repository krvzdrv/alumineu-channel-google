#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Generate Google Merchant Center XML feed (NL / FR / ES) from CAT contract data.
 *
 * Unified script for multi-country feeds. Validates prices — blocks markets without
 * site_price_rules (FR/ES until CAT adds them).
 *
 * Input: CSV export from CAT · Forge (product_variants + localizations + media + prices)
 * Output: feeds/google-merchant-{nl,fr,es}.xml
 *
 * Usage:
 *   node scripts/generate-merchant-feed.js --market=nl --input=feeds/cat-export-nl.csv
 *   node scripts/generate-merchant-feed.js --market=fr --input=feeds/cat-export-fr.csv --dry-run
 *   node scripts/generate-merchant-feed.js --market=es --input=feeds/cat-export-es.csv
 *
 * Markets:
 *   nl — active (prices available in CAT)
 *   fr — blocked until CAT writes site_price_rules (validation warns + skips)
 *   es — blocked until CAT writes site_price_rules (validation warns + skips)
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const MARKETS = {
  nl: {
    baseUrl: process.env.MERCHANT_NL_BASE_URL || 'https://alumineu.nl',
    currency: 'EUR',
    locale: 'nl',
    title: 'Alumineu NL — Aluminium Profiles & Moldings',
    description: 'Aluminium profiles, moldings and accessories for construction and interior design. Fast EU delivery.',
    priceColumn: 'amount_display'
  },
  fr: {
    baseUrl: process.env.MERCHANT_FR_BASE_URL || 'https://alumineu.fr',
    currency: 'EUR',
    locale: 'fr',
    title: 'Alumineu FR — Profilés et Moulures en Aluminium',
    description: 'Profilés, moulures et accessoires en aluminium pour la construction et le design intérieur. Livraison rapide en Europe.',
    priceColumn: 'amount_display'
  },
  es: {
    baseUrl: process.env.MERCHANT_ES_BASE_URL || 'https://alumineu.es',
    currency: 'EUR',
    locale: 'es',
    title: 'Alumineu ES — Perfiles y Molduras de Aluminio',
    description: 'Perfiles, molduras y accesorios de aluminio para construcción y diseño de interiores. Entrega rápida en Europa.',
    priceColumn: 'amount_display'
  }
};

function text(v) {
  return String(v == null ? '' : v).trim();
}

function escapeXml(s) {
  return text(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseArgs(argv) {
  let market = null;
  let input = null;
  let output = null;
  let dryRun = false;
  let strict = true;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--market=')) market = arg.slice('--market='.length).toLowerCase();
    if (arg.startsWith('--input=')) input = arg.slice('--input='.length);
    if (arg.startsWith('--output=')) output = arg.slice('--output='.length);
    if (arg === '--dry-run') dryRun = true;
    if (arg === '--no-strict') strict = false;
  }

  return { market, input, output, dryRun, strict };
}

function loadCatExport(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const filtered = raw.split(/\r?\n/).filter((line) => !line.startsWith('#')).join('\n');
  return parse(filtered, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  });
}

function groupAdditionalImages(rows) {
  const byVariant = new Map();
  for (const row of rows) {
    const variantKey = text(row.variant_key);
    const sku = text(row.sku);
    const id = `${sku}-${variantKey}`;
    const role = text(row.media_role).toLowerCase();
    const url = text(row.owned_url);
    const sort = parseInt(row.link_sort || '0', 10) || 0;

    if (!url) continue;
    if (!['close_up', 'interior', 'dimensions'].includes(role)) continue;

    if (!byVariant.has(id)) byVariant.set(id, []);
    byVariant.get(id).push({ url, sort });
  }

  for (const [, arr] of byVariant) {
    arr.sort((a, b) => a.sort - b.sort);
  }
  return byVariant;
}

function groupByVariant(rows) {
  const byId = new Map();
  for (const row of rows) {
    const sku = text(row.sku);
    const variantKey = text(row.variant_key);
    const id = `${sku}-${variantKey}`;

    if (!byId.has(id)) {
      byId.set(id, {
        ...row,
        id,
        sku,
        variantKey,
        additionalImages: []
      });
    }
  }
  return byId;
}

function generateFeed(products, additionalImagesByVariant, marketConfig) {
  const now = new Date().toISOString();
  const title = escapeXml(marketConfig.title);
  const link = escapeXml(marketConfig.baseUrl);
  const description = escapeXml(marketConfig.description);
  const currency = marketConfig.currency;

  const items = [];
  let skippedNoPrice = 0;
  let skippedMissingField = 0;

  for (const [id, p] of products) {
    const productSku = text(p.products_sku || p.sku);
    const itemGroupId = escapeXml(productSku);
    const productTitle = escapeXml(p.title || p.product_localizations_title || '');
    const productDesc = escapeXml(p.meta_description || p.product_seo_pages_meta_description || '');
    const urlPath = text(p.url_path || p.product_seo_pages_url_path || '');
    const productLink = escapeXml(`${marketConfig.baseUrl}/${urlPath}`.replace(/\/+/g, '/').replace(':/', '://'));
    const mainImage = escapeXml(p.main_image || p.image_link || '');
    const priceRaw = text(p.amount_display || p.price || '');
    const brand = escapeXml(p.brand || p.products_brand || 'alumineu');
    const availability = text(p.availability || 'in_stock').toLowerCase().replace(/\s+/g, '_');
    const condition = 'new';
    const identifierExists = 'no';

    const additional = additionalImagesByVariant.get(id) || [];
    const additionalLinks = additional.map((img) => escapeXml(img.url)).filter(Boolean);

    // Price validation — critical for FR/ES
    if (!priceRaw) {
      console.warn(`[GGL] SKIP ${id}: NO PRICE (market=${marketConfig.locale})`);
      skippedNoPrice++;
      continue;
    }

    // Other required fields
    if (!productTitle || !productLink || !mainImage) {
      console.warn(`[GGL] SKIP ${id}: missing required field (title=${!!productTitle}, link=${!!productLink}, image=${!!mainImage})`);
      skippedMissingField++;
      continue;
    }

    const price = priceRaw.includes(currency) ? priceRaw : `${priceRaw} ${currency}`;

    const itemLines = [
      '    <item>',
      `      <g:id>${escapeXml(id)}</g:id>`,
      `      <g:item_group_id>${itemGroupId}</g:item_group_id>`,
      `      <g:title>${productTitle}</g:title>`,
    ];

    if (productDesc) {
      itemLines.push(`      <g:description>${productDesc}</g:description>`);
    }

    itemLines.push(
      `      <g:link>${productLink}</g:link>`,
      `      <g:image_link>${mainImage}</g:image_link>`
    );

    for (const imgUrl of additionalLinks.slice(0, 10)) {
      itemLines.push(`      <g:additional_image_link>${imgUrl}</g:additional_image_link>`);
    }

    itemLines.push(
      `      <g:price>${escapeXml(price)}</g:price>`,
      `      <g:brand>${brand}</g:brand>`,
      `      <g:condition>${condition}</g:condition>`,
      `      <g:availability>${availability}</g:availability>`,
      `      <g:identifier_exists>${identifierExists}</g:identifier_exists>`
    );

    itemLines.push('    </item>');
    items.push(itemLines.join('\n'));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${title}</title>
    <link>${link}</link>
    <description>${description}</description>
    <lastBuildDate>${now}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`;

  return { xml, stats: { total: products.size, generated: items.length, skippedNoPrice, skippedMissingField } };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.market || !MARKETS[args.market]) {
    console.error('[GGL] Usage: node scripts/generate-merchant-feed.js --market=nl|fr|es --input=feeds/cat-export-{market}.csv [--output=...] [--dry-run] [--no-strict]');
    console.error('[GGL] Available markets:', Object.keys(MARKETS).join(', '));
    process.exit(1);
  }

  if (!args.input) {
    console.error('[GGL] Missing --input=feeds/cat-export-{market}.csv');
    process.exit(1);
  }

  if (!fs.existsSync(args.input)) {
    console.error(`[GGL] Input file not found: ${args.input}`);
    process.exit(1);
  }

  const marketConfig = MARKETS[args.market];
  const outputPath = args.output || path.join(ROOT, 'feeds', `google-merchant-${args.market}.xml`);

  console.log(`[GGL] Market: ${args.market.toUpperCase()}`);
  console.log(`[GGL] Base URL: ${marketConfig.baseUrl}`);
  console.log(`[GGL] Currency: ${marketConfig.currency}`);
  console.log(`[GGL] Reading CAT export: ${args.input}`);

  const rows = loadCatExport(args.input);
  console.log(`[GGL] Rows loaded: ${rows.length}`);

  const additionalImages = groupAdditionalImages(rows);
  console.log(`[GGL] Variants with additional images: ${additionalImages.size}`);

  const products = groupByVariant(rows);
  console.log(`[GGL] Unique product variants: ${products.size}`);

  const { xml, stats } = generateFeed(products, additionalImages, marketConfig);

  // Strict mode: if >50% products have no price, abort (typical for FR/ES before site_price_rules)
  const noPriceRatio = products.size > 0 ? stats.skippedNoPrice / products.size : 0;
  if (args.strict && noPriceRatio > 0.5) {
    console.error(`[GGL] ABORT: ${(noPriceRatio * 100).toFixed(0)}% products have no price.`);
    console.error(`[GGL] Market ${args.market.toUpperCase()} is not ready — CAT site_price_rules missing.`);
    console.error(`[GGL] Run with --no-strict to force generation (not recommended for production).`);
    process.exit(2);
  }

  if (args.dryRun) {
    console.log('[GGL] DRY RUN — feed preview (first 2000 chars):');
    console.log(xml.slice(0, 2000));
    console.log('...');
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, xml, 'utf8');
    console.log(`[GGL] Feed written: ${outputPath}`);
    console.log(`[GGL] File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
  }

  console.log(`[GGL] Feed stats:`);
  console.log(`  - Total variants: ${stats.total}`);
  console.log(`  - Generated items: ${stats.generated}`);
  console.log(`  - Skipped (no price): ${stats.skippedNoPrice}`);
  console.log(`  - Skipped (missing field): ${stats.skippedMissingField}`);

  if (stats.generated === 0) {
    console.error('[GGL] WARNING: Feed contains 0 items. Check input data and price columns.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[GGL] ERROR:', err.message || err);
  process.exit(1);
});
