#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Привязка GCP-проекта к счёту Merchant Center (developerRegistration:registerGcp).
 * Обязательный шаг перед Merchant API — см. docs/MERCHANT_CENTER_API_ACCESS.md
 *
 * Env:
 *   GOOGLE_MERCHANT_ID
 *   MERCHANT_DEVELOPER_EMAIL — обычная почта Google (не service account)
 *   GOOGLE_APPLICATION_MERCHANT_CREDENTIALS | GOOGLE_APPLICATION_CREDENTIALS
 */

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const SCOPE_CONTENT = 'https://www.googleapis.com/auth/content';

function pickKeyPath() {
  return (
    process.env.GOOGLE_APPLICATION_MERCHANT_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    ''
  ).trim();
}

async function main() {
  const merchantId = String(process.env.GOOGLE_MERCHANT_ID || '').trim();
  const developerEmail = String(
    process.env.MERCHANT_DEVELOPER_EMAIL || 'alumineu.pl@gmail.com'
  ).trim();
  const keyPath = pickKeyPath();

  if (!merchantId) {
    console.error('[GGL] Задайте GOOGLE_MERCHANT_ID в .env');
    process.exit(1);
  }
  if (!keyPath) {
    console.error('[GGL] Задайте GOOGLE_APPLICATION_MERCHANT_CREDENTIALS');
    process.exit(1);
  }

  let absolute = path.resolve(ROOT, keyPath);
  if (!fs.existsSync(absolute)) absolute = path.resolve(keyPath);
  if (!fs.existsSync(absolute)) {
    console.error('[GGL] Файл ключа не найден:', keyPath);
    process.exit(1);
  }

  const auth = new GoogleAuth({ keyFile: absolute, scopes: [SCOPE_CONTENT] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) {
    console.error('[GGL] Не удалось получить access_token');
    process.exit(1);
  }

  const name = `accounts/${merchantId}/developerRegistration`;
  const url = `https://merchantapi.googleapis.com/accounts/v1/${name}:registerGcp`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ developerEmail })
  });

  const body = await res.text();
  if (!res.ok) {
    console.error('[GGL] registerGcp HTTP', res.status);
    console.error(body.slice(0, 3000));
    process.exit(1);
  }

  console.log('[GGL] GCP зарегистрирован в Merchant Center.');
  console.log('[GGL] developerEmail:', developerEmail);
  console.log(body.slice(0, 2000));
  console.log('[GGL] Подождите ~5 минут, затем: npm run merchant:api:verify');
}

main().catch((e) => {
  console.error('[GGL]', e && e.message ? e.message : e);
  process.exit(1);
});
