#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Upsert per-market shipping services in Merchant Center.
 *
 * Usage:
 *   npm run merchant:api:market-shipping -- --market=DE
 *   npm run merchant:api:market-shipping -- --market=DE --apply
 *   npm run merchant:api:market-shipping -- --all --apply
 */

const path = require('path');
const {
  createMerchantClient,
  parseCliFlags
} = require('./lib/merchant-api-client');
const {
  listMarketCodes,
  resolveMarket,
  buildShippingService,
  mergeShippingServices
} = require('./lib/merchant-markets');

const ROOT = path.join(__dirname, '..');

function text(v) {
  return String(v == null ? '' : v).trim();
}

function parseMarketFlags(argv) {
  const flags = parseCliFlags(argv);
  flags.all = argv.includes('--all');
  flags.market = '';
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--market=')) flags.market = text(a.slice(9)).toUpperCase();
    if (a === '--market' && argv[i + 1]) flags.market = text(argv[i + 1]).toUpperCase();
  }
  return flags;
}

async function main() {
  const flags = parseMarketFlags(process.argv);
  const { merchantId, merchantFetch } = await createMerchantClient(ROOT);
  const base = `/accounts/v1/accounts/${merchantId}`;
  let shippingCurrent;
  try {
    shippingCurrent = await merchantFetch(`${base}/shippingSettings`);
  } catch (e) {
    if (e.status !== 404) throw e;
    shippingCurrent = null;
  }

  const markets = flags.all
    ? listMarketCodes().map((code) => resolveMarket(code))
    : [resolveMarket(flags.market || process.env.MERCHANT_MARKET || 'PL')];

  const template = shippingCurrent?.services?.[0] || null;
  const newServices = markets.map((m) => buildShippingService(m, template));
  const merged = shippingCurrent
    ? mergeShippingServices(shippingCurrent.services, newServices)
    : newServices;

  console.log(`[GGL] Merchant ${merchantId}: shipping services after merge: ${merged.length}`);
  for (const svc of merged) {
    console.log(
      `  - ${svc.serviceName}: ${svc.deliveryCountries?.join(',')} | ${svc.currencyCode} | flat ${svc.rateGroups?.[0]?.singleValue?.flatRate?.amountMicros}`
    );
  }

  const body = {
    name: `${base}/shippingSettings`,
    services: merged,
    etag: shippingCurrent?.etag || ''
  };

  if (flags.dryRun && !flags.apply) {
    console.log('\n[GGL] DRY RUN — для применения добавьте --apply');
    return;
  }

  const res = await merchantFetch(`${base}/shippingSettings:insert`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  console.log(`[GGL] OK shippingSettings.insert (${res.services?.length || 0} service(s))`);
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
