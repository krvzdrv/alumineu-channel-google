#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Check Merchant Center ↔ Google Ads product links.
 * Usage:
 *   npm run ads:check-mc-link
 *   npm run ads:check-mc-link -- --customer=8183930344 --mc=5785188396
 */
const path = require('path');
const { createGoogleAdsClient } = require('./lib/google-ads-client');

const ROOT = path.join(__dirname, '..');
const DEFAULT_CUSTOMER = '8183930344';
const DEFAULT_MC_PL = '5785188396';

function formatId(id) {
  const s = String(id).replace(/-/g, '');
  if (s.length !== 10) return s;
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
}

function parseArgs(argv) {
  let customer = DEFAULT_CUSTOMER;
  let mc = DEFAULT_MC_PL;
  for (const a of argv) {
    if (a.startsWith('--customer=')) customer = a.split('=')[1].replace(/-/g, '');
    if (a.startsWith('--mc=')) mc = a.split('=')[1].replace(/-/g, '');
  }
  return { customer, mc };
}

async function main() {
  const { customer, mc } = parseArgs(process.argv);
  const client = await createGoogleAdsClient(ROOT);

  console.log(`[GGL] Ads customer: ${formatId(customer)}`);
  console.log(`[GGL] Expected MC (PL): ${formatId(mc)}`);

  const linksGaql = `
    SELECT
      product_link.product_link_id,
      product_link.type,
      product_link.merchant_center.merchant_center_id
    FROM product_link
    WHERE product_link.type = 'MERCHANT_CENTER'
  `;

  const inviteGaql = `
    SELECT
      product_link_invitation.product_link_invitation_id,
      product_link_invitation.status,
      product_link_invitation.merchant_center.merchant_center_id
    FROM product_link_invitation
    WHERE product_link_invitation.type = 'MERCHANT_CENTER'
  `;

  let links = [];
  let invites = [];
  let apiDenied = false;
  try {
    links = await client.query(customer, linksGaql);
  } catch (e) {
    const msg = errMsg(e);
    if (msg.includes('USER_PERMISSION_DENIED') || msg.includes('login-customer-id')) apiDenied = true;
    console.warn('[GGL] product_link query failed:', msg.slice(0, 300));
  }
  try {
    invites = await client.query(customer, inviteGaql);
  } catch (e) {
    const msg = errMsg(e);
    if (msg.includes('USER_PERMISSION_DENIED') || msg.includes('login-customer-id')) apiDenied = true;
    console.warn('[GGL] product_link_invitation query failed:', msg.slice(0, 300));
  }

  console.log(`\n[GGL] Active MC links: ${links.length}`);
  for (const row of links) {
    const pl = row.product_link || row.productLink || {};
    const mcId = String(
      pl.merchant_center?.merchant_center_id ||
        pl.merchantCenter?.merchantCenterId ||
        ''
    );
    const match = mcId === mc ? '✓ PL target' : '';
    console.log(`  - MC ${formatId(mcId)} link_id=${pl.product_link_id || pl.productLinkId} ${match}`);
  }

  console.log(`\n[GGL] Pending invitations: ${invites.length}`);
  for (const row of invites) {
    const inv = row.product_link_invitation || row.productLinkInvitation || {};
    const mcId = String(
      inv.merchant_center?.merchant_center_id ||
        inv.merchantCenter?.merchantCenterId ||
        ''
    );
    console.log(`  - MC ${formatId(mcId)} status=${inv.status}`);
  }

  const linked = links.some((row) => {
    const pl = row.product_link || row.productLink || {};
    const mcId = String(
      pl.merchant_center?.merchant_center_id || pl.merchantCenter?.merchantCenterId || ''
    );
    return mcId === mc;
  });

  if (linked) {
    console.log('\n[GGL] OK — MC PL уже связан с этим Ads-аккаунтом.');
  } else if (invites.length) {
    console.log('\n[GGL] Есть приглашение — подтвердите в MC или Ads UI (см. docs/MC_ADS_LINK_GUIDE.md).');
  } else if (apiDenied) {
    console.log(
      '\n[GGL] API не проверил связь: привяжите 818 к MCC 114 в Ads UI, затем повторите npm run ads:check-mc-link.'
    );
    console.log('[GGL] Связку MC↔Ads можно сделать вручную без API — см. docs/MC_ADS_LINK_GUIDE.md.');
  } else {
    console.log('\n[GGL] По API активной связи с MC PL нет — выполните шаги в docs/MC_ADS_LINK_GUIDE.md (рекламу запускать не обязательно).');
  }
}

function errMsg(e) {
  if (e?.message) return String(e.message);
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e).slice(0, 400);
  } catch {
    return String(e);
  }
}

main().catch((e) => {
  console.error('[GGL]', errMsg(e));
  process.exit(1);
});
