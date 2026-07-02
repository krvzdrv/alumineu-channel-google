#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Create or verify online return policies per market (Merchant API).
 *
 * Usage:
 *   GOOGLE_MERCHANT_ID=5798257792 npm run merchant:api:return-policy -- --market=DE
 *   GOOGLE_MERCHANT_ID=5798257792 npm run merchant:api:return-policy -- --market=DE --apply
 *   npm run merchant:api:return-policy -- --all --apply
 */

const path = require('path');
const { createMerchantClient, parseCliFlags } = require('./lib/merchant-api-client');
const { listMarketCodes, resolveMarket } = require('./lib/merchant-markets');

const ROOT = path.join(__dirname, '..');

function text(v) {
  return String(v == null ? '' : v).trim();
}

function parseArgs(argv) {
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

function buildReturnPolicyBody(market) {
  const uri = text(market.returnsPolicyUri);
  if (!uri) throw new Error(`returnsPolicyUri missing for ${market.code}`);
  return {
    label: `Returns ${market.code}`,
    countries: [...market.targetCountries],
    returnPolicyUri: uri,
    returnMethods: ['BY_MAIL'],
    itemConditions: ['NEW'],
    returnShippingFee: {
      type: 'FIXED',
      fixedFee: {
        amountMicros: '0',
        currencyCode: market.currency
      }
    },
    acceptExchange: true,
    returnLabelSource: 'IN_THE_PACKAGE',
    processRefundDays: 14
  };
}

function policyCoversCountries(existing, countries) {
  const have = new Set((existing || []).flatMap((p) => p.countries || []));
  return countries.every((c) => have.has(c));
}

async function listPolicies(merchantFetch, merchantId) {
  try {
    const res = await merchantFetch(`/accounts/v1/accounts/${merchantId}/onlineReturnPolicies`);
    return res.onlineReturnPolicies || [];
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

async function applyMarket(merchantFetch, merchantId, market, apply) {
  const existing = await listPolicies(merchantFetch, merchantId);
  const uri = text(market.returnsPolicyUri);
  const matching = existing.filter((p) => text(p.returnPolicyUri) === uri);
  const covered = policyCoversCountries(existing, market.targetCountries);

  console.log(`\n[GGL] ${market.code} (${merchantId})`);
  console.log(`  returns URI: ${uri}`);
  console.log(`  countries: ${market.targetCountries.length}`);
  console.log(`  existing policies: ${existing.length}`);

  if (existing.length) {
    for (const p of existing) {
      console.log(
        `  - id=${p.returnPolicyId} countries=${(p.countries || []).join(',')} uri=${p.returnPolicyUri || '?'}`
      );
    }
  }

  if (covered) {
    console.log('[GGL] OK — all target countries already have a return policy');
    return { created: false, skipped: true };
  }

  const body = buildReturnPolicyBody(market);
  console.log('[GGL] Would create return policy for:', body.countries.join(','));

  if (!apply) {
    console.log('[GGL] DRY RUN — add --apply');
    return { created: false, dryRun: true };
  }

  const created = await merchantFetch(`/accounts/v1/accounts/${merchantId}/onlineReturnPolicies`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  console.log(`[GGL] Created return policy ${created.returnPolicyId} → ${created.returnPolicyUri}`);
  return { created: true, policy: created };
}

async function main() {
  const flags = parseArgs(process.argv);
  const { merchantId, merchantFetch } = await createMerchantClient(ROOT);

  const markets = flags.all
    ? listMarketCodes().map((code) => resolveMarket(code))
    : [resolveMarket(flags.market || process.env.MERCHANT_MARKET || 'PL')];

  for (const market of markets) {
    if (market.merchantAccountId && market.merchantAccountId !== merchantId) {
      console.warn(
        `[GGL] Skip ${market.code}: GOOGLE_MERCHANT_ID=${merchantId} ≠ market account ${market.merchantAccountId}`
      );
      continue;
    }
    await applyMarket(merchantFetch, merchantId, market, flags.apply);
  }
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
