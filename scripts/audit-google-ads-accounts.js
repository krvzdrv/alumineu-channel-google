#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Аудит Google Ads: кампании, расход, manager links (Climbra и др.)
 *
 *   npm run ads:audit
 *   npm run ads:audit -- --customer=8183930344
 *
 * Требует Basic access developer token + client привязаны к MCC (1145409300).
 */
const path = require('path');
const { createGoogleAdsClient } = require('./lib/google-ads-client');

const ROOT = path.join(__dirname, '..');

function formatId(id) {
  const s = String(id).replace(/-/g, '');
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
}

function microsToUnits(micros, currency = '') {
  const n = Number(micros || 0) / 1_000_000;
  return `${n.toFixed(2)} ${currency}`.trim();
}

function parseFlags(argv) {
  const flags = { customers: [], days: 365 };
  for (const arg of argv) {
    if (arg.startsWith('--customer=')) flags.customers.push(arg.split('=')[1].replace(/-/g, ''));
    if (arg.startsWith('--days=')) flags.days = Number(arg.split('=')[1]) || 365;
  }
  return flags;
}

function dateRangeLiteral(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${fmt(start)},${fmt(end)}`;
}

async function queryAll(client, customerId, gaql) {
  return client.query(customerId, gaql);
}

async function auditCustomer(client, customerId, days) {
  const dash = formatId(customerId);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[GGL] Account ${dash}`);
  console.log('='.repeat(60));

  const during = dateRangeLiteral(days);

  const infoRows = await queryAll(
    client,
    customerId,
    'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1'
  );
  const info = infoRows[0]?.customer || {};
  const currency = info.currency_code || info.currencyCode || '';
  console.log(`Name: ${info.descriptive_name || info.descriptiveName || '?'}`);
  console.log(`Currency: ${currency}`);

  const spendRows = await queryAll(
    client,
    customerId,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
            metrics.cost_micros, metrics.clicks, metrics.impressions
     FROM campaign
     WHERE segments.date DURING ${during}
       AND campaign.status != 'REMOVED'
     ORDER BY metrics.cost_micros DESC`
  );

  const byCampaign = new Map();
  let totalMicros = 0;
  for (const row of spendRows) {
    const id = row.campaign?.id;
    if (!id) continue;
    const prev = byCampaign.get(id) || {
      name: row.campaign.name,
      status: row.campaign.status,
      type: row.campaign.advertising_channel_type,
      costMicros: 0,
      clicks: 0,
      impressions: 0,
    };
    prev.costMicros += Number(row.metrics?.cost_micros || 0);
    prev.clicks += Number(row.metrics?.clicks || 0);
    prev.impressions += Number(row.metrics?.impressions || 0);
    byCampaign.set(id, prev);
    totalMicros += Number(row.metrics?.cost_micros || 0);
  }

  console.log(`\nSpend last ${days} days: ${microsToUnits(totalMicros, currency)}`);
  if (byCampaign.size === 0) {
    console.log('  (no campaign spend in period)');
  } else {
    console.log('\nCampaigns by spend:');
    for (const c of [...byCampaign.values()].sort((a, b) => b.costMicros - a.costMicros)) {
      console.log(
        `  ${microsToUnits(c.costMicros, currency).padStart(14)} | ${c.status?.padEnd(10)} | ${c.type?.padEnd(12)} | ${c.name}`
      );
    }
  }

  const activeRows = await queryAll(
    client,
    customerId,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type
     FROM campaign WHERE campaign.status = 'ENABLED'`
  );
  console.log(`\nENABLED campaigns now: ${activeRows.length}`);
  for (const row of activeRows) {
    console.log(`  - ${row.campaign?.advertising_channel_type}: ${row.campaign?.name}`);
  }

  try {
    const users = await queryAll(
      client,
      customerId,
      `SELECT customer_user_access.user_id, customer_user_access.email_address,
              customer_user_access.access_role, customer_user_access.access_creation_date_time
       FROM customer_user_access`
    );
    console.log(`\nDirect users (${users.length}):`);
    for (const row of users) {
      const u = row.customer_user_access || row.customerUserAccess || {};
      console.log(`  - ${u.email_address || u.emailAddress} (${u.access_role || u.accessRole})`);
    }
  } catch (e) {
    console.log('\nDirect users: (query not available)', e.message?.slice(0, 120));
  }

  try {
    const managers = await queryAll(
      client,
      customerId,
      `SELECT customer_manager_link.manager_customer, customer_manager_link.status,
              customer_manager_link.manager_link_id
       FROM customer_manager_link`
    );
    console.log(`\nLinked manager accounts (${managers.length}):`);
    for (const row of managers) {
      const m = row.customer_manager_link || row.customerManagerLink || {};
      const mgrId = String(m.manager_customer || m.managerCustomer || '').replace('customers/', '');
      console.log(`  - ${formatId(mgrId)} status=${m.status} link_id=${m.manager_link_id || m.managerLinkId}`);
    }
  } catch (e) {
    console.log('\nManager links: (query not available)', e.message?.slice(0, 120));
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const client = await createGoogleAdsClient(ROOT);

  let customerIds = flags.customers;
  if (customerIds.length === 0) {
    customerIds = [
      String(process.env.GOOGLE_ADS_CUSTOMER_ID || '8183930344').replace(/-/g, ''),
      String(process.env.GOOGLE_ADS_CUSTOMER_ID_ALT || '4669506698').replace(/-/g, ''),
    ].filter(Boolean);
  }

  console.log('[GGL] Ads audit');
  console.log('[GGL] MCC login:', client.loginCustomerId || '(not set)');
  console.log('[GGL] Period:', flags.days, 'days');

  for (const id of customerIds) {
    await auditCustomer(client, id, flags.days);
  }

  console.log('\n[GGL] Audit done.');
}

main().catch((e) => {
  const msg = e.errors?.[0]?.message || e.message || String(e);
  console.error('[GGL] FAIL:', msg);
  if (msg.includes('test accounts')) {
    console.error('[GGL] Developer token = Test. Запросите Basic access: MCC → Admin → API center.');
  }
  if (msg.includes('login-customer-id')) {
    console.error('[GGL] Привяжите 818/466 к MCC 1145409300: MCC → Accounts → Link.');
  }
  process.exit(1);
});
