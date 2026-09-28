#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Point Merchant Center primary data source at WEB-hosted XML (NL/FR/ES/DE/RO).
 *
 * If the sub-account already has a primary source with the same feedLabel, its fetchUri
 * is patched (no second primary → no duplicate products). Otherwise a new source is created.
 * --fetch-now triggers an immediate fetch after apply.
 *
 * Usage:
 *   node scripts/create-merchant-feed-sources.js --market=de --dry-run
 *   node scripts/create-merchant-feed-sources.js --market=de --apply --fetch-now
 */

const path = require('path');
const { createMerchantClient } = require('./lib/merchant-api-client');
const { resolveMarket } = require('./lib/merchant-markets');

const ROOT = path.join(__dirname, '..');

const FEEDS = {
  nl: { name: 'alumineu-nl', language: 'nl', country: 'NL', feedLabel: 'NL', timeZone: 'Europe/Amsterdam' },
  fr: { name: 'alumineu-fr', language: 'fr', country: 'FR', feedLabel: 'FR', timeZone: 'Europe/Paris' },
  es: { name: 'alumineu-es', language: 'es', country: 'ES', feedLabel: 'ES', timeZone: 'Europe/Madrid' },
  de: { name: 'alumineu-de', language: 'de', country: 'DE', feedLabel: 'DE', timeZone: 'Europe/Berlin' },
  ro: { name: 'alumineu-ro', language: 'ro', country: 'RO', feedLabel: 'RO', timeZone: 'Europe/Bucharest' }
};

function feedUrl(code) {
  return `https://alumineu.${code}/feeds/google-merchant-${code}.xml`;
}

function parseArgs(argv) {
  let apply = false;
  let fetchNow = false;
  let market = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') apply = true;
    if (argv[i] === '--dry-run') apply = false;
    if (argv[i] === '--fetch-now') fetchNow = true;
    if (argv[i].startsWith('--market=')) market = argv[i].slice('--market='.length).toLowerCase();
  }
  return { apply, fetchNow, market };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.market || !FEEDS[args.market]) {
    console.error(
      `[GGL] Usage: node scripts/create-merchant-feed-sources.js --market=${Object.keys(FEEDS).join('|')} [--apply] [--fetch-now]`
    );
    process.exit(1);
  }

  const market = resolveMarket(args.market.toUpperCase());
  const merchantId = market.merchantAccountId;
  if (!merchantId) {
    console.error(`[GGL] No merchantAccountId for market ${args.market.toUpperCase()}. Create sub-account first.`);
    process.exit(1);
  }

  process.env.GOOGLE_MERCHANT_ID = merchantId;
  const { merchantFetch, listAllPages } = await createMerchantClient(ROOT);
  const feed = { ...FEEDS[args.market], fetchUrl: feedUrl(args.market) };

  console.log(`[GGL] Merchant ID: ${merchantId} (${market.code})`);
  console.log(`[GGL] Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`[GGL] Feed URL: ${feed.fetchUrl}`);

  const sources = await listAllPages((pageToken) => {
    const q = new URLSearchParams({ pageSize: '100' });
    if (pageToken) q.set('pageToken', pageToken);
    return merchantFetch(`/datasources/v1/accounts/${merchantId}/dataSources?${q}`);
  });
  const existing = sources.find(
    (ds) => ds.primaryProductDataSource && ds.primaryProductDataSource.feedLabel === feed.feedLabel
  );

  let sourceName;
  if (existing) {
    const oldUri = existing.fileInput?.fetchSettings?.fetchUri || '(none)';
    console.log(`[GGL] Existing primary: ${existing.name} (${existing.displayName})`);
    console.log(`  fetchUri: ${oldUri} → ${feed.fetchUrl}`);
    sourceName = existing.name;
    if (args.apply) {
      const body = {
        fileInput: {
          fileInputType: 'FETCH',
          fetchSettings: {
            enabled: true,
            frequency: 'FREQUENCY_DAILY',
            fetchUri: feed.fetchUrl,
            timeZone: feed.timeZone
          }
        }
      };
      const res = await merchantFetch(`/datasources/v1/${existing.name}?updateMask=fileInput.fetchSettings`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
      console.log(`  ✅ Patched: ${res.fileInput?.fetchSettings?.fetchUri}`);
    }
  } else {
    const body = {
      displayName: feed.name,
      primaryProductDataSource: {
        feedLabel: feed.feedLabel,
        contentLanguage: feed.language,
        countries: [feed.country]
      },
      input: 'FILE',
      fileInput: {
        fileInputType: 'FETCH',
        fetchSettings: {
          enabled: true,
          frequency: 'FREQUENCY_DAILY',
          fetchUri: feed.fetchUrl,
          timeZone: feed.timeZone
        }
      }
    };
    console.log('[GGL] No primary source with this feedLabel — will create.');
    if (args.apply) {
      const res = await merchantFetch(`/datasources/v1/accounts/${merchantId}/dataSources`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      sourceName = res.name;
      console.log(`  ✅ Created: ${res.name}`);
    } else {
      console.log(`  body: ${JSON.stringify(body)}`);
    }
  }

  if (args.apply && args.fetchNow && sourceName) {
    await merchantFetch(`/datasources/v1/${sourceName}:fetch`, { method: 'POST', body: '{}' });
    console.log('  ✅ Fetch triggered');
  }

  if (!args.apply) console.log('\n[GGL] DRY RUN complete. Run with --apply to write.');
}

main().catch((err) => {
  console.error('[GGL] ERROR:', err.message || err);
  if (err.body) console.error(`  Body: ${JSON.stringify(err.body).slice(0, 500)}`);
  process.exit(1);
});
