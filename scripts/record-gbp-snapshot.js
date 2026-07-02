#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Record Google Business Profile KPI snapshot (owner C1.6).
 * Usage:
 *   npm run gbp:snapshot -- --views=1234 --reviews=42 --reviews-with-photo=18
 *   npm run gbp:snapshot -- --views=1234 --reviews=42 --note="after Q2 campaign"
 * Reads/writes data/gbp_snapshots.jsonl (append-only).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'gbp_snapshots.jsonl');

function readOpt(argv, i, name) {
  const a = argv[i];
  if (a.startsWith(`${name}=`)) return { v: a.slice(name.length + 1), i };
  if (a === name && argv[i + 1]) return { v: argv[i + 1], i: i + 1 };
  return null;
}

function parseArgs(argv) {
  const out = { views: null, reviews: null, reviewsWithPhoto: null, note: '' };
  for (let i = 2; i < argv.length; i++) {
    const views = readOpt(argv, i, '--views');
    const reviews = readOpt(argv, i, '--reviews');
    const photos = readOpt(argv, i, '--reviews-with-photo') || readOpt(argv, i, '--photos');
    const note = readOpt(argv, i, '--note');
    const date = readOpt(argv, i, '--date');

    if (views) {
      out.views = Number(views.v);
      i = views.i;
    } else if (reviews) {
      out.reviews = Number(reviews.v);
      i = reviews.i;
    } else if (photos) {
      out.reviewsWithPhoto = Number(photos.v);
      i = photos.i;
    } else if (note) {
      out.note = note.v;
      i = note.i;
    } else if (date) {
      out.date = date.v;
      i = date.i;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const hasViews = Number.isFinite(args.views);
  const hasReviews = Number.isFinite(args.reviews);
  if (!hasViews && !hasReviews) {
    console.error(
      '[GGL] Usage: npm run gbp:snapshot -- --views=<N> --reviews=<N> [--reviews-with-photo=<N>] [--note="..."]'
    );
    console.error('[GGL] Можно только --reviews=<N>, если просмотры пока недоступны (см. GOOGLE_GBP_ACCESS.md).');
    process.exit(1);
  }

  const row = {
    date: args.date || new Date().toISOString().slice(0, 10),
    profile_views: hasViews ? args.views : null,
    review_count: args.reviews,
    reviews_with_photo: Number.isFinite(args.reviewsWithPhoto) ? args.reviewsWithPhoto : null,
    note: args.note || '',
    maps_url: 'https://maps.app.goo.gl/Ske4Fh5WGanB7hij7',
    recorded_by: 'gbp:snapshot',
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.appendFileSync(OUT, `${JSON.stringify(row)}\n`, 'utf8');

  console.log('[GGL] GBP snapshot saved:', OUT);
  console.log(JSON.stringify(row, null, 2));

  const lines = fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length >= 2) {
    const prev = JSON.parse(lines[lines.length - 2]);
    const dViews = row.profile_views - prev.profile_views;
    const dRev = row.review_count - prev.review_count;
    console.log(`[GGL] vs previous (${prev.date}): views ${dViews >= 0 ? '+' : ''}${dViews}, reviews ${dRev >= 0 ? '+' : ''}${dRev}`);
  }
}

main();
