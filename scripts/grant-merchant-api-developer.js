#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Выдать роль API_DEVELOPER для alumineu.pl@gmail.com (OAuth user, не SA).
 *
 *   npm run merchant:api:grant-developer
 *
 * Требует token-merchant.json (npm run merchant:auth).
 */
const path = require('path');
const { merchantUserFetch } = require('./lib/merchant-oauth-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const MCA_ID = process.env.GOOGLE_MERCHANT_MCA_ID || '5797974210';
const PL_ID = process.env.GOOGLE_MERCHANT_ID || '5785188396';
const EMAIL = process.env.MERCHANT_DEVELOPER_EMAIL || 'alumineu.pl@gmail.com';

async function patchUser(accountId, currentRights = ['ADMIN']) {
  const encoded = encodeURIComponent(EMAIL);
  const rights = [...new Set([...currentRights, 'API_DEVELOPER'])];
  const url = `/accounts/v1/accounts/${accountId}/users/${encoded}?updateMask=accessRights`;
  const body = {
    name: `accounts/${accountId}/users/${EMAIL}`,
    accessRights: rights,
  };
  const res = await merchantUserFetch(ROOT, url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const hasDev = (res.accessRights || []).includes('API_DEVELOPER');
  console.log(`[GGL] ${accountId}: ${res.accessRights?.join(', ') || '(none)'} API_DEVELOPER=${hasDev ? '✅' : '❌'}`);
  return hasDev;
}

async function registerGcpOnPl() {
  const url = `/accounts/v1/accounts/${PL_ID}/developerRegistration:registerGcp`;
  try {
    const res = await merchantUserFetch(ROOT, url, {
      method: 'POST',
      body: JSON.stringify({ developerEmail: EMAIL }),
    });
    console.log(`[GGL] registerGcp PL:`, JSON.stringify(res));
    return true;
  } catch (e) {
    if (e.status === 409) {
      console.log('[GGL] registerGcp PL: GCP уже привязан (OK)');
      return true;
    }
    console.log('[GGL] registerGcp PL ERR:', e.message?.slice(0, 300));
    return false;
  }
}

async function main() {
  console.log('[GGL] Grant Merchant API_DEVELOPER');
  console.log('[GGL] Email:', EMAIL);
  console.log('[GGL] MCA:', MCA_ID, '| PL:', PL_ID);

  let okMca = false;
  try {
    okMca = await patchUser(MCA_ID, ['ADMIN']);
  } catch (e) {
    console.log('[GGL] MCA patch ERR:', e.message?.slice(0, 400));
  }

  let okPl = false;
  try {
    okPl = await patchUser(PL_ID, ['ADMIN']);
  } catch (e) {
    if (e.status === 404) {
      console.log('[GGL] PL users: пользователь не на sub — пробуем registerGcp…');
      await registerGcpOnPl();
      try {
        okPl = await patchUser(PL_ID, ['ADMIN']);
      } catch (e2) {
        console.log('[GGL] PL patch ERR:', e2.message?.slice(0, 400));
      }
    } else {
      console.log('[GGL] PL patch ERR:', e.message?.slice(0, 400));
    }
  }

  if (!okMca && !okPl) {
    console.error('\n[GGL] FAIL — API_DEVELOPER не выдан. Fallback: UI → docs/MERCHANT_API_DEVELOPER_FIX.md');
    process.exit(1);
  }

  console.log('\n[GGL] OK — проверка: npm run merchant:api:developer-status');
}

main().catch((e) => {
  console.error('[GGL] FAIL:', e.message);
  if (/token-merchant/.test(e.message)) {
    console.error('[GGL] Сначала: npm run merchant:auth');
  }
  process.exit(1);
});
