#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Повторно запросить письмо подтверждения API developer contact.
 *
 * API unregisterGcp/registerGcp на PL sub недоступен: alumineu.pl@gmail.com
 * не в People на 5785188396 (только Email-only + наследование с MCA).
 *
 *   npm run merchant:api:reregister-contact
 */
const path = require('path');
const { createMerchantClient } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const PL_ID = process.env.GOOGLE_MERCHANT_ID || '5785188396';
const MCA_ID = process.env.GOOGLE_MERCHANT_MCA_ID || '5797974210';
const EMAIL = process.env.MERCHANT_DEVELOPER_EMAIL || 'alumineu.pl@gmail.com';

async function main() {
  console.log('[GGL] Merchant API developer contact — повторный запрос письма\n');

  const client = await createMerchantClient(ROOT);
  let gcpAccount = PL_ID;
  try {
    const reg = await client.merchantFetch('/accounts/v1/accounts:getAccountForGcpRegistration');
    if (reg?.name) {
      gcpAccount = String(reg.name).replace('accounts/', '');
    }
  } catch {
    /* ignore */
  }

  console.log('[GGL] GCP oceanic-craft привязан к счёту:', gcpAccount);
  console.log('[GGL] Developer email:', EMAIL);
  console.log('[GGL] merchant:api:verify —', 'проверьте отдельно после UI-шагов\n');

  console.log('--- Почему не через API ---');
  console.log('unregisterGcp/registerGcp на PL требуют user в People на этом sub.');
  console.log('alumineu.pl@gmail.com — на MCA', MCA_ID, '+ Email-only на PL.\n');

  console.log('--- UI: заново запросить письмо (5 мин) ---');
  console.log('1. merchants.google.com → переключиться на Alumineu PL ·', PL_ID);
  console.log('2. Settings → Access and services');
  console.log('3. Блок Email-only access → строка', EMAIL);
  console.log('4. Manage → Remove person (Удалить)');
  console.log('5. Email-only access → Add person');
  console.log('   Email:', EMAIL);
  console.log('   Name: Alumineu API');
  console.log('6. Save → на почту придёт «Подтвердите адрес электронной почты»');
  console.log('7. В течение 14 дней: Принять это изменение\n');

  console.log('--- После подтверждения ---');
  console.log('npm run merchant:api:developer-status');
  console.log('npm run merchant:api:verify');
}

main().catch((e) => {
  console.error('[GGL]', e.message);
  process.exit(1);
});
