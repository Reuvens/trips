import { describe, expect, it } from 'vitest';
import { loadProjectData } from '../src/data/loadTrip.js';
import { deriveTripViewModel } from '../src/domain/deriveTrip.js';
import { generateCanonicalMarkdown } from '../src/domain/markdownExport.js';
import { runAllPolicyChecks } from '../src/validation/policyChecks.js';
import { buildAllArtifacts } from '../scripts/build.js';

describe('Executable Policy & Anti-Drift Invariants (Layer 2 — Positive & Negative Mutations)', () => {
  const bundle = loadProjectData();
  const built = buildAllArtifacts();
  const vm = deriveTripViewModel(bundle.trip, bundle.rates);

  it('passes all RED policy checks on canonical project data', () => {
    const results = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: bundle.trip,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vm,
      renderedHtml: built.standaloneHtml,
      markdownExport: built.markdown,
      todayIso: '2026-11-23',
    });
    const reds = results.filter((r) => r.severity === 'RED');
    expect(reds).toEqual([]);
  });

  it('[S1] catches leaked private booking code in HTML or Markdown', () => {
    const fakeSecret = 'SECRET_PNR_ZX99Q1';
    const results = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: bundle.trip,
      rates: bundle.rates,
      privateRefs: { ...bundle.privateRefs, test_secret: fakeSecret },
      vm,
      renderedHtml: built.standaloneHtml + `<!-- ${fakeSecret} -->`,
      markdownExport: built.markdown,
    });
    const s1 = results.find((r) => r.code === 'S1');
    expect(s1?.severity).toBe('RED');
  });

  it('[V2+] catches un-tokenized € amount or relative time phrase inside YAML live prose', () => {
    const mutated = structuredClone(bundle.trip);
    mutated.openItems[0]!.whatHe = 'לשלם יתרה של €1,650 כמו שבדקנו לפני חודש';

    const results = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: mutated,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vm,
      renderedHtml: built.standaloneHtml,
      markdownExport: built.markdown,
    });
    const v2 = results.find((r) => r.code === 'V2');
    expect(v2?.severity).toBe('RED');
    expect(v2?.message).toContain('€');
  });

  it('[V25+ Regression Fix] paying Casa Noemi updates cashflow cleanly WITHOUT breaking V25', () => {
    const mutated = structuredClone(bundle.trip);
    mutated.firstNightBooked!.eurPaid = 550; // Booking charges the €550!
    const nextVm = deriveTripViewModel(mutated, bundle.rates);
    const nextMd = generateCanonicalMarkdown(nextVm);

    expect(nextVm.budget.paidEur).toBe(2200); // 1,650 + 550
    expect(nextVm.budget.leftEur).toBe(7371);
    expect(nextVm.budget.totalEur).toBe(9571);

    const results = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: mutated,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vm: nextVm,
      renderedHtml: built.standaloneHtml,
      markdownExport: nextMd,
    });
    const v25 = results.find((r) => r.code === 'V25');
    expect(v25?.severity).toBe('OK');
  });

  it('[V8] catches Google Hotels link with wrong check-in dates', () => {
    const badHtml =
      built.standaloneHtml +
      '<a href="https://www.google.com/travel/search?q=Livigno&checkin=2027-03-10&checkout=2027-03-17">bad</a>';
    const results = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: bundle.trip,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vm,
      renderedHtml: badHtml,
      markdownExport: built.markdown,
    });
    expect(results.find((r) => r.code === 'V8')?.severity).toBe('RED');
  });

  it('[V26] catches alternative resort mentioned outside the closed alternatives drawer', () => {
    const leakedHtml = `<p>אולי ניסע אל צרוויניה במקום</p>${built.standaloneHtml}`;
    const results = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: bundle.trip,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vm,
      renderedHtml: leakedHtml,
      markdownExport: built.markdown,
    });
    expect(results.find((r) => r.code === 'V26')?.severity).toBe('RED');
  });

  it('[V27] catches advice to merge El Al flight bookings', () => {
    const badMd = built.markdown + '\nמומלץ לאחד את הזמנות הטיסה באל על.';
    const results = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: bundle.trip,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vm,
      renderedHtml: built.standaloneHtml,
      markdownExport: badMd,
    });
    expect(results.find((r) => r.code === 'V27')?.severity).toBe('RED');
  });
});
