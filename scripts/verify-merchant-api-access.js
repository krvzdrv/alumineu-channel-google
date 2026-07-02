#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Проверка доступа Merchant API через сервисный аккаунт (JWT).
 *
 * Перед первым успехом: SA добавлен как пользователь в Merchant Center —
 * см. docs/MERCHANT_CENTER_API_ACCESS.md (аккаунт MC может быть на другой почте).
 *
 * Env:
 *   GOOGLE_MERCHANT_ID — числовой ID счёта MC
 *   GOOGLE_APPLICATION_MERCHANT_CREDENTIALS — путь к JSON-ключу SA (рекомендуется)
 *   или GOOGLE_APPLICATION_CREDENTIALS — если не хотите второй ключ для Sheets/token.json
 */

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const SCOPE_CONTENT = 'https://www.googleapis.com/auth/content';

function pickKeyPath() {
  const explicit =
    process.env.GOOGLE_APPLICATION_MERCHANT_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicit) return explicit.trim();
  return '';
}

function fail(msg, details) {
  console.error('[GGL] merchant api verify:', msg);
  if (details != null && details !== '') console.error(details);
  process.exitCode = 1;
}

async function main() {
  const merchantId = String(process.env.GOOGLE_MERCHANT_ID || '').trim();
  const keyPath = pickKeyPath();

  if (!merchantId) {
    fail('Задайте GOOGLE_MERCHANT_ID в .env (числовой ID в Merchant Center).');
    process.exit(process.exitCode || 1);
  }
  if (!keyPath) {
    fail(
      'Задайте GOOGLE_APPLICATION_MERCHANT_CREDENTIALS (или GOOGLE_APPLICATION_CREDENTIALS) — путь к JSON-ключу сервис-аккаунта.'
    );
    process.exit(process.exitCode || 1);
  }

  let absolute = path.resolve(ROOT, keyPath);
  if (!fs.existsSync(absolute)) absolute = path.resolve(keyPath);
  if (!fs.existsSync(absolute)) {
    fail('Файл ключа не найден.', `${keyPath} → ${absolute}`);
    process.exit(1);
  }

  const auth = new GoogleAuth({
    keyFile: absolute,
    scopes: [SCOPE_CONTENT]
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) {
    fail('Не удалось получить access_token (check key JSON / SA enable).');
    process.exit(1);
  }

  const parent = `accounts/${merchantId}`;
  const url =
    `https://merchantapi.googleapis.com/products/v1/${parent}/products` +
    '?pageSize=1';

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const textBody = await res.text();
  if (!res.ok) {
    fail(`HTTP ${res.status} при вызове Merchant API`, textBody.slice(0, 2000));
    process.exit(1);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(textBody);
  } catch {
    /* ok */
  }
  const totalHint =
    parsed && Array.isArray(parsed.products)
      ? `первые ${parsed.products.length} в ответе (pageSize=1)`
      : 'ответ успешный';

  console.log('[GGL] Merchant API OK:', totalHint);
  console.log('[GGL]', parent);
}

main().catch((e) => {
  console.error('[GGL] Ошибка:', e && e.message ? e.message : e);
  process.exit(1);
});
