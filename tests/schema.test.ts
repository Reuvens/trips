import { describe, expect, it } from 'vitest';
import { loadProjectData } from '../src/data/loadTrip.js';
import { TripDataSchema, RatesSchema } from '../src/schema/trip.schema.js';

describe('Zod Schema Validation (Layer 1)', () => {
  it('validates the canonical project YAML files cleanly', () => {
    const bundle = loadProjectData();
    expect(bundle.trip.meta.id).toBe('ski-livigno-2027');
    expect(bundle.trip.party.members).toHaveLength(5);
    expect(bundle.rates.eur_ils).toBeGreaterThan(2);
    expect(Object.keys(bundle.privateRefs).length).toBeGreaterThanOrEqual(7);
  });

  it('rejects malformed dates, invalid clocks, non-https URLs, and out-of-range fit scores', () => {
    const bundle = loadProjectData();

    // Bad ISO date
    const badDate = structuredClone(bundle.trip);
    badDate.dates.start = '26-02-2027';
    expect(() => TripDataSchema.parse(badDate)).toThrow();

    // Bad clock
    const badClock = structuredClone(bundle.trip);
    badClock.flights.legs[0]!.dep = '25:99';
    expect(() => TripDataSchema.parse(badClock)).toThrow();

    // Non-HTTPS URL
    const badUrl = structuredClone(bundle.trip);
    badUrl.apartment.url = 'http://insecure.example.com';
    expect(() => TripDataSchema.parse(badUrl)).toThrow(/https:\/\//);

    // Fit score outside 1..5
    const badFit = structuredClone(bundle.trip);
    badFit.fit.scores.livigno!.snow!.n = 6;
    expect(() => TripDataSchema.parse(badFit)).toThrow();

    // Impossible calendar date (2027 is not a leap year)
    const feb29 = structuredClone(bundle.trip);
    feb29.dates.start = '2027-02-29';
    expect(() => TripDataSchema.parse(feb29)).toThrow();

    // Invalid IANA timezone
    const badTz = structuredClone(bundle.trip);
    badTz.flights.legs[0]!.fromTz = 'Mars/Olympus';
    expect(() => TripDataSchema.parse(badTz)).toThrow();

    // Inverted stay price range (eurLow > eurWeek)
    const badStayRange = structuredClone(bundle.trip);
    badStayRange.resorts[1]!.stays![0]!.eurLow = 4500;
    badStayRange.resorts[1]!.stays![0]!.eurWeek = 3300;
    expect(() => TripDataSchema.parse(badStayRange)).toThrow();

    // Negative exchange rate
    expect(() =>
      RatesSchema.parse({
        eur_ils: -3.5,
        eur_usd: 1.1,
        usd_ils: 3.2,
        checked: '2026-11-23',
        source: 'test',
      })
    ).toThrow();
  });
});
