#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Перерегистрация developer contact через API (после migrate-gcp-mca).
 *
 *   npm run merchant:api:reregister-contact-api
 */
const path = require('path');
const { merchantUserFetch } = require('./lib/merchant-oauth-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const MCA_ID = process.env.GOOGLE_MERCHANT_MCA_ID || '5797974210';
const EMAIL = process.env.MERCHANT_DEVELOPER_EMAIL || 'alumineu.pl@gmail.com';

async function main() {
  console.log('[GGL] Re-register developer contact via API (MCA)');
  const enc = encodeURIComponent(EMAIL);

  try {
    await merchantUserFetch(
      ROOT,
      `/accounts/v1/accounts/${MCA_ID}/users/${enc}?updateMask=accessRights`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: `accounts/${MCA_ID}/users/${EMAIL}`,
          accessRights: ['ADMIN', 'API_DEVELOPER'],
        }),
      }
    );
  } catch (e) {
    console.log('[GGL] patch note:', e.message?.slice(0, 200));
  }

  try {
    await merchantUserFetch(
      ROOT,
      `/accounts/v1/accounts/${MCA_ID}/developerRegistration:unregisterGcp`,
      { method: 'POST', body: '{}' }
    );
    console.log('[GGL] MCA unregister OK');
  } catch (e) {
    console.log('[GGL] unregister:', e.status, e.message?.slice(0, 150));
  }

  const reg = await merchantUserFetch(
    ROOT,
    `/accounts/v1/accounts/${MCA_ID}/developerRegistration:registerGcp`,
    {
      method: 'POST',
      body: JSON.stringify({ developerEmail: EMAIL }),
    }
  );
  console.log('[GGL] registerGcp:', JSON.stringify(reg));
  console.log('[GGL] Проверьте почту', EMAIL, '→ Принять это изменение');
}

main().catch((e) => {
  console.error('[GGL] FAIL:', e.message?.slice(0, 600));
  if (/409/.test(String(e.status))) {
    console.error('[GGL] Сначала: npm run merchant:api:migrate-gcp-mca');
  }
  process.exit(1);
});
