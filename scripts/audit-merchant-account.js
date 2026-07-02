#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Audit Merchant Center account settings (business, shipping, feed, catalog).
 * Usage: npm run merchant:api:audit-account
 */

const path = require('path');
const { createMerchantClient } = require('./lib/merchant-api-client');

const ROOT = path.join(__dirname, '..');

function text(v) {
  return String(v == null ? '' : v).trim();
}

function finding(level, area, message, action = '') {
  return { level, area, message, action };
}

async function safeFetch(merchantFetch, urlPath) {
  try {
    return { ok: true, data: await merchantFetch(urlPath) };
  } catch (e) {
    return { ok: false, status: e.status, err: text(e.message).slice(0, 200) };
  }
}

function printFindings(findings) {
  const order = { FAIL: 0, WARN: 1, MANUAL: 2, OK: 3 };
  const sorted = [...findings].sort((a, b) => order[a.level] - order[b.level] || a.area.localeCompare(b.area));
  const counts = { FAIL: 0, WARN: 0, MANUAL: 0, OK: 0 };
  for (const f of sorted) counts[f.level] += 1;

  console.log('\n[GGL] Findings:');
  for (const f of sorted) {
    console.log(`  [${f.level}] ${f.area}: ${f.message}`);
    if (f.action) console.log(`        → ${f.action}`);
  }
  console.log(
    `\n[GGL] Summary: FAIL=${counts.FAIL} WARN=${counts.WARN} MANUAL=${counts.MANUAL} OK=${counts.OK}`
  );
}

async function main() {
  const { merchantId, merchantFetch, listAllPages } = await createMerchantClient(ROOT);
  const base = `/accounts/v1/accounts/${merchantId}`;
  const findings = [];

  const account = await merchantFetch(base);
  const businessInfo = await merchantFetch(`${base}/businessInfo`);
  const businessIdentity = await safeFetch(merchantFetch, `${base}/businessIdentity`);
  const homepage = await merchantFetch(`${base}/homepage`);
  const shipping = await merchantFetch(`${base}/shippingSettings`);
  const programs = await merchantFetch(`${base}/programs`);
  const users = await merchantFetch(`${base}/users`);
  const autoImprove = await merchantFetch(`${base}/automaticImprovements`);
  const autofeed = await merchantFetch(`${base}/autofeedSettings`);
  const returnPolicies = await safeFetch(merchantFetch, `${base}/onlineReturnPolicies`);

  console.log(`[GGL] Merchant account audit: ${merchantId} (${account.accountName || '?'})`);

  findings.push(
    finding('OK', 'account', `Имя: ${account.accountName}, TZ: ${account.timeZone?.id || '?'}, язык: ${account.languageCode || '?'}`)
  );

  if (homepage.claimed && text(homepage.uri).includes('alumineu.pl')) {
    findings.push(finding('OK', 'homepage', `Домен подтверждён: ${homepage.uri}`));
  } else {
    findings.push(
      finding('FAIL', 'homepage', 'Домен не подтверждён или URL не alumineu.pl', 'MC → Настройки → Информация о компании → URL сайта')
    );
  }

  const cs = businessInfo.customerService || {};
  if (text(cs.email)) {
    findings.push(finding('OK', 'support', `Email поддержки: ${cs.email}`));
  } else {
    findings.push(
      finding('WARN', 'support', 'Email поддержки пустой', 'npm run merchant:api:apply-business -- --apply (MERCHANT_SUPPORT_EMAIL в .env)')
    );
  }
  if (text(cs.uri)) {
    findings.push(finding('OK', 'support', `URL поддержки: ${cs.uri}`));
  }
  const csPhone = text(cs.phone?.e164Number || cs.phone?.phoneNumber);
  if (csPhone) {
    findings.push(finding('OK', 'support', `Телефон поддержки в Customer service: ${csPhone}`));
  }
  if (businessInfo.phoneVerificationState === 'PHONE_VERIFICATION_STATE_VERIFIED') {
    findings.push(finding('OK', 'support', 'phoneVerificationState: VERIFIED'));
  } else if (text(businessInfo.phoneVerificationState) === 'PHONE_VERIFICATION_STATE_UNVERIFIED') {
    findings.push(
      finding(
        'OK',
        'support',
        'phoneVerificationState: UNVERIFIED (legacy API; SMS-верификация убрана из MC UI с ~05/2025)',
        'Customer service → Preferred contact method (Phone/Email) → Save; сверка с alumineu.pl/kontakt'
      )
    );
  }

  const addr = businessInfo.address || {};
  if (addr.regionCode === 'PL' && text(addr.locality) && text(addr.postalCode)) {
    findings.push(
      finding('OK', 'business', `Адрес: ${addr.locality}, ${addr.postalCode}, ${(addr.addressLines || []).join(' ').trim()}`)
    );
  } else {
    findings.push(finding('WARN', 'business', 'Адрес компании неполный', 'Проверить в MC → Информация о компании'));
  }

  const bi = businessIdentity.ok ? businessIdentity.data : {};
  if (bi.logo || bi.brandName || bi.brandDisplayName) {
    findings.push(finding('OK', 'identity', 'Business identity заполнен'));
  } else {
    findings.push(
      finding(
        'MANUAL',
        'identity',
        'Business identity пуст (логотип/бренд)',
        'MC → Настройки → Бренд / Business identity — загрузить логотип Alumineu'
      )
    );
  }

  const policies = returnPolicies.ok ? returnPolicies.data.onlineReturnPolicies || [] : [];
  if (policies.length) {
    const p = policies[0];
    findings.push(
      finding('OK', 'returns', `Политика возврата PL: ${p.returnPolicyUri || '(uri?)'}, методы: ${(p.returnMethods || []).join(', ')}`)
    );
  } else {
    findings.push(
      finding('WARN', 'returns', 'Политика возврата не найдена через API', 'MC → Настройки → Политика возврата → alumineu.pl/wysylka-i-zwrot')
    );
  }

  const svc = (shipping.services || [])[0];
  if (svc) {
    const dt = svc.deliveryTime || {};
    findings.push(
      finding(
        'OK',
        'shipping',
        `Доставка PL: ${svc.serviceName || '(без имени)'}, transit ${dt.minTransitDays ?? '?'}–${dt.maxTransitDays ?? '?'} дн., handling ${dt.minHandlingDays ?? '?'}–${dt.maxHandlingDays ?? '?'} дн.`
      )
    );
    if (Number(dt.maxTransitDays) === 0) {
      findings.push(
        finding(
          'WARN',
          'shipping',
          'Transit days = 0 (не совпадает с сайтом 1–3 дня)',
          'npm run merchant:api:apply-business -- --apply'
        )
      );
    }
    const rate = svc.rateGroups?.[0]?.singleValue?.flatRate;
    if (rate && Number(rate.amountMicros) === 0) {
      findings.push(
        finding(
          'WARN',
          'shipping',
          'В MC указана бесплатная доставка (0 PLN), на сайте — «зависит от заказа»',
          'MERCHANT_SHIPPING_FLAT_RATE_PLN=50 MERCHANT_ALIGN_SHIPPING=1 npm run merchant:api:apply-business -- --apply'
        )
      );
    } else if (rate && Number(rate.amountMicros) > 0) {
      const pln = Number(rate.amountMicros) / 1_000_000;
      findings.push(finding('OK', 'shipping', `Ставка доставки в MC: ${pln} PLN (flat rate)`));
    }
  }

  if (autofeed.enableProducts === true) {
    findings.push(
      finding(
        'WARN',
        'autofeed',
        'Found by Google (autofeed) включён — риск дублей с Sheets',
        'npm run merchant:api:apply-business -- --apply (MERCHANT_DISABLE_AUTOFEED=1)'
      )
    );
  } else {
    findings.push(finding('OK', 'autofeed', 'Found by Google (autofeed) выключен или не активен'));
  }

  const item = autoImprove.itemUpdates || {};
  if (item.effectiveAllowPriceUpdates || item.effectiveAllowAvailabilityUpdates) {
    findings.push(
      finding(
        'WARN',
        'auto-improve',
        'Google может автоматически менять цены/наличие на карточках',
        'MC → Настройки → Автоматические улучшения — отключить price/availability (или MERCHANT_DISABLE_AUTO_IMPROVEMENTS=1)'
      )
    );
  } else {
    findings.push(finding('OK', 'auto-improve', 'Авто-изменения цен/наличия выключены'));
  }

  for (const p of programs.programs || []) {
    const short = (p.name || '').split('/').pop();
    if (short === 'free-listings' && p.state === 'ENABLED') {
      findings.push(finding('OK', 'programs', 'Free listings: ENABLED'));
    }
    if (short === 'shopping-ads' && p.state === 'ELIGIBLE') {
      findings.push(
        finding('OK', 'programs', 'Shopping ads: ELIGIBLE (можно подключить Ads при необходимости)')
      );
    }
  }

  const saUsers = (users.users || []).filter((u) => text(u.name).includes('.iam.gserviceaccount.com'));
  if (saUsers.some((u) => (u.accessRights || []).includes('ADMIN'))) {
    findings.push(finding('OK', 'access', 'Service account с Admin доступом подключён'));
  } else {
    findings.push(finding('WARN', 'access', 'Service account без Admin — часть API PATCH недоступна'));
  }

  let sources = [];
  try {
    sources = await listAllPages((pageToken) => {
      const q = new URLSearchParams({ pageSize: '50' });
      if (pageToken) q.set('pageToken', pageToken);
      return merchantFetch(`/datasources/v1/accounts/${merchantId}/dataSources?${q}`);
    });
  } catch (e) {
    findings.push(finding('WARN', 'feed', `Не удалось прочитать источники: ${e.message}`));
  }

  if (sources.length === 1) {
    findings.push(finding('OK', 'feed', `Один primary-источник: ${sources[0].displayName || sources[0].name}`));
  } else if (sources.length > 1) {
    findings.push(
      finding('WARN', 'feed', `${sources.length} источников данных — риск дублей`, 'Оставить один Sheets, остальное удалить/stop managing')
    );
  } else {
    findings.push(finding('FAIL', 'feed', 'Нет источников данных', 'Подключить Google Sheets фид'));
  }

  let products = [];
  try {
    products = await listAllPages((pageToken) => {
      const q = new URLSearchParams({ pageSize: '250' });
      if (pageToken) q.set('pageToken', pageToken);
      return merchantFetch(`/products/v1/accounts/${merchantId}/products?${q}`);
    });
  } catch (e) {
    findings.push(finding('WARN', 'catalog', `Не удалось прочитать товары: ${e.message}`));
  }

  if (products.length) {
    const archived = products.filter((p) => p.archived).length;
    const active = products.length - archived;
    findings.push(
      finding(
        archived > 0 ? 'WARN' : 'OK',
        'catalog',
        `Товары: ${active} активных, ${archived} в архиве (всего ${products.length})`,
        archived > 0
          ? 'npm run merchant:api:list-archived → MC → Products → Archive → Restore all (API не умеет unarchive)'
          : ''
      )
    );

    const issueCounts = {};
    for (const p of products) {
      for (const i of p.productStatus?.itemLevelIssues || []) {
        const k = i.code;
        issueCounts[k] = (issueCounts[k] || 0) + 1;
      }
    }
    const top = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [code, n] of top) {
      if (code === 'image_link_crawling_not_allowed') {
        findings.push(
          finding(
            'WARN',
            'catalog',
            `${n} товаров: image_link_crawling_not_allowed (часто drive.google в additional image link)`,
            'Убрать drive.google из additional image link в таблице; только static.tildacdn.com'
          )
        );
      } else if (code === 'missing_potentially_required_attribute') {
        findings.push(
          finding('WARN', 'catalog', `${n} товаров: missing_potentially_required_attribute`, 'npm run merchant:sheet:apply (unit pricing measure/base)')
        );
      }
    }
  }

  printFindings(findings);
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
