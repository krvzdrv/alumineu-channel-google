#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Статус developer registration и users (API developer role).
 *
 *   npm run merchant:api:developer-status
 *   GOOGLE_MERCHANT_ID=5797974210 npm run merchant:api:developer-status
 */
const path = require('path');
const { createMerchantClient } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const MCA_ID = process.env.GOOGLE_MERCHANT_MCA_ID || '5797974210';
const PL_ID = process.env.GOOGLE_MERCHANT_ID || '5785188396';

async function showAccount(client, accountId, label) {
  console.log(`\n[GGL] === ${label} (${accountId}) ===`);
  try {
    const reg = await client.merchantFetch(
      `/accounts/v1/accounts/${accountId}/developerRegistration`
    );
    console.log('developerRegistration:', JSON.stringify(reg));
  } catch (e) {
    console.log('developerRegistration ERR:', e.message?.slice(0, 200));
  }
  try {
    const users = await client.merchantFetch(`/accounts/v1/accounts/${accountId}/users`);
    for (const u of users.users || []) {
      const email = (u.name || '').split('/').pop();
      const rights = (u.accessRights || []).join(', ');
      const apiDev = (u.accessRights || []).includes('API_DEVELOPER') ? '✅' : '❌';
      console.log(`  user ${email}: ${rights} API_DEVELOPER=${apiDev}`);
    }
    if (!(users.users || []).length) console.log('  (no users listed via API for this account)');
  } catch (e) {
    console.log('users ERR:', e.message?.slice(0, 200));
  }
}

async function main() {
  const client = await createMerchantClient(ROOT);
  console.log('[GGL] Merchant API developer status');
  console.log('[GGL] GCP project: oceanic-craft-452806-c0 (820829065208)');
  await showAccount(client, MCA_ID, 'MCA parent');
  await showAccount(client, PL_ID, 'PL sub');
  console.log('\n[GGL] Fix: alumineu.pl@gmail.com needs API_DEVELOPER — см. docs/MERCHANT_API_DEVELOPER_FIX.md');
}

main().catch((e) => {
  console.error('[GGL]', e.message);
  process.exit(1);
});
