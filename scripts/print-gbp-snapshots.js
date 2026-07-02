#!/usr/bin/env node
/* eslint-disable no-console */
/** [GGL] Print GBP snapshot history. */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'gbp_snapshots.jsonl');

function main() {
  if (!fs.existsSync(OUT)) {
    console.log('[GGL] No snapshots yet. Run: npm run gbp:snapshot -- --views=N --reviews=N');
    process.exit(0);
  }
  const rows = fs
    .readFileSync(OUT, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  console.log('[GGL] GBP snapshots (%d):\n', rows.length);
  for (const r of rows) {
    const photo = r.reviews_with_photo != null ? `, with_photo=${r.reviews_with_photo}` : '';
    const views = r.profile_views == null ? 'n/a' : r.profile_views;
    console.log(`  ${r.date}  views=${views}  reviews=${r.review_count}${photo}  ${r.note || ''}`);
  }
}

main();
