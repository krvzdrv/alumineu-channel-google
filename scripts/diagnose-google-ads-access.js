#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Диагностика доступа к Ads 818 vs MCC 114.
 *   npm run ads:diagnose
 */
const path = require('path');
const { createGoogleAdsClient } = require('./lib/google-ads-client');

const ROOT = path.join(__dirname, '..');
const PL_ADS = '8183930344';
const MCC = '1145409300';

function formatId(id) {
  const s = String(id).replace(/-/g, '');
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
}

function errMsg(e) {
  return String(e?.errors?.[0]?.message || e?.message || e).slice(0, 280);
}

async function tryName(client, customerId, label) {
  const gaql = 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1';
  try {
    const rows = await client.query(customerId, gaql, label === 'direct' ? { direct: true } : {});
    const name = rows[0]?.customer?.descriptive_name || rows[0]?.customer?.descriptiveName || '?';
    console.log(`  ${label}: OK — ${name}`);
    return true;
  } catch (e) {
    console.log(`  ${label}: FAIL — ${errMsg(e)}`);
    return false;
  }
}

async function main() {
  const client = await createGoogleAdsClient(ROOT);
  console.log('[GGL] Ads access diagnose');
  console.log(`[GGL] OAuth: ${path.basename(client.tokenPath)}`);
  console.log(`[GGL] MCC login in .env: ${client.loginCustomerId ? formatId(client.loginCustomerId) : '(not set)'}`);
  console.log(`[GGL] PL Ads: ${formatId(PL_ADS)}\n`);

  const accessible = await client.listAccessibleCustomers();
  const ids = (accessible?.resource_names || accessible || [])
    .map((r) => String(r).replace('customers/', '').replace(/-/g, ''))
    .filter(Boolean);
  console.log(`[GGL] listAccessibleCustomers (${ids.length}):`);
  for (const id of ids) console.log(`  - ${formatId(id)}`);

  console.log('\n[GGL] Query customer name:');
  const mccOk = await tryName(client, PL_ADS, 'via MCC login');
  const directOk = await tryName(client, PL_ADS, 'direct');

  console.log('\n[GGL] Interpretation:');
  if (directOk && !mccOk) {
    console.log(
      '  OAuth видит 818 напрямую, но 818 НЕ привязан под MCC 114.\n' +
        '  В UI: Alumineu · Manager (114) → Accounts → Link → 818-393-0344 → Accept в client.\n' +
        '  Подробно: docs/GOOGLE_ADS_FIX_818_ACCESS.md'
    );
  } else if (mccOk && directOk) {
    console.log('  MCC и прямой доступ OK — скрипты могут работать с login_customer_id=114.');
  } else if (!directOk) {
    console.log(
      '  Нет доступа к 818 даже напрямую. Проверьте: npm run ads:auth (alumineu.pl@gmail.com), Users в Ads UI.'
    );
  }

  if (client.developerToken?.toLowerCase?.().includes('test') === false) {
    console.log('\n[GGL] Developer token: (length ok, Basic may be active)');
  } else {
    console.log('\n[GGL] Developer token: Test — расход/кампании в ads:audit после Basic access (MCC → API center).');
  }
}

main().catch((e) => {
  console.error('[GGL]', errMsg(e));
  process.exit(1);
});
