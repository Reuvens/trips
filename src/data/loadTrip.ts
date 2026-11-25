import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  PrivateRefsSchema,
  RatesSchema,
  TripDataSchema,
  type PrivateRefs,
  type RatesData,
  type TripData,
} from '../schema/trip.schema.js';

export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

export const DEFAULT_TRIP_SLUG = 'livigno-2027';

export interface LoadedBundle {
  tripSlug: string;
  tripDir: string;
  rawYamlObj: Record<string, unknown>;
  trip: TripData;
  rates: RatesData;
  privateRefs: PrivateRefs;
  usingExamplePrivateRefs: boolean;
  vaultPin: string;
  usingExampleVaultPin: boolean;
}

/**
 * Discovers all active trip folders under `trips/<slug>/` (ignoring `_template` or hidden dirs).
 */
export function discoverTripSlugs(rootDir = PROJECT_ROOT): string[] {
  const tripsRoot = path.join(rootDir, 'trips');
  if (!fs.existsSync(tripsRoot)) return [];
  return fs
    .readdirSync(tripsRoot, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        !d.name.startsWith('_') &&
        !d.name.startsWith('.') &&
        fs.existsSync(path.join(tripsRoot, d.name, 'trip.yaml'))
    )
    .map((d) => d.name)
    .sort();
}

export function loadProjectData(
  rootDir = PROJECT_ROOT,
  tripSlug = DEFAULT_TRIP_SLUG
): LoadedBundle {
  const tripDir = path.join(rootDir, 'trips', tripSlug);
  const tripPath = path.join(tripDir, 'trip.yaml');
  const ratesPath = path.join(rootDir, 'data', 'rates.yaml');
  const privatePath = path.join(tripDir, 'private.yaml');
  const privateExamplePath = path.join(tripDir, 'private.example.yaml');
  const pinPath = path.join(tripDir, 'vault.pin');
  const pinExamplePath = path.join(tripDir, 'vault.pin.example');

  const rawYamlObj = (YAML.parse(fs.readFileSync(tripPath, 'utf8')) ?? {}) as Record<
    string,
    unknown
  >;
  const rawRatesObj = YAML.parse(fs.readFileSync(ratesPath, 'utf8'));

  const hasLocalPrivate = fs.existsSync(privatePath);
  const rawPrivateObj = YAML.parse(
    fs.readFileSync(hasLocalPrivate ? privatePath : privateExamplePath, 'utf8')
  );

  const hasLocalPin = fs.existsSync(pinPath);
  const vaultPin = fs
    .readFileSync(hasLocalPin ? pinPath : pinExamplePath, 'utf8')
    .trim();

  const trip = TripDataSchema.parse(rawYamlObj);
  const rates = RatesSchema.parse(rawRatesObj);
  const privateRefs = PrivateRefsSchema.parse(rawPrivateObj);

  return {
    tripSlug,
    tripDir,
    rawYamlObj,
    trip,
    rates,
    privateRefs,
    usingExamplePrivateRefs: !hasLocalPrivate,
    vaultPin,
    usingExampleVaultPin: !hasLocalPin,
  };
}
