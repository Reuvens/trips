import { describe, expect, it } from 'vitest';
import { loadProjectData } from '../src/data/loadTrip.js';
import { deriveTripViewModel } from '../src/domain/deriveTrip.js';
import { generateCanonicalMarkdown } from '../src/domain/markdownExport.js';
import { html, parseIsoDate } from '../src/domain/format.js';

describe('Pure Domain & Financial Derivation Engine (Layer 2)', () => {
  const bundle = loadProjectData();
  const vm = deriveTripViewModel(bundle.trip, bundle.rates);

  it('derives all calendar counts without manual duplication', () => {
    expect(vm.dates.nights).toBe(8);
    expect(vm.dates.aptNights).toBe(7);
    expect(vm.dates.courseDays).toBe(6);
    expect(vm.dates.skiDays).toBe(7);
    expect(vm.dates.foodDays).toBe(9);
    expect(() => parseIsoDate('2027-02-29')).toThrow(); // 2027 is not a leap year
  });

  it('derives exact party composition and pass totals', () => {
    expect(vm.party.peopleCount).toBe(5);
    expect(vm.party.skiersCount).toBe(4);
    expect(vm.party.beginnersCount).toBe(3);
    expect(vm.party.advancedCount).toBe(1);
    expect(vm.party.nonSkiersCount).toBe(1);
    // 407 + 346 + 346 + 203 + 98 compulsory insurance = 1,400
    expect(vm.decided.passesEur).toBe(1400);
  });

  it('computes exact €9,571 canonical budget and balanced 4-stage cashflow', () => {
    expect(vm.budget.totalEur).toBe(9571);
    expect(vm.budget.paidEur).toBe(1650);
    expect(vm.budget.leftEur).toBe(7921);

    const stageMap = Object.fromEntries(vm.budget.stages.map((s) => [s.key, s.eur]));
    expect(stageMap.paid).toBe(1650);
    expect(stageMap.bookedPending).toBe(2200); // 1,650 Calanda balance + 550 Casa Noemi
    expect(stageMap.toBookOnline).toBe(3865); // 1,230 + 1,400 + 680 + 555
    expect(stageMap.onSite).toBe(1856); // 50 + 6 + 1,800
    expect(
      stageMap.paid! + stageMap.bookedPending! + stageMap.toBookOnline! + stageMap.onSite!
    ).toBe(9571);
  });

  it('computes exact flight points, taxes, car rental, and Centrale bundle savings', () => {
    expect(vm.flights.totalTickets).toBe(5);
    expect(vm.flights.pointsTotal).toBe(102400);
    expect(vm.flights.usdTotal).toBeCloseTo(378.9, 2);
    expect(vm.decided.carOption.eurReturn).toBe(1155); // 9*120 + 59 fuel + 16 tolls
    expect(vm.simulator.centraleBundleSavingsEur).toBe(165); // 1,235 - 1,070
  });

  it('escapes untrusted strings in SafeHtml by default (XSS prevention)', () => {
    const untrusted = '<script>alert("xss")</script>';
    const rendered = html`<div>${untrusted}</div>`.toString();
    expect(rendered).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
  });

  it('generates lossless Markdown containing budget, stays, all 5 members, and all 13 tasks', () => {
    const md = generateCanonicalMarkdown(vm);
    expect(md).toContain('€9,571');
    expect(md).toContain('Appartamenti Calanda');
    expect(md).toContain('Casa Noemi');
    for (const m of vm.party.members) {
      expect(md).toContain(m.nameHe);
    }
    for (const item of vm.openItems) {
      expect(md).toContain(item.titleHe);
    }
  });
});
