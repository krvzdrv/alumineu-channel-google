#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] Keyword Planner (read-only) for alumineu.de: DE + AT, German, last 12 months.
 * Historical metrics for the CAT phrase list + "Discover" ideas from seeds.
 * Does not touch bids or campaigns.
 *
 * Usage: npm run ads:planner:de
 * Output: docs/reports/keyword_planner_de_2026-10.csv
 */
const fs = require('fs');
const path = require('path');
const { createGoogleAdsClient } = require('./lib/google-ads-client');

const ROOT = path.join(__dirname, '..');
const CUSTOMER_ID = process.env.GOOGLE_ADS_PLANNER_CUSTOMER_ID || '8183930344';
const GEO = { DE: 'geoTargetConstants/2276', AT: 'geoTargetConstants/2040' };
const LANGUAGE_DE = 'languageConstants/1001';
const NETWORK_GOOGLE_SEARCH = 2;
const OUT = path.join(ROOT, 'docs/reports/keyword_planner_de_2026-10.csv');
const SERP_IN = path.join(ROOT, 'docs/reports/serp_de_p0_2026-10.json');
const SERP_OUT = path.join(ROOT, 'docs/reports/serp_de_p0_2026-10.csv');

const TARGETS = {
  '/produkte/harpunenprofile': ['spanndecke profil', 'spanndecke profile', 'spanndecke leiste', 'spanndecke leisten', 'spanndecke montage leiste', 'spanndecke befestigungsprofil', 'spanndecke befestigung', 'spanndecke keder', 'keder spanndecke', 'harpunenprofil spanndecke', 'harpunensystem spanndecke', 'spanndecke zubehör', 'spanndecke kaufen'],
  '/schattenfugen': ['schattenfuge spanndecke', 'spanndecke mit schattenfuge', 'schattenfuge', 'schattenfuge decke', 'schattenfuge decke profil', 'schattenfuge decke wand', 'schattenfuge wand', 'schattenfugenprofil', 'schattenfugenprofile', 'schattenfugenprofil decke', 'schattenfugenprofil spanndecke', 'schattenfugenprofil wand', 'schattenprofil', 'schattenprofil decke', 'schattennut', 'schattennutprofil', 'deckenprofil schattenfuge', 'universalprofil spanndecke', 'abstandsprofil spanndecke', 'trennprofil spanndecke', 'schattenfuge lüftung', 'was ist eine schattenfuge', 'schattenfuge decke wie breit'],
  '/wandprofile': ['spanndecke wandprofil', 'wandprofil spanndecke', 'spanndecke ohne wandprofil', 'spanndecke abschlussleiste', 'spanndecke wandabschluss', 'deckenprofil spanndecke'],
  '/led-schattenfugen': ['schattenfuge led', 'schattenfuge led profil', 'schattenfuge led decke', 'schattenfuge led leiste', 'schattenfugen beleuchtung', 'led schattenfuge spanndecke', 'schwebende decke', 'schwebende decke led', 'schwebende spanndecke'],
  '/lichtlinie': ['lichtlinie spanndecke', 'lichtlinie decke', 'spanndecke led profil', 'spanndecke led leiste', 'led profil decke', 'spanndecke beleuchtet'],
  '/gardinennische': ['gardinennische spanndecke', 'spanndecke vorhangschiene', 'vorhangschiene spanndecke', 'gardinenschiene decke', 'gardinenschiene deckenmontage', 'gardinenleiste decke mit blende', 'gardinenschiene spanndecke'],
  '/zweistufige': ['zweistufige spanndecke', 'zweistufige spanndecke profil', 'spanndecke zwei ebenen', 'spanndecke stufe'],
  '/schienen': ['magnetschiene spanndecke', 'magnetschiene 48v spanndecke', 'magnetschiene decke'],
  '/konturbeleuchtung': ['konturbeleuchtung spanndecke', 'spanndecke led kontur'],
  'kontrolle': ['schattenfugenprofil trockenbau', 'schattenfuge decke trockenbau', 'led profil decke trockenbau']
};

const SEEDS = ['schattenfugenprofil', 'spanndecke profil', 'spanndecke leiste', 'schattenfuge decke', 'spanndecke vorhangschiene', 'lichtlinie decke', 'schattenfuge led', 'zweistufige spanndecke'];
const IDEA_KEEP = /spanndeck|profil|schattenfug|decke/i;
const IDEA_DROP = /trockenbau|rigips|knauf|gipskarton|leinwand|bilderrahmen|zylinder|\bobi\b|hornbach|bauhaus|toom|hagebau/i;

// Google Trends DE, 12 months, captured 2026-10-10 (trends.google.com explore API).
const TRENDS = {
  a: { schattenfugenprofil: 16, schattenprofil: 2, 'schattenfuge decke': 3, schattennut: 2, 'spanndecke schattenfuge': 2 },
  b: { 'spanndecke profil': null, 'spanndecke leiste': null, 'spanndecke wandprofil': null, 'spanndecke keder': null, harpunenprofil: null },
  c: { 'spanndecke vorhangschiene': 1, 'gardinenschiene decke': 47, gardinennische: 0, 'vorhangschiene decke': 31, 'gardinenleiste decke': 1 },
  d: { 'schattenfuge led': 7, 'schwebende decke': 0, 'lichtlinie decke': 0, 'led profil decke': 3, 'spanndecke led': 0 }
};

const COMPETITION = { 2: 'LOW', 3: 'MEDIUM', 4: 'HIGH', LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' };
const MONTH_NUM = { JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6, JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12 };

function monthNum(m) {
  if (typeof m === 'number') return m - 1;
  return MONTH_NUM[m] || 0;
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function trendsFor(phrase) {
  for (const [g, map] of Object.entries(TRENDS)) {
    if (phrase in map) return { group: g, avg: map[phrase] == null ? 'n/a (zu wenig Daten)' : map[phrase] };
  }
  return { group: '', avg: '' };
}

async function historical(customer, keywords, geo) {
  const res = await customer.keywordPlanIdeas.generateKeywordHistoricalMetrics({
    customer_id: CUSTOMER_ID,
    keywords,
    geo_target_constants: [geo],
    language: LANGUAGE_DE,
    keyword_plan_network: NETWORK_GOOGLE_SEARCH,
    include_adult_keywords: false
  });
  const byPhrase = new Map();
  for (const r of res.results || []) {
    const m = r.keyword_metrics || {};
    const monthly = (m.monthly_search_volumes || [])
      .map((x) => ({ ym: `${x.year}-${String(monthNum(x.month)).padStart(2, '0')}`, n: Number(x.monthly_searches || 0) }))
      .sort((a, b) => a.ym.localeCompare(b.ym));
    const vols = monthly.map((x) => x.n);
    const row = {
      planner_text: r.text,
      avg: m.avg_monthly_searches == null ? 0 : Number(m.avg_monthly_searches),
      range: vols.length ? `${Math.min(...vols)}–${Math.max(...vols)}` : '',
      competition: COMPETITION[m.competition] || '',
      bid_low: m.low_top_of_page_bid_micros ? (Number(m.low_top_of_page_bid_micros) / 1e6).toFixed(2) : '',
      bid_high: m.high_top_of_page_bid_micros ? (Number(m.high_top_of_page_bid_micros) / 1e6).toFixed(2) : '',
      monthly: monthly.map((x) => `${x.ym}:${x.n}`).join(' ')
    };
    for (const t of [r.text, ...(r.close_variants || [])]) byPhrase.set(String(t).toLowerCase(), row);
  }
  return byPhrase;
}

async function ideas(customer) {
  const res = await customer.keywordPlanIdeas.generateKeywordIdeas({
    customer_id: CUSTOMER_ID,
    language: LANGUAGE_DE,
    geo_target_constants: [GEO.DE],
    keyword_plan_network: NETWORK_GOOGLE_SEARCH,
    include_adult_keywords: false,
    keyword_seed: { keywords: SEEDS },
    page_size: 1000
  });
  const list = Array.isArray(res) ? res : res.results || [];
  return list.map((r) => String(r.text).toLowerCase()).filter((t) => IDEA_KEEP.test(t) && !IDEA_DROP.test(t));
}

(async () => {
  const ads = await createGoogleAdsClient(ROOT);
  const customer = ads.customer(CUSTOMER_ID);
  const [info] = await customer.query('SELECT customer.currency_code FROM customer LIMIT 1');
  const currency = info?.customer?.currency_code || '';

  const targetOf = new Map();
  for (const [page, list] of Object.entries(TARGETS)) for (const p of list) targetOf.set(p, page);
  const listed = [...targetOf.keys()];

  const ideaList = (await ideas(customer)).filter((t) => !targetOf.has(t));
  const all = [...listed, ...ideaList];
  console.log(`[GGL] Phrases: ${listed.length} listed + ${ideaList.length} ideas`);

  const de = await historical(customer, all, GEO.DE);
  const at = await historical(customer, all, GEO.AT);

  const header = ['phrase', 'target_page', 'avg_monthly_de', 'range_de', 'competition', 'bid_low', 'bid_high', 'avg_monthly_at', 'trends_group', 'trends_avg', 'source', 'planner_merged_as', 'bid_currency', 'monthly_de'];
  const lines = [header.join(',')];
  for (const phrase of all) {
    const d = de.get(phrase) || {};
    const a = at.get(phrase) || {};
    const tr = trendsFor(phrase);
    const source = targetOf.has(phrase) ? 'keyword_planner_historical' : 'keyword_planner_discover';
    lines.push([
      phrase, targetOf.get(phrase) || '', d.avg ?? 0, d.range || '', d.competition || '', d.bid_low || '', d.bid_high || '',
      a.avg ?? 0, tr.group, tr.avg, tr.group ? `${source}+google_trends` : source,
      d.planner_text && d.planner_text !== phrase ? d.planner_text : '', d.bid_low || d.bid_high ? currency : '', d.monthly || ''
    ].map(csvCell).join(','));
  }
  fs.writeFileSync(OUT, `${lines.join('\n')}\n`);
  console.log(`[GGL] Saved ${OUT} (${all.length} rows, bids in ${currency})`);

  const { serp } = JSON.parse(fs.readFileSync(SERP_IN, 'utf8'));
  const p0 = Object.keys(serp);
  const deP0 = await historical(customer, p0, GEO.DE);
  const serpLines = [['phrase', 'volume', 'top10', 'alumineu_position'].join(',')];
  for (const phrase of p0) {
    const urls = serp[phrase];
    const pos = urls.findIndex((u) => new URL(u).hostname.replace(/^www\./, '') === 'alumineu.de');
    const top10 = urls.slice(0, 10).map((u) => {
      const x = new URL(u);
      return `${x.hostname.replace(/^www\./, '')} › ${x.pathname}`;
    }).join(' | ');
    serpLines.push([phrase, deP0.get(phrase)?.avg ?? 0, top10, pos >= 0 ? pos + 1 : `>${urls.length}`].map(csvCell).join(','));
  }
  fs.writeFileSync(SERP_OUT, `${serpLines.join('\n')}\n`);
  console.log(`[GGL] Saved ${SERP_OUT} (${p0.length} rows)`);
})().catch((e) => {
  console.error('[GGL]', e.errors ? JSON.stringify(e.errors).slice(0, 800) : e.message || e);
  process.exit(1);
});
