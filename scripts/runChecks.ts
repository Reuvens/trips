#!/usr/bin/env tsx
/**
 * Multi-Trip Policy & Invariants Runner (`npm run check` / `npm run check:coverage`).
 * Verifies all 28 checks across EVERY trip in `trips/<slug>/` (both Site 1 & Site 2),
 * scans tracked source/tests/trip files for zero secret/PIN leaks, and verifies [S10] dist freshness.
 */
import fs from 'node:fs';
import path from 'node:path';
import { discoverTripSlugs, loadProjectData, PROJECT_ROOT } from '../src/data/loadTrip.js';
import { deriveTripViewModel } from '../src/domain/deriveTrip.js';
import { generateCanonicalMarkdown } from '../src/domain/markdownExport.js';
import { runAllPolicyChecks, type CheckResult } from '../src/validation/policyChecks.js';
import { buildAllArtifacts, buildEntireMultiTripDist } from './build.js';

function collectTrackedFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTrackedFiles(full));
    } else if (
      entry.name === 'private.yaml' ||
      entry.name === 'vault.pin' ||
      entry.name === 'drive-vault.encrypted.json'
    ) {
      // Git-ignored local vault files
      continue;
    } else if (/\.(ts|js|css|yml|yaml|json|md)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  const showCoverage = process.argv.includes('--coverage');
  const slugs = discoverTripSlugs(PROJECT_ROOT);
  const distDir = path.join(PROJECT_ROOT, 'dist');

  const trackedDirs = ['src', 'tests', 'scripts', '.github', 'trips', 'data'].map((d) =>
    path.join(PROJECT_ROOT, d)
  );
  const trackedFiles = [
    ...trackedDirs.flatMap(collectTrackedFiles),
    path.join(PROJECT_ROOT, 'README.md'),
    path.join(PROJECT_ROOT, 'package.json'),
  ].filter((f) => fs.existsSync(f));

  let aggregatedResults: CheckResult[] = [];

  for (const slug of slugs) {
    const bundle = loadProjectData(PROJECT_ROOT, slug);
    const vm = deriveTripViewModel(bundle.trip, bundle.rates);
    const md = generateCanonicalMarkdown(vm);
    const built = buildAllArtifacts(PROJECT_ROOT, { tripSlug: slug, embedEncryptedVault: false });

    const distApp = path.join(distDir, slug, 'plan-standalone.html');
    const distMag = path.join(distDir, slug, 'magazine-standalone.html');

    const appHtml = fs.existsSync(distApp) ? fs.readFileSync(distApp, 'utf8') : built.standaloneHtml;
    const magHtml = fs.existsSync(distMag)
      ? fs.readFileSync(distMag, 'utf8')
      : built.magazineStandaloneHtml;

    const appResults = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: bundle.trip,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vaultPin: bundle.usingExampleVaultPin ? undefined : bundle.vaultPin,
      vm,
      renderedHtml: appHtml,
      markdownExport: md,
    });

    const magResults = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: bundle.trip,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vaultPin: bundle.usingExampleVaultPin ? undefined : bundle.vaultPin,
      vm,
      renderedHtml: magHtml,
      markdownExport: md,
    });

    const mergedForTrip = appResults.map((r, i) => {
      const m = magResults[i]!;
      if (r.severity === 'RED' || m.severity === 'RED') {
        const chosen = r.severity === 'RED' ? r : m;
        return { ...chosen, message: `[${slug}] ${chosen.message}` };
      }
      if (r.severity === 'AMBER' || m.severity === 'AMBER') {
        const chosen = r.severity === 'AMBER' ? r : m;
        return { ...chosen, message: `[${slug}] ${chosen.message}` };
      }
      return { ...r, message: `[${slug}] ${r.message}` };
    });

    // Scan tracked files for accidental secret/PIN leaks for this trip
    const sourceLeaks: string[] = [];
    for (const filePath of trackedFiles) {
      const rel = path.relative(PROJECT_ROOT, filePath);
      const rawContent = fs
        .readFileSync(filePath, 'utf8')
        .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, '[IMAGE_STRIPPED]');
      if (!bundle.usingExamplePrivateRefs) {
        for (const [key, rawVal] of Object.entries(bundle.privateRefs)) {
          const vals = Array.isArray(rawVal) ? rawVal : [rawVal];
          for (const v of vals) {
            const escaped = String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const boundedRe = new RegExp(`(?<![0-9A-Za-z])${escaped}(?![0-9A-Za-z])`, 'i');
            if (boundedRe.test(rawContent)) {
              sourceLeaks.push(`${rel}:${key}`);
            }
          }
        }
      }
      if (!bundle.usingExampleVaultPin && bundle.vaultPin.length >= 4) {
        const pinEsc = bundle.vaultPin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pinRe = new RegExp(`(?<![0-9A-Za-z])${pinEsc}(?![0-9A-Za-z])`);
        if (pinRe.test(rawContent)) {
          sourceLeaks.push(`${rel}:vault.pin`);
        }
      }
    }

    if (sourceLeaks.length > 0) {
      const s1Idx = mergedForTrip.findIndex((r) => r.code === 'S1');
      const leakResult: CheckResult = {
        code: 'S1',
        description: 'אפס דליפת מזהי הזמנות, קודי PIN, אימיילים פרטיים או קוד הכספת לקבצים עוקבים או ל-dist',
        severity: 'RED',
        message: `[${slug}] נמצאו ערכים סודיים בקבצים עוקבים: ${[...new Set(sourceLeaks)].join(', ')}`,
      };
      if (s1Idx >= 0) mergedForTrip[s1Idx] = leakResult;
      else mergedForTrip.unshift(leakResult);
    }

    if (aggregatedResults.length === 0) {
      aggregatedResults = mergedForTrip;
    } else {
      aggregatedResults = aggregatedResults.map((prev, idx) => {
        const cur = mergedForTrip[idx]!;
        if (prev.severity === 'RED' || cur.severity === 'RED') {
          return prev.severity === 'RED' ? prev : cur;
        }
        if (prev.severity === 'AMBER' || cur.severity === 'AMBER') {
          return prev.severity === 'AMBER' ? prev : cur;
        }
        return prev;
      });
    }
  }

  // S10 — Multi-Trip Dist Build Freshness Check (Root Portal + all trips)
  const expectedFiles = buildEntireMultiTripDist(PROJECT_ROOT);
  const staleFiles = expectedFiles
    .filter(([relPath, exp]) => {
      const p = path.join(distDir, relPath);
      return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== exp;
    })
    .map(([relPath]) => relPath);

  aggregatedResults.push(
    staleFiles.length > 0
      ? {
          code: 'S10',
          description: 'כל קבצי התוצר ב-dist/ (פורטל ראשי + כל הטיולים) עדכניים byte-for-byte',
          severity: 'RED',
          message: `קבצי dist לא עדכניים (הרץ npm run build): ${staleFiles.join(', ')}`,
        }
      : {
          code: 'S10',
          description: 'כל קבצי התוצר ב-dist/ (פורטל ראשי + כל הטיולים) עדכניים byte-for-byte',
          severity: 'OK',
          message: `כל ${expectedFiles.length} קבצי dist/ (${slugs.length} טיולים + פורטל ראשי) עדכניים זהים לבנייה טרייה`,
        }
  );

  if (showCoverage) {
    console.log('═══ רשימת ההבטחות והבדיקות האוטומטיות למנוע הטיולים (Generated Coverage) ═══');
    for (const r of aggregatedResults) {
      console.log(`  [${r.code}] ${r.description}`);
    }
    return;
  }

  let redCount = 0;
  let amberCount = 0;
  for (const r of aggregatedResults) {
    if (r.severity === 'RED') {
      redCount++;
      console.log(`🔴 [${r.code}] ${r.description}\n   ↳ ${r.message}`);
    } else if (r.severity === 'AMBER') {
      amberCount++;
      console.log(`🟠 [${r.code}] ${r.description}\n   ↳ ${r.message}`);
    } else {
      console.log(`✓  [${r.code}] ${r.message}`);
    }
  }

  console.log(
    `\nסיכום בדיקות מדיניות (${slugs.join(', ')}): ${aggregatedResults.length} בדיקות רצו · ${redCount} שגיאות עוצרות (🔴) · ${amberCount} אזהרות לידיעה (🟠).`
  );
  if (redCount > 0) {
    process.exit(1);
  }
}

main();
