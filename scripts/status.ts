#!/usr/bin/env tsx
/**
 * Live Multi-Trip Status CLI (`npm run status [slug]`).
 * Prints current countdown, exchange rate, budget summary, and tasks for all trips (or a specific slug).
 */
import { discoverTripSlugs, loadProjectData } from '../src/data/loadTrip.js';
import { deriveTripViewModel } from '../src/domain/deriveTrip.js';
import { daysBetween } from '../src/domain/format.js';

function main(): void {
  const todayIso = new Date().toISOString().slice(0, 10);
  const filterSlug = process.argv[2]?.trim();
  const slugs = filterSlug ? [filterSlug] : discoverTripSlugs();

  for (const slug of slugs) {
    const bundle = loadProjectData(undefined, slug);
    const vm = deriveTripViewModel(bundle.trip, bundle.rates);
    const daysToStart = daysBetween(todayIso, vm.dates.startIso);

    console.log(`\n═══ [${slug}] ${vm.decided.nameHe} — תמונת מצב חיה (${todayIso}) ═══`);
    console.log(`תאריכים: ${vm.dates.windowHe} (${daysToStart > 0 ? `בעוד ${daysToStart} ימים` : 'במהלך/אחרי הטיול'})`);
    console.log(`שער יורו: ₪${vm.rates.eurIlsDisplay} (${vm.rates.source}, נבדק ${vm.rates.checkedIso})`);
    console.log(`תקציב בסיס: ${vm.budget.totalText} (${vm.budget.totalIlsText}) · שולם: ${vm.budget.paidText} · נותר: ${vm.budget.leftText}`);
    console.log(`משימות פתוחות (${vm.openItems.length}):`);
    for (const item of vm.openItems) {
      const icon = item.urgency === 'red' ? '🔴' : item.urgency === 'amber' ? '🟠' : '🟡';
      let dlNote = '';
      if (item.deadline) {
        const diff = daysBetween(todayIso, item.deadline);
        dlNote = diff < 0 ? ` [באיחור ${-diff} ימים! יעד ${item.deadline}]` : ` [עד ${item.deadline}, עוד ${diff} ימים]`;
      }
      console.log(`  ${icon} ${item.id}: ${item.titleHe}${dlNote}`);
    }
  }
}

main();
