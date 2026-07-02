#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Apply Merchant Center business settings from .env (dry-run by default).
 *
 * Env (optional):
 *   MERCHANT_SUPPORT_EMAIL=biuro@alumineu.pl
 *   MERCHANT_SUPPORT_PHONE=+48532263193
 *   MERCHANT_SUPPORT_URI=https://alumineu.pl/kontakt
 *   MERCHANT_DISABLE_AUTOFEED=1
 *   MERCHANT_SHIPPING_MIN_TRANSIT_DAYS=1
 *   MERCHANT_SHIPPING_MAX_TRANSIT_DAYS=3
 *   MERCHANT_SHIPPING_SERVICE_NAME=Dostawa PL
 *   MERCHANT_SHIPPING_FLAT_RATE_PLN=50
 *   MERCHANT_ALIGN_SHIPPING=1
 *   MERCHANT_ACCOUNT_LANGUAGE=en-US
 *
 * Usage:
 *   npm run merchant:api:apply-business
 *   npm run merchant:api:apply-business -- --apply
 */

const path = require('path');
const { createMerchantClient, parseCliFlags } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

function text(v) {
  return String(v == null ? '' : v).trim();
}

function envFlag(name) {
  return ['1', 'true', 'yes', 'on'].includes(text(process.env[name]).toLowerCase());
}

function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const flags = parseCliFlags(process.argv);
  const { merchantId, merchantFetch } = await createMerchantClient(ROOT);
  const base = `/accounts/v1/accounts/${merchantId}`;

  const planned = [];

  const email = text(process.env.MERCHANT_SUPPORT_EMAIL);
  const phone = text(process.env.MERCHANT_SUPPORT_PHONE);
  const uri = text(process.env.MERCHANT_SUPPORT_URI);

  const accountLang = text(process.env.MERCHANT_ACCOUNT_LANGUAGE) || 'en-US';
  const accountCurrent = await merchantFetch(`${base}`);
  if (accountCurrent.languageCode !== accountLang) {
    planned.push({
      id: `account.languageCode=${accountLang}`,
      patch: `${base}?updateMask=languageCode`,
      body: { name: base, languageCode: accountLang }
    });
  }

  const businessCurrent = await merchantFetch(`${base}/businessInfo`);
  const csCurrent = businessCurrent.customerService || {};
  const customerService = {
    uri: uri || csCurrent.uri || 'https://alumineu.pl/kontakt',
    email: email || csCurrent.email || '',
    ...(phone ? { phone: { e164Number: phone } } : csCurrent.phone ? { phone: csCurrent.phone } : {})
  };

  if (customerService.email) {
    planned.push({
      id: 'businessInfo.customerService',
      patch: `${base}/businessInfo?updateMask=customerService`,
      body: {
        name: `${base}/businessInfo`,
        customerService
      }
    });
  } else if (uri || phone) {
    console.warn('[GGL] Пропуск businessInfo: нужен MERCHANT_SUPPORT_EMAIL или уже сохранённый email в MC');
  }

  if (envFlag('MERCHANT_DISABLE_AUTOFEED')) {
    planned.push({
      id: 'autofeedSettings.enableProducts=false',
      patch: `${base}/autofeedSettings?updateMask=enableProducts`,
      body: {
        name: `${base}/autofeedSettings`,
        enableProducts: false
      }
    });
  }

  const minTransit = envInt('MERCHANT_SHIPPING_MIN_TRANSIT_DAYS', 1);
  const maxTransit = envInt('MERCHANT_SHIPPING_MAX_TRANSIT_DAYS', 3);
  const serviceName = text(process.env.MERCHANT_SHIPPING_SERVICE_NAME) || 'Dostawa PL';
  const flatRateRaw = text(process.env.MERCHANT_SHIPPING_FLAT_RATE_PLN);
  const flatRatePln =
    flatRateRaw !== ''
      ? Number(flatRateRaw.replace(',', '.'))
      : envFlag('MERCHANT_ALIGN_SHIPPING')
        ? 50
        : null;

  let shippingCurrent;
  try {
    shippingCurrent = await merchantFetch(`${base}/shippingSettings`);
  } catch (e) {
    if (e.status !== 404) throw e;
    shippingCurrent = null;
  }

  if (shippingCurrent?.services?.length) {
    const svc = JSON.parse(JSON.stringify(shippingCurrent.services[0]));
    svc.serviceName = serviceName;
    svc.deliveryTime = svc.deliveryTime || {};
    svc.deliveryTime.minTransitDays = minTransit;
    svc.deliveryTime.maxTransitDays = maxTransit;
    if (flatRatePln != null && Number.isFinite(flatRatePln) && flatRatePln >= 0) {
      svc.rateGroups = svc.rateGroups || [{}];
      svc.rateGroups[0] = svc.rateGroups[0] || {};
      svc.rateGroups[0].singleValue = {
        flatRate: {
          amountMicros: String(Math.round(flatRatePln * 1_000_000)),
          currencyCode: svc.currencyCode || 'PLN'
        }
      };
    }
    planned.push({
      id:
        flatRatePln != null
          ? `shippingSettings.insert (flat ${flatRatePln} PLN)`
          : 'shippingSettings.insert',
      insert: `${base}/shippingSettings:insert`,
      body: {
        name: `${base}/shippingSettings`,
        services: [svc],
        etag: shippingCurrent.etag
      }
    });
  }

  if (envFlag('MERCHANT_DISABLE_AUTO_IMPROVEMENTS')) {
    planned.push({
      id: 'automaticImprovements.disable',
      patch: `${base}/automaticImprovements?updateMask=itemUpdates,imageImprovements,shippingImprovements`,
      body: {
        name: `${base}/automaticImprovements`,
        itemUpdates: {
          accountItemUpdatesSettings: {
            allowPriceUpdates: false,
            allowAvailabilityUpdates: false,
            allowStrictAvailabilityUpdates: false,
            allowConditionUpdates: false
          }
        },
        imageImprovements: {
          accountImageImprovementsSettings: {
            allowAutomaticImageImprovements: false
          }
        },
        shippingImprovements: {
          allowShippingImprovements: false
        }
      }
    });
  }

  console.log(`[GGL] Merchant ${merchantId}: planned ${planned.length} change(s)`);
  for (const step of planned) {
    console.log(`  - ${step.id}`);
    console.log(`    ${JSON.stringify(step.body).slice(0, 240)}${JSON.stringify(step.body).length > 240 ? '…' : ''}`);
  }

  if (flags.dryRun && !flags.apply) {
    console.log('\n[GGL] DRY RUN — изменения не отправлены. Для применения: --apply');
    return;
  }

  for (const step of planned) {
    if (step.insert) {
      const res = await merchantFetch(step.insert, { method: 'POST', body: JSON.stringify(step.body) });
      console.log(`[GGL] OK ${step.id}`);
      if (step.id.startsWith('shippingSettings')) {
        const dt = res.services?.[0]?.deliveryTime;
        console.log(`      transit ${dt?.minTransitDays}–${dt?.maxTransitDays} days`);
      }
    } else {
      await merchantFetch(step.patch, { method: 'PATCH', body: JSON.stringify(step.body) });
      console.log(`[GGL] OK ${step.id}`);
    }
  }

  console.log('\n[GGL] Готово. Проверка: npm run merchant:api:audit-account');
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
