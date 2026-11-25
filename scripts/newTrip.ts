#!/usr/bin/env tsx
/**
 * Scaffolds a new isolated trip folder under `trips/<slug>/` (`npm run new-trip <slug>`).
 * Keeps the shared engine (`src/`) untouched so every trip uses the exact same brain.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_TRIP_SLUG, PROJECT_ROOT } from '../src/data/loadTrip.js';

function main(): void {
  const rawSlug = process.argv[2]?.trim().toLowerCase();
  if (!rawSlug || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(rawSlug)) {
    console.error('Usage: npm run new-trip <slug>   (e.g. npm run new-trip japan-2028)');
    process.exit(1);
  }

  const targetDir = path.join(PROJECT_ROOT, 'trips', rawSlug);
  if (fs.existsSync(targetDir)) {
    console.error(`Trip folder already exists: trips/${rawSlug}`);
    process.exit(1);
  }

  const refDir = path.join(PROJECT_ROOT, 'trips', DEFAULT_TRIP_SLUG);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(path.join(refDir, 'trip.yaml'), path.join(targetDir, 'trip.yaml'));
  fs.copyFileSync(
    path.join(refDir, 'private.example.yaml'),
    path.join(targetDir, 'private.example.yaml')
  );
  fs.copyFileSync(
    path.join(refDir, 'vault.pin.example'),
    path.join(targetDir, 'vault.pin.example')
  );

  console.log(`✓ Created new trip data folder: trips/${rawSlug}/`);
  console.log(`  1. Edit trips/${rawSlug}/trip.yaml with your new destination, dates & party`);
  console.log(`  2. Copy private.example.yaml -> private.yaml and vault.pin.example -> vault.pin (git-ignored!)`);
  console.log(`  3. Run 'npm run build && npm run check' — your new trip will automatically appear on the Family Trips Portal!`);
}

main();
