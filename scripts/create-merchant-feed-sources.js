#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Create Merchant Center data sources (feeds) for NL/FR/ES.
 *
 * Creates primary feed sources with scheduled fetch from WEB-hosted XML.
 * Uses Merchant API (datasources/v1).
 *
 * Usage:
 *   node scripts/create-merchant-feed-sources.js --dry-run
 *   node scripts/create-merchant-feed-sources.js --apply
 */

const path = require('path');
const { createMerchantClient } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

const FEEDS = [
  {
    name: 'alumineu-nl',
    fetchUrl: 'https://alumineu.nl/feeds/google-merchant-nl.xml',
    language: 'nl',
    country: 'NL',
    feedLabel: 'NL',
    timeZone: 'Europe/Amsterdam'
  },
  {
    name: 'alumineu-fr',
    fetchUrl: 'https://alumineu.fr/feeds/google-merchant-fr.xml',
    language: 'fr',
    country: 'FR',
    feedLabel: 'FR',
    timeZone: 'Europe/Paris'
  },
  {
    name: 'alumineu-es',
    fetchUrl: 'https://alumineu.es/feeds/google-merchant-es.xml',
    language: 'es',
    country: 'ES',
    feedLabel: 'ES',
    timeZone: 'Europe/Madrid'
  }
];

function parseArgs(argv) {
  let apply = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') apply = true;
    if (argv[i] === '--dry-run') apply = false;
  }
  return { apply };
}

async function main() {
  const { apply } = parseArgs(process.argv);
  const { merchantId, merchantFetch } = await createMerchantClient(ROOT);

  console.log(`[GGL] Merchant ID: ${merchantId}`);
  console.log(`[GGL] Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);

  for (const feed of FEEDS) {
    console.log(`\n[GGL] Feed: ${feed.name}`);
    console.log(`  URL: ${feed.fetchUrl}`);
    console.log(`  Language: ${feed.language}, Country: ${feed.country}, FeedLabel: ${feed.feedLabel}`);

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

    if (apply) {
      try {
        const res = await merchantFetch(
          `/datasources/v1/accounts/${merchantId}/dataSources`,
          {
            method: 'POST',
            body: JSON.stringify(body)
          }
        );
        console.log(`  ✅ Created: ${res.name || JSON.stringify(res)}`);
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        if (err.body) console.error(`     Body: ${JSON.stringify(err.body).slice(0, 500)}`);
      }
    } else {
      console.log(`  📋 Would create with body:`);
      console.log(`     ${JSON.stringify(body, null, 2).split('\n').join('\n     ')}`);
    }
  }

  if (!apply) {
    console.log('\n[GGL] DRY RUN complete. Run with --apply to create feeds.');
  }
}

main().catch((err) => {
  console.error('[GGL] ERROR:', err.message || err);
  process.exit(1);
});
