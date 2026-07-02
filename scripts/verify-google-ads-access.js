#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Проверка Google Ads API: listAccessibleCustomers + имена аккаунтов.
 */
const path = require('path');
const { createGoogleAdsClient, GCP_PROJECT_ID } = require('./lib/google-ads-client');

const ROOT = path.join(__dirname, '..');

function formatId(id) {
  const s = String(id).replace(/-/g, '');
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
}

async function customerInfo(client, customerId) {
  try {
    const rows = await client.query(
      customerId,
      `SELECT customer.id, customer.descriptive_name, customer.manager, customer.currency_code
       FROM customer LIMIT 1`
    );
    const row = rows[0]?.customer;
    if (!row) return { id: customerId };
    const name = row.descriptive_name ?? row.descriptiveName;
    return {
      id: row.id ?? customerId,
      name: typeof name === 'string' ? name : undefined,
      manager: row.manager,
      currency: row.currency_code ?? row.currencyCode,
    };
  } catch (e) {
    return { id: customerId, error: e.message?.slice(0, 240) || String(e) };
  }
}

async function main() {
  const client = await createGoogleAdsClient(ROOT);
  console.log('[GGL] GCP project:', GCP_PROJECT_ID);
  console.log('[GGL] OAuth token:', client.tokenPath);
  console.log('[GGL] Login customer (MCC):', client.loginCustomerId || '(not set)');

  const list = await client.listAccessibleCustomers();
  const ids = (list.resource_names || list.resourceNames || []).map((r) =>
    String(r).replace('customers/', '')
  );

  console.log('\n[GGL] Accessible customers:', ids.length);
  for (const id of ids) {
    let info = { id };
    try {
      info = await customerInfo(client, id);
    } catch {
      /* listAccessibleCustomers only — names need Basic + query */
    }
    if (info.error) {
      console.log(`  - ${formatId(id)}: (name unavailable — link MCC + Basic access)`);
    } else {
      console.log(
        `  - ${formatId(id)}: ${info.name || '(name via API after Basic access)'}${info.manager ? ' [MCC]' : ''} ${info.currency || ''}`
      );
    }
  }

  console.log('\n[GGL] OK — Google Ads API connected.');
}

main().catch((e) => {
  const msg = e.message || String(e);
  console.error('[GGL] FAIL:', msg);
  if (msg.includes('SERVICE_DISABLED') || msg.includes('has not been used in project')) {
    console.error(
      `[GGL] Включите Google Ads API в GCP: https://console.cloud.google.com/apis/library/googleads.googleapis.com?project=${GCP_PROJECT_ID}`
    );
  }
  process.exit(1);
});
