#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Миграция GCP registration: PL sub → MCA parent (рекомендация Google).
 * После этого registerGcp/unregisterGcp и API_DEVELOPER — через API (MCA token).
 *
 *   npm run merchant:api:migrate-gcp-mca
 *
 * Требует:
 *   token-merchant-pl.json  — PL operator (unregister на PL)
 *   token-merchant.json     — MCA admin (register на MCA)
 */
const path = require('path');
const { merchantPlFetch, PL_ID } = require('./lib/merchant-pl-oauth-client');
const { merchantUserFetch } = require('./lib/merchant-oauth-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const MCA_ID = process.env.GOOGLE_MERCHANT_MCA_ID || '5797974210';
const DEV_EMAIL = process.env.MERCHANT_DEVELOPER_EMAIL || 'alumineu.pl@gmail.com';

async function gcpAccountId() {
  try {
    const r = await merchantPlFetch(ROOT, '/accounts/v1/accounts:getAccountForGcpRegistration');
    return String(r?.name || '').replace('accounts/', '') || null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('[GGL] Migrate GCP registration → MCA');
  console.log('[GGL] PL:', PL_ID, '| MCA:', MCA_ID);
  console.log('[GGL] developerEmail:', DEV_EMAIL);

  const before = await gcpAccountId();
  console.log('[GGL] GCP registered on:', before || '(unknown)');

  if (before === MCA_ID) {
    console.log('[GGL] Already on MCA — nothing to do.');
    return;
  }

  if (before === PL_ID) {
    console.log('[GGL] Step 1: unregisterGcp on PL (PL operator token)…');
    await merchantPlFetch(
      ROOT,
      `/accounts/v1/accounts/${PL_ID}/developerRegistration:unregisterGcp`,
      { method: 'POST', body: '{}' }
    );
    console.log('[GGL] PL unregister OK (API works ≤1 day без re-register)');
  }

  console.log('[GGL] Step 2: registerGcp on MCA (MCA admin token)…');
  try {
    const reg = await merchantUserFetch(
      ROOT,
      `/accounts/v1/accounts/${MCA_ID}/developerRegistration:registerGcp`,
      {
        method: 'POST',
        body: JSON.stringify({ developerEmail: DEV_EMAIL }),
      }
    );
    console.log('[GGL] MCA register OK:', JSON.stringify(reg));
  } catch (e) {
    if (e.status === 409) {
      console.log('[GGL] MCA register: GCP already registered (409)');
    } else {
      throw e;
    }
  }

  let after = null;
  try {
    const r = await merchantUserFetch(ROOT, '/accounts/v1/accounts:getAccountForGcpRegistration');
    after = String(r?.name || '').replace('accounts/', '') || null;
  } catch {
    after = await gcpAccountId();
  }
  console.log('[GGL] GCP now on:', after || '(check UI)');

  // refresh developer contact email on MCA user
  try {
    const enc = encodeURIComponent(DEV_EMAIL);
    const patched = await merchantUserFetch(
      ROOT,
      `/accounts/v1/accounts/${MCA_ID}/users/${enc}?updateMask=accessRights`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: `accounts/${MCA_ID}/users/${DEV_EMAIL}`,
          accessRights: ['ADMIN', 'API_DEVELOPER'],
        }),
      }
    );
    console.log('[GGL] MCA user:', (patched.accessRights || []).join(', '));
  } catch (e) {
    console.log('[GGL] MCA user patch:', e.message?.slice(0, 200));
  }

  console.log('\n[GGL] Done. Check: npm run merchant:api:developer-status && npm run merchant:api:verify');
  console.log('[GGL] На почту', DEV_EMAIL, 'может прийти письмо подтверждения — Принять в течение 14 дней.');
}

main().catch((e) => {
  console.error('[GGL] FAIL:', e.message?.slice(0, 800));
  if (/token-merchant-pl/.test(e.message)) {
    console.error('[GGL] Setup: docs/MERCHANT_API_OPERATOR_ACCESS.md');
  }
  process.exit(1);
});
