#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Пригласить оператора напрямую на PL sub (email НЕ должен быть на MCA parent).
 *
 *   MERCHANT_PL_OPERATOR_EMAIL=you@gmail.com npm run merchant:api:invite-pl-operator
 *
 * Требует token-merchant.json (MCA admin: npm run merchant:auth).
 */
const path = require('path');
const { merchantUserFetch } = require('./lib/merchant-oauth-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const PL_ID = process.env.GOOGLE_MERCHANT_ID || '5785188396';
const MCA_ID = process.env.GOOGLE_MERCHANT_MCA_ID || '5797974210';
const EMAIL = String(process.env.MERCHANT_PL_OPERATOR_EMAIL || '').trim();

async function main() {
  if (!EMAIL) {
    console.error('[GGL] Задайте MERCHANT_PL_OPERATOR_EMAIL в .env');
    console.error('[GGL] Email не должен быть в People на MCA', MCA_ID);
    console.error('[GGL] См. docs/MERCHANT_API_OPERATOR_ACCESS.md');
    process.exit(1);
  }

  console.log('[GGL] Invite PL operator');
  console.log('[GGL] PL sub:', PL_ID);
  console.log('[GGL] Email:', EMAIL);

  const res = await merchantUserFetch(
    ROOT,
    `/accounts/v1/accounts/${PL_ID}/users?userId=${encodeURIComponent(EMAIL)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        accessRights: ['ADMIN', 'API_DEVELOPER'],
      }),
    }
  );

  console.log('[GGL] Invitation created:', JSON.stringify(res));
  console.log('[GGL] 1) Принять приглашение в почте', EMAIL);
  console.log('[GGL] 2) npm run merchant:auth:pl  (вход под этим email)');
  console.log('[GGL] 3) npm run merchant:api:migrate-gcp-mca');
}

main().catch((e) => {
  console.error('[GGL] FAIL:', e.message?.slice(0, 600));
  if (/parent multi-client/.test(e.message)) {
    console.error('[GGL] Этот email уже на MCA — выберите другой MERCHANT_PL_OPERATOR_EMAIL');
  }
  if (/token-merchant/.test(e.message)) {
    console.error('[GGL] Сначала: npm run merchant:auth (alumineu.pl@gmail.com)');
  }
  process.exit(1);
});
