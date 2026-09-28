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
  // Terms mirror the WEB delivery page: 14 days, by mail, return shipping paid by the customer.
  return {
    label: `Returns ${market.code}`,
    countries: [...market.targetCountries],
    returnPolicyUri: uri,
    policy: { type: 'NUMBER_OF_DAYS_AFTER_DELIVERY', days: '14' },
    returnMethods: ['BY_MAIL'],
    itemConditions: ['NEW'],
    returnShippingFee: { type: 'CUSTOMER_PAYING_ACTUAL_FEE' },
    returnLabelSource: 'CUSTOMER_RESPONSIBILITY',
    processRefundDays: 14
  };
}

function policyMatches(p, body) {
  return (
    text(p.returnPolicyUri) === body.returnPolicyUri &&
    text(p.returnShippingFee?.type) === body.returnShippingFee.type &&
    text(p.policy?.type) === body.policy.type &&
    text(p.policy?.days) === body.policy.days
  );
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
  const all = await listPolicies(merchantFetch, merchantId);
  const uri = text(market.returnsPolicyUri);
  const desired = buildReturnPolicyBody(market);
  const stale = all.filter((p) => !policyMatches(p, desired));
  const existing = all.filter((p) => policyMatches(p, desired));

  for (const p of stale) {
    console.log(
      `  stale policy ${p.returnPolicyId} → ${p.returnPolicyUri} fee=${p.returnShippingFee?.type} days=${p.policy?.days || '-'}`
    );
    if (apply) {
      await merchantFetch(`/accounts/v1/accounts/${merchantId}/onlineReturnPolicies/${p.returnPolicyId}`, {
        method: 'DELETE'
      });
      console.log(`  deleted ${p.returnPolicyId}`);
    }
  }

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

  const body = desired;
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
