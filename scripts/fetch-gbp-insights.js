#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Fetch GBP profile views (28d) via Performance API and append snapshot.
 *
 * Usage:
 *   npm run gbp:insights
 *   npm run gbp:insights -- --days=28 --reviews=5
 */
const fs = require('fs');
const path = require('path');
const {
  getAccessToken,
  resolveLocation,
  fetchProfileViews28d,
} = require('./lib/business-profile-client');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
const OUT = path.join(ROOT, 'data', 'gbp_snapshots.jsonl');

function parseDays(argv) {
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--days=')) return Number(a.slice(7));
    if (a === '--days' && argv[i + 1]) return Number(argv[i + 1]);
  }
  return 28;
}

function parseReviews(argv) {
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--reviews=')) return Number(a.slice(10));
    if (a === '--reviews' && argv[i + 1]) return Number(argv[i + 1]);
  }
  return null;
}

async function fetchPublicReviewCount() {
  const key = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
  if (!key) return null;
  const placeId = 'ChIJg6A4M0BTHEcR0PbYj7Veosg';
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'userRatingCount,rating',
    },
  });
  if (!res.ok) return null;
  const p = await res.json();
  return Number.isFinite(p.userRatingCount) ? p.userRatingCount : null;
}

async function main() {
  const days = parseDays(process.argv) || 28;
  const reviewsArg = parseReviews(process.argv);

  const accessToken = await getAccessToken(ROOT);
  const { location } = await resolveLocation(accessToken, ROOT);
  const views = await fetchProfileViews28d(accessToken, location.name, days);

  let reviewCount = reviewsArg;
  if (!Number.isFinite(reviewCount)) {
    reviewCount = await fetchPublicReviewCount();
  }

  const row = {
    date: new Date().toISOString().slice(0, 10),
    profile_views: views.profile_views,
    review_count: Number.isFinite(reviewCount) ? reviewCount : null,
    reviews_with_photo: null,
    note: `gbp:insights API ${days}d · ${location.title}`,
    maps_url: 'https://maps.app.goo.gl/Ske4Fh5WGanB7hij7',
    recorded_by: 'gbp:insights',
    period_start: views.period.start,
    period_end: views.period.end,
    metrics: views.by_metric,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.appendFileSync(OUT, `${JSON.stringify(row)}\n`, 'utf8');

  console.log('[GGL] GBP insights snapshot saved:', OUT);
  console.log(JSON.stringify(row, null, 2));
}

main().catch((e) => {
  console.error('[GGL] FAIL:', e.message);
  process.exit(1);
});
