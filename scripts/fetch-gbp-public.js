#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Public GBP facts from Google Maps (reviews count, rating).
 * Profile views are NOT public — use business.google.com Insights or gbp:auth (future).
 *
 * Usage: npm run gbp:fetch-public
 * Optional: GOOGLE_PLACES_API_KEY in .env (Places API New)
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PLACE_ID = 'ChIJg6A4M0BTHEcR0PbYj7Veosg'; // Alumineu Piastów (from Maps)
const MAPS_URL = 'https://maps.app.goo.gl/Ske4Fh5WGanB7hij7';

async function fetchViaPlacesApi(key) {
  const fieldMask = 'id,displayName,rating,userRatingCount';
  const url = `https://places.googleapis.com/v1/places/${PLACE_ID}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask
    }
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Places API ${res.status}: ${t.slice(0, 300)}`);
  }
  return res.json();
}

function main() {
  const key = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
  if (!key) {
    console.log('[GGL] GOOGLE_PLACES_API_KEY не задан — используйте публичные данные вручную или browser.');
    console.log('[GGL] Публично (Maps, 2026-05-21): rating 5.0, reviews 5 — см. отчёт gbp:fetch-public');
    console.log('[GGL] Запись: npm run gbp:snapshot -- --reviews=5 --note="public Maps"');
    process.exit(0);
  }

  fetchViaPlacesApi(key)
    .then((p) => {
      const out = {
        source: 'places_api',
        place_id: PLACE_ID,
        maps_url: MAPS_URL,
        name: p.displayName?.text || 'Alumineu',
        rating: p.rating ?? null,
        review_count: p.userRatingCount ?? null,
        profile_views: null,
        fetched_at: new Date().toISOString()
      };
      console.log('[GGL] Public GBP facts:\n', JSON.stringify(out, null, 2));
      if (Number.isFinite(out.review_count)) {
        console.log(
          `\n[GGL] Записать: npm run gbp:snapshot -- --reviews=${out.review_count} --note="places_api ${out.fetched_at.slice(0, 10)}"`
        );
      }
    })
    .catch((e) => {
      console.error('[GGL]', e.message);
      process.exit(1);
    });
}

main();
