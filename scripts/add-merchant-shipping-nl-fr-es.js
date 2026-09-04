#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Add shipping services for NL/FR/ES to Merchant Center.
 *
 * Usage:
 *   node scripts/add-merchant-shipping-nl-fr-es.js --dry-run
 *   node scripts/add-merchant-shipping-nl-fr-es.js --apply
 */

const { createMerchantClient } = require('./lib/merchant-api-client');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const NEW_SERVICES = [
  {
    serviceName: 'Verzending NL',
    active: true,
    deliveryCountries: ['NL'],
    currencyCode: 'EUR',
    deliveryTime: {
      minTransitDays: 2,
      maxTransitDays: 5,
      cutoffTime: { hour: 0, minute: 0, timeZone: 'Europe/Amsterdam' },
      minHandlingDays: 0,
      maxHandlingDays: 1,
      handlingBusinessDayConfig: {
        businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      },
      transitBusinessDayConfig: {
        businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      }
    },
    rateGroups: [
      {
        singleValue: {
          flatRate: {
            amountMicros: '9990000',
            currencyCode: 'EUR'
          }
        }
      }
    ],
    shipmentType: 'DELIVERY'
  },
  {
    serviceName: 'Livraison FR',
    active: true,
    deliveryCountries: ['FR'],
    currencyCode: 'EUR',
    deliveryTime: {
      minTransitDays: 3,
      maxTransitDays: 7,
      cutoffTime: { hour: 0, minute: 0, timeZone: 'Europe/Paris' },
      minHandlingDays: 0,
      maxHandlingDays: 1,
      handlingBusinessDayConfig: {
        businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      },
      transitBusinessDayConfig: {
        businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      }
    },
    rateGroups: [
      {
        singleValue: {
          flatRate: {
            amountMicros: '14990000',
            currencyCode: 'EUR'
          }
        }
      }
    ],
    shipmentType: 'DELIVERY'
  },
  {
    serviceName: 'Envío ES',
    active: true,
    deliveryCountries: ['ES'],
    currencyCode: 'EUR',
    deliveryTime: {
      minTransitDays: 3,
      maxTransitDays: 7,
      cutoffTime: { hour: 0, minute: 0, timeZone: 'Europe/Madrid' },
      minHandlingDays: 0,
      maxHandlingDays: 1,
      handlingBusinessDayConfig: {
        businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      },
      transitBusinessDayConfig: {
        businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      }
    },
    rateGroups: [
      {
        singleValue: {
          flatRate: {
            amountMicros: '14990000',
            currencyCode: 'EUR'
          }
        }
      }
    ],
    shipmentType: 'DELIVERY'
  }
];

function parseArgs(argv) {
  let apply = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') apply = true;
    if (argv[i] === '--dry-run') apply = false;
  }
  return { apply };
}

async function main() {
  const { apply } = parseArgs(process.argv);
  const { merchantId, merchantFetch } = await createMerchantClient(ROOT);

  console.log(`[GGL] Merchant ID: ${merchantId}`);
  console.log(`[GGL] Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);

  const current = await merchantFetch(`/accounts/v1/accounts/${merchantId}/shippingSettings`);
  const existingNames = new Set((current.services || []).map((s) => s.serviceName));
  const services = [...(current.services || [])];

  for (const svc of NEW_SERVICES) {
    if (existingNames.has(svc.serviceName)) {
      console.log(`[GGL] SKIP: ${svc.serviceName} already exists`);
      continue;
    }
    console.log(`\n[GGL] Add: ${svc.serviceName}`);
    console.log(`  Countries: ${svc.deliveryCountries.join(',')}`);
    console.log(`  Currency: ${svc.currencyCode}`);
    console.log(`  Flat rate: ${svc.rateGroups[0].singleValue.flatRate.amountMicros} micros`);
    console.log(`  Transit: ${svc.deliveryTime.minTransitDays}-${svc.deliveryTime.maxTransitDays} days`);
    services.push(svc);
  }

  const body = {
    name: `accounts/${merchantId}/shippingSettings`,
    services,
    etag: current.etag || ''
  };

  if (apply) {
    const res = await merchantFetch(`/accounts/v1/accounts/${merchantId}/shippingSettings:insert`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    console.log(`\n[GGL] OK: ${res.services?.length || 0} shipping service(s) total`);
  } else {
    console.log(`\n[GGL] DRY RUN — would have ${services.length} services total`);
    console.log('Run with --apply to update shipping settings.');
  }
}

main().catch((err) => {
  console.error('[GGL] ERROR:', err.message || err);
  process.exit(1);
});
