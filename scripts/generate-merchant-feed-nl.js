#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Generate Google Merchant Center XML feed (NL) from CAT contract data.
 *
 * Input: CSV export from CAT · Forge (product_variants + localizations + media + prices)
 * Output: feeds/google-merchant-nl.xml (RSS 2.0 / Atom / Google Merchant format)
 *
 * Usage:
 *   node scripts/generate-merchant-feed-nl.js --input=feeds/cat-export-nl.csv
 *   node scripts/generate-merchant-feed-nl.js --input=feeds/cat-export-nl.csv --output=feeds/google-merchant-nl.xml
 *
 * CAT contract fields (2026-09-03):
 *   g:id = sku + '-' + variant_key
 *   g:item_group_id = products.sku
 *   g:title = product_localizations.title
 *   g:description = product_seo_pages.meta_description
 *   g:link = sites.base_url + product_seo_pages.url_path
 *   g:image_link = contract_product_media.owned_url (role='main')
 *   g:additional_image_link = owned_url (role in close_up, interior, dimensions)
 *   g:price = amount_display + currency_display (EUR, indicative, excl. VAT)
 *   g:brand = products.brand
 *   g:condition = new
 *   g:gtin = absent → identifier_exists=false
 *   g:availability = from DAT inventory_position_wms_adjusted
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

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
  let input = null;
  let output = path.join(ROOT, 'feeds', 'google-merchant-nl.xml');
  let baseUrl = process.env.MERCHANT_NL_BASE_URL || 'https://alumineu.nl';
  let dryRun = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--input=')) input = arg.slice('--input='.length);
    if (arg.startsWith('--output=')) output = arg.slice('--output='.length);
    if (arg.startsWith('--base-url=')) baseUrl = arg.slice('--base-url='.length);
    if (arg === '--dry-run') dryRun = true;
  }
  return { input, output, baseUrl, dryRun };
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

/** Group additional images by product_variant, sorted by link_sort. */
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

/** Group rows by unique product variant (one row per variant). */
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

function generateFeed(products, additionalImagesByVariant, baseUrl) {
  const now = new Date().toISOString();
  const title = escapeXml('Alumineu NL — Aluminium Profiles & Moldings');
  const link = escapeXml(baseUrl);
  const description = escapeXml('Aluminium profiles, moldings and accessories for construction and interior design. Fast EU delivery.');

  const items = [];
  for (const [id, p] of products) {
    const productSku = text(p.products_sku || p.sku);
    const itemGroupId = escapeXml(productSku);
    const productTitle = escapeXml(p.title || p.product_localizations_title || '');
    const productDesc = escapeXml(p.meta_description || p.product_seo_pages_meta_description || '');
    const urlPath = text(p.url_path || p.product_seo_pages_url_path || '');
    const productLink = escapeXml(`${baseUrl}/${urlPath}`.replace(/\/+/g, '/').replace(':/', '://'));
    const mainImage = escapeXml(p.main_image || p.image_link || '');
    const priceRaw = text(p.amount_display || p.price || '');
    const currency = text(p.currency_display || 'EUR');
    const brand = escapeXml(p.brand || p.products_brand || 'alumineu');
    const availability = text(p.availability || 'in_stock').toLowerCase().replace(/\s+/g, '_');
    const condition = 'new';
    const identifierExists = 'no';

    // additional images
    const additional = additionalImagesByVariant.get(id) || [];
    const additionalLinks = additional.map((img) => escapeXml(img.url)).filter(Boolean);

    // Validate required fields
    if (!productTitle || !productLink || !mainImage || !priceRaw) {
      console.warn(`[GGL] SKIP ${id}: missing required field (title=${!!productTitle}, link=${!!productLink}, image=${!!mainImage}, price=${!!priceRaw})`);
      continue;
    }

    // Price formatting: ensure EUR format
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

  return xml;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.input) {
    console.error('[GGL] Usage: node scripts/generate-merchant-feed-nl.js --input=feeds/cat-export-nl.csv [--output=...]');
    console.error('[GGL] Expected CAT CSV columns: sku, variant_key, title, meta_description, url_path, main_image, amount_display, currency_display, brand, availability, products_sku, owned_url, media_role, link_sort');
    process.exit(1);
  }

  if (!fs.existsSync(args.input)) {
    console.error(`[GGL] Input file not found: ${args.input}`);
    process.exit(1);
  }

  console.log(`[GGL] Reading CAT export: ${args.input}`);
  const rows = loadCatExport(args.input);
  console.log(`[GGL] Rows loaded: ${rows.length}`);

  const additionalImages = groupAdditionalImages(rows);
  console.log(`[GGL] Variants with additional images: ${additionalImages.size}`);

  const products = groupByVariant(rows);
  console.log(`[GGL] Unique product variants: ${products.size}`);

  const xml = generateFeed(products, additionalImages, args.baseUrl);

  if (args.dryRun) {
    console.log('[GGL] DRY RUN — feed preview (first 2000 chars):');
    console.log(xml.slice(0, 2000));
    console.log('...');
  } else {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, xml, 'utf8');
    console.log(`[GGL] Feed written: ${args.output}`);
    console.log(`[GGL] File size: ${(fs.statSync(args.output).size / 1024).toFixed(1)} KB`);
  }

  // Stats
  console.log(`[GGL] Feed stats:`);
  console.log(`  - Products: ${products.size}`);
  console.log(`  - Additional image variants: ${additionalImages.size}`);
  console.log(`  - Base URL: ${args.baseUrl}`);
}

main().catch((err) => {
  console.error('[GGL] ERROR:', err.message || err);
  process.exit(1);
});
