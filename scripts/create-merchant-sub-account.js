#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Create MCA sub-account and apply baseline market settings.
 *
 * Usage:
 *   GOOGLE_MERCHANT_MCA_ID=5797974210 npm run merchant:api:create-sub -- --market=RO --apply
 *   GOOGLE_MERCHANT_MCA_ID=5797974210 npm run merchant:api:create-sub -- --market=RO --apply --rename-pl
 */

const path = require('path');
const { createMerchantClient, parseCliFlags } = require('./lib/merchant-api-client');
const {
  resolveMarket,
  resolveMarketCode,
  buildShippingService,
  MARKETS
} = require('./lib/merchant-markets');

const ROOT = path.join(__dirname, '..');

function text(v) {
  return String(v == null ? '' : v).trim();
}

function parseArgs(argv) {
  const flags = parseCliFlags(argv);
  flags.market = resolveMarketCode(argv);
  flags.renamePl = argv.includes('--rename-pl');
  return flags;
}

function subAccountDisplayName(market) {
  if (market.code === 'PL') return 'Alumineu PL';
  if (market.code === 'DE') return 'Alumineu DE';
  if (market.code === 'EU') return 'Alumineu EU';
  return market.code === 'RO' ? 'Alumineu RO' : `Alumineu ${market.code}`;
}

async function listSubAccounts(merchantFetch, mcaId) {
  const page = await merchantFetch(`/accounts/v1/accounts/${mcaId}:listSubaccounts`);
  return page.accounts || [];
}

function findSubByName(accounts, name) {
  return accounts.find((a) => text(a.accountName) === name);
}

async function createSubAccount(merchantFetch, mcaId, market) {
  const accountName = subAccountDisplayName(market);
  const body = {
    account: {
      accountName,
      adultContent: false,
      timeZone: { id: market.timezone },
      languageCode: market.contentLanguage === 'ro' ? 'ro-RO' : market.contentLanguage === 'de' ? 'de-DE' : 'en-US'
    },
    service: [
      {
        accountAggregation: {},
        provider: `providers/${mcaId}`
      }
    ]
  };
  const created = await merchantFetch('/accounts/v1/accounts:createAndConfigure', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return { created, accountName };
}

async function configureHomepage(merchantFetch, accountId, siteOrigin) {
  const base = `/accounts/v1/accounts/${accountId}`;
  const uri = siteOrigin.endsWith('/') ? siteOrigin : `${siteOrigin}/`;
  await merchantFetch(`${base}/homepage?updateMask=uri`, {
    method: 'PATCH',
    body: JSON.stringify({ name: `${base}/homepage`, uri })
  });
  const claimed = await merchantFetch(`${base}/homepage:claim`, {
    method: 'POST',
    body: JSON.stringify({ overwrite: true })
  });
  return claimed;
}

async function insertShipping(merchantFetch, accountId, market) {
  const base = `/accounts/v1/accounts/${accountId}`;
  const svc = buildShippingService(market, null);
  await merchantFetch(`${base}/shippingSettings:insert`, {
    method: 'POST',
    body: JSON.stringify({
      name: `${base}/shippingSettings`,
      services: [svc],
      etag: ''
    })
  });
}

async function applyBusinessBaseline(merchantFetch, accountId, market) {
  const base = `/accounts/v1/accounts/${accountId}`;
  await merchantFetch(`${base}/businessInfo?updateMask=customerService`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: `${base}/businessInfo`,
      customerService: {
        uri: market.supportUri,
        email: text(process.env.MERCHANT_SUPPORT_EMAIL) || 'biuro@alumineu.pl',
        phone: { e164Number: text(process.env.MERCHANT_SUPPORT_PHONE) || '+48532263193' }
      }
    })
  });
  try {
    await merchantFetch(`${base}/autofeedSettings?updateMask=enableProducts`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: `${base}/autofeedSettings`,
        enableProducts: false
      })
    });
  } catch (e) {
    if (e.status !== 404 && !/not found/i.test(text(e.message))) throw e;
    console.warn('[GGL] autofeedSettings недоступен на этом sub-account (404) — пропуск');
  }
}

async function renamePlSubAccount(merchantFetch, mcaId) {
  const subs = await listSubAccounts(merchantFetch, mcaId);
  const pl = subs.find((a) => a.accountId === MARKETS.PL.merchantAccountId || text(a.accountName) === 'Alumineu');
  if (!pl || text(pl.accountName) === 'Alumineu PL') return;
  await merchantFetch(`/accounts/v1/accounts/${pl.accountId}?updateMask=accountName`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: `accounts/${pl.accountId}`,
      accountName: 'Alumineu PL'
    })
  });
  console.log(`[GGL] Renamed ${pl.accountId} → Alumineu PL`);
}

async function main() {
  const flags = parseArgs(process.argv);
  const market = resolveMarket(flags.market);
  const mcaId = text(process.env.GOOGLE_MERCHANT_MCA_ID) || '5797974210';
  const { merchantFetch } = await createMerchantClient(ROOT);

  const subs = await listSubAccounts(merchantFetch, mcaId);
  const wantedName = subAccountDisplayName(market);
  let existing = findSubByName(subs, wantedName);
  if (market.merchantAccountId) {
    existing = subs.find((a) => a.accountId === market.merchantAccountId) || existing;
  }

  console.log(`[GGL] MCA ${mcaId} | market ${market.code} | sub-accounts: ${subs.length}`);

  if (existing) {
    console.log(`[GGL] Sub-account already exists: ${existing.accountId} (${existing.accountName})`);
    if (!flags.apply) return;
  } else {
    console.log(`[GGL] Would create sub-account "${wantedName}" (${market.siteOrigin})`);
    if (!flags.apply) {
      console.log('[GGL] DRY RUN — add --apply');
      return;
    }
    const { created } = await createSubAccount(merchantFetch, mcaId, market);
    existing = created;
    console.log(`[GGL] Created sub-account ${created.accountId} (${created.accountName})`);
  }

  const accountId = existing.accountId;
  console.log('[GGL] Configure homepage…');
  const hp = await configureHomepage(merchantFetch, accountId, market.siteOrigin);
  console.log(`[GGL] Homepage ${hp.uri} claimed=${hp.claimed}`);

  console.log('[GGL] Shipping + business baseline…');
  try {
    await insertShipping(merchantFetch, accountId, market);
    console.log(`[GGL] Shipping ${market.shippingServiceName} (${market.shippingFlatRate} ${market.currency})`);
  } catch (e) {
    if (e.status === 404 || /not found/i.test(text(e.message))) {
      await insertShipping(merchantFetch, accountId, market);
    } else if (!/already exists/i.test(text(e.message))) {
      throw e;
    }
  }
  await applyBusinessBaseline(merchantFetch, accountId, market);

  if (flags.renamePl) {
    await renamePlSubAccount(merchantFetch, mcaId);
  }

  console.log(`\n[GGL] Done. Next steps in MC UI:`);
  console.log(`  1. Switch to sub-account ${accountId} (${wantedName})`);
  console.log(`  2. Products → Feeds → Add primary feed → Sheets tab "${market.sheetName}"`);
  console.log(`  3. feedLabel=${market.feedLabel}, language=${market.contentLanguage}, country=${market.targetCountries.join(',')}`);
  console.log(`  4. npm run merchant:sheet:${market.code.toLowerCase()}:apply`);
  console.log(`  5. npm run merchant:api:audit-market -- --market=${market.code}`);
}

main().catch((e) => {
  console.error('[GGL]', e.message || e);
  process.exit(1);
});
