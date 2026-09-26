#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Check tax settings for NL/FR/ES sub-accounts via Merchant API.
 */
const { createMerchantClient } = require('./lib/merchant-api-client');
const { MARKETS } = require('./lib/merchant-markets');

async function checkTax(merchantId, merchantFetch) {
  try {
    const tax = await merchantFetch(`/accounts/v1/accounts/${merchantId}/taxSettings`);
    console.log(`[GGL] ${merchantId} taxSettings:`, JSON.stringify(tax, null, 2).slice(0, 800));
    return tax;
  } catch (e) {
    console.log(`[GGL] ${merchantId} taxSettings error: ${e.status} ${e.message.slice(0, 200)}`);
    return null;
  }
}

async function main() {
  const ROOT = require('path').join(__dirname, '..');
  const { merchantFetch } = await createMerchantClient(ROOT);

  for (const market of ['NL', 'FR', 'ES']) {
    const m = MARKETS[market];
    if (!m || !m.merchantAccountId) {
      console.log(`[GGL] ${market}: no merchantAccountId`);
      continue;
    }
    console.log(`\n[GGL] Checking tax settings for ${market} (${m.merchantAccountId})...`);
    await checkTax(m.merchantAccountId, merchantFetch);
  }
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
