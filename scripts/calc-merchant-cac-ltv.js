#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * [GGL] CAC / LTV calculator for Alumineu B2B (Shopping / paid acquisition).
 *
 * Defaults from alumineu-business-model DAT 2026-05-20 + finance-ops margin logic.
 *
 * Usage:
 *   node scripts/calc-merchant-cac-ltv.js
 *   node scripts/calc-merchant-cac-ltv.js --aov=2100 --margin=0.13 --cpa=180
 *   node scripts/calc-merchant-cac-ltv.js --budget=80 --cpc=2.5 --cvr-order=0.02
 */

function num(v, fallback) {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function parseArgs(argv) {
  const o = {
    aov: 2096,
    margin: 0.134,
    ordersPerBuyerYear: 582 / 165,
    lifetimeYears: 3,
    repeatShare: 0.62,
    commissionPct: 0,
    cpa: null,
    budget: 80,
    cpc: 2.5,
    cvrLead: 0.04,
    cvrOrder: 0.015,
    newBuyersPerMonth: null
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const m = a.match(/^--([\w-]+)=(.+)$/);
    if (!m) continue;
    const k = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const v = m[2];
    if (k === 'aov') o.aov = num(v, o.aov);
    if (k === 'margin') o.margin = num(v, o.margin);
    if (k === 'ordersPerBuyerYear') o.ordersPerBuyerYear = num(v, o.ordersPerBuyerYear);
    if (k === 'lifetimeYears') o.lifetimeYears = num(v, o.lifetimeYears);
    if (k === 'repeatShare') o.repeatShare = num(v, o.repeatShare);
    if (k === 'commissionPct') o.commissionPct = num(v, o.commissionPct);
    if (k === 'cpa') o.cpa = num(v, o.cpa);
    if (k === 'budget') o.budget = num(v, o.budget);
    if (k === 'cpc') o.cpc = num(v, o.cpc);
    if (k === 'cvrLead') o.cvrLead = num(v, o.cvrLead);
    if (k === 'cvrOrder') o.cvrOrder = num(v, o.cvrOrder);
    if (k === 'newBuyersPerMonth') o.newBuyersPerMonth = num(v, o.newBuyersPerMonth);
  }
  return o;
}

function fmt(n, d = 0) {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function main() {
  const p = parseArgs(process.argv);

  const gpFirstOrder = p.aov * p.margin * (1 - p.commissionPct);
  const ordersLifetime = p.ordersPerBuyerYear * p.lifetimeYears;
  const gpLifetime = gpFirstOrder * ordersLifetime;
  const revenueLifetime = p.aov * ordersLifetime;

  const breakEvenCpaFirst = gpFirstOrder;
  const breakEvenCpaLifetime = gpLifetime;
  const breakEvenCpaConservative = gpFirstOrder + gpFirstOrder * p.repeatShare * (ordersLifetime - 1);

  console.log('[GGL] Alumineu CAC / LTV (gross profit basis, PL B2B)\n');
  console.log('Inputs:');
  console.log(`  AOV net:              ${fmt(p.aov)} PLN`);
  console.log(`  Gross margin:         ${fmt(p.margin * 100, 1)}%`);
  console.log(`  Orders / buyer / year: ${fmt(p.ordersPerBuyerYear, 2)}  (582 orders / 165 buyers L12M)`);
  console.log(`  Lifetime horizon:     ${p.lifetimeYears} years`);
  console.log(`  Repeat revenue share: ${fmt(p.repeatShare * 100, 0)}%`);
  console.log('');

  console.log('Unit economics (one buyer):');
  console.log(`  Gross profit / 1st order:     ${fmt(gpFirstOrder)} PLN`);
  console.log(`  Orders over ${p.lifetimeYears}y:            ${fmt(ordersLifetime, 1)}`);
  console.log(`  Gross profit LTV (${p.lifetimeYears}y):      ${fmt(gpLifetime)} PLN`);
  console.log(`  Revenue LTV (${p.lifetimeYears}y):           ${fmt(revenueLifetime)} PLN`);
  console.log('');

  console.log('Break-even CPA (max pay per NEW buyer):');
  console.log(`  1st order only:               ${fmt(breakEvenCpaFirst)} PLN`);
  console.log(`  Full LTV (${p.lifetimeYears}y, all orders):    ${fmt(breakEvenCpaLifetime)} PLN`);
  console.log(
    `  Blended (repeat-adjusted):     ${fmt(breakEvenCpaConservative)} PLN  ← practical ceiling`
  );
  console.log('');

  const safeCpa = breakEvenCpaFirst * 0.7;
  const targetCpa = breakEvenCpaConservative * 0.5;
  console.log('Suggested CPA targets (Shopping PL test):');
  console.log(`  Conservative (70% of 1st-order GP):  ${fmt(safeCpa)} PLN`);
  console.log(`  Aggressive scale (50% of blended):   ${fmt(targetCpa)} PLN`);
  console.log('');

  if (p.cpa != null) {
    const roiFirst = ((gpFirstOrder - p.cpa) / p.cpa) * 100;
    const roiLife = ((gpLifetime - p.cpa) / p.cpa) * 100;
    const monthsToPayback = p.cpa / (gpFirstOrder * (p.ordersPerBuyerYear / 12));
    console.log(`Scenario CPA = ${fmt(p.cpa)} PLN:`);
    console.log(`  ROI on 1st order:     ${fmt(roiFirst, 0)}%  ${roiFirst >= 0 ? 'OK' : 'LOSS'}`);
    console.log(`  ROI on ${p.lifetimeYears}y LTV:    ${fmt(roiLife, 0)}%`);
    console.log(`  Payback (GP only):    ${fmt(monthsToPayback, 1)} months at avg order cadence`);
    console.log('');
  }

  const clicksPerDay = p.budget / p.cpc;
  const leadsPerDay = clicksPerDay * p.cvrLead;
  const ordersPerDay = clicksPerDay * p.cvrOrder;
  const costPerLead = p.cpc / p.cvrLead;
  const cpaFromFunnel = p.cpc / p.cvrOrder;

  console.log('Ads funnel (daily, from budget & rates):');
  console.log(`  Daily budget:         ${fmt(p.budget)} PLN`);
  console.log(`  CPC:                  ${fmt(p.cpc, 2)} PLN`);
  console.log(`  Clicks / day:         ${fmt(clicksPerDay, 1)}`);
  console.log(`  CVR → lead:           ${fmt(p.cvrLead * 100, 2)}%  → ${fmt(leadsPerDay, 2)} leads/day`);
  console.log(`  CVR → 1st order:      ${fmt(p.cvrOrder * 100, 2)}%  → ${fmt(ordersPerDay, 2)} orders/day`);
  console.log(`  Cost / lead:          ${fmt(costPerLead)} PLN`);
  console.log(`  CPA (if CVR=order):   ${fmt(cpaFromFunnel)} PLN`);
  console.log('');

  const newBuyersMonth = p.newBuyersPerMonth ?? ordersPerDay * 30;
  const monthlySpend = p.budget * 30;
  const monthlyGpNew = newBuyersMonth * gpFirstOrder;
  const monthlyGpLtvYear1 = newBuyersMonth * gpFirstOrder * Math.min(p.ordersPerBuyerYear, 12 / 12);
  const impliedCpa = monthlySpend / Math.max(newBuyersMonth, 0.01);

  console.log('Monthly scale (same budget every day):');
  console.log(`  Ad spend / month:     ${fmt(monthlySpend)} PLN`);
  console.log(`  New buyers / month:   ${fmt(newBuyersMonth, 1)}  (at CVR order)`);
  console.log(`  Implied CPA:          ${fmt(impliedCpa)} PLN`);
  console.log(`  GP month-1 (1st ord): ${fmt(monthlyGpNew)} PLN`);
  console.log(`  GP / ad spend (M1):   ${fmt((monthlyGpNew / monthlySpend) * 100, 0)}%  (not ROI, gross only)`);
  console.log('');

  console.log('Rules of thumb:');
  console.log('  • CPA < ~190 PLN → 1st order roughly pays back (13% × 2096 PLN).');
  console.log('  • CPA < ~350 PLN → OK if buyer becomes repeat (62% model).');
  console.log('  • CPA > ~960 PLN → need full 3y LTV — unrealistic for cold Shopping.');
  console.log('  • Track Planfix: Partnerski + source=google / utm_campaign=pl_profiles.');
}

main();
