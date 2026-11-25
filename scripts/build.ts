#!/usr/bin/env tsx
/**
 * Deterministic Multi-Trip Build Pipeline (`npm run build` / `npm run build:check`).
 * Uses ONE shared brain (`src/`) + shared daily rates (`data/rates.yaml`) to build:
 *   - Root Family Trips Portal (`dist/index.html`) listing all trips in `trips/<slug>/`
 *   - For EVERY trip `<slug>` in `trips/<slug>/`:
 *       - `dist/<slug>/index.html` (Trip Gateway)
 *       - `dist/<slug>/app/index.html`, `dist/<slug>/plan-standalone.html`, `dist/<slug>/plan-csp-safe.html` (Site 1: Companion App)
 *       - `dist/<slug>/magazine/index.html`, `dist/<slug>/magazine-standalone.html`, `dist/<slug>/magazine-csp-safe.html` (Site 2: Editorial Magazine)
 *       - `dist/<slug>/plan-artifact.html`, `dist/<slug>/plan.md`, `dist/<slug>/manifest.webmanifest`, `dist/<slug>/sw.js`
 *
 * Security guarantee:
 *   - Public `dist/` files NEVER contain any secret from `trips/<slug>/private.yaml` or `vault.pin`.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  DEFAULT_TRIP_SLUG,
  discoverTripSlugs,
  loadProjectData,
  PROJECT_ROOT,
} from '../src/data/loadTrip.js';
import { deriveTripViewModel } from '../src/domain/deriveTrip.js';
import { generateCanonicalMarkdown } from '../src/domain/markdownExport.js';
import {
  buildVaultCardsFromPrivateRefs,
  encryptVaultBundle,
} from '../src/domain/vaultCrypto.js';
import { renderBodyContent, renderStandaloneHtml } from '../src/components/renderPage.js';
import { renderGatewayHubHtml } from '../src/sites/renderGatewayHub.js';
import { renderTripsPortalHtml, type PortalTripEntry } from '../src/sites/renderTripsPortal.js';
import { runAllPolicyChecks } from '../src/validation/policyChecks.js';

export interface BuiltArtifacts {
  gatewayHtml: string;
  appIndexHtml: string;
  magazineIndexHtml: string;
  standaloneHtml: string;
  magazineStandaloneHtml: string;
  artifactHtml: string;
  cspSafeHtml: string;
  magazineCspSafeHtml: string;
  markdown: string;
  manifestJson: string;
  swJs: string;
}

export function compileClientScript(rootDir = PROJECT_ROOT): string {
  const clientPath = path.join(rootDir, 'src', 'client', 'app.ts');
  const source = fs.readFileSync(clientPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      strict: true,
      removeComments: true,
    },
    fileName: 'app.ts',
  });
  return transpiled.outputText;
}

export function loadCombinedStyles(rootDir = PROJECT_ROOT): string {
  const mainCss = fs.readFileSync(path.join(rootDir, 'src', 'styles', 'main.css'), 'utf8');
  const upgradesCss = fs.readFileSync(path.join(rootDir, 'src', 'styles', 'upgrades.css'), 'utf8');
  return `${mainCss}\n${upgradesCss}`;
}

export function buildAllArtifacts(
  rootDir = PROJECT_ROOT,
  options: {
    tripSlug?: string;
    embedEncryptedVault?: boolean;
    standaloneAppSiblingHref?: string;
    standaloneMagSiblingHref?: string;
    omitExternalFonts?: boolean;
  } = {}
): BuiltArtifacts {
  const slug = options.tripSlug ?? DEFAULT_TRIP_SLUG;
  const bundle = loadProjectData(rootDir, slug);
  const vm = deriveTripViewModel(bundle.trip, bundle.rates);
  const markdown = generateCanonicalMarkdown(vm);
  const cssText = loadCombinedStyles(rootDir);
  const clientJsText = compileClientScript(rootDir);

  const vaultCards = buildVaultCardsFromPrivateRefs(bundle.trip, bundle.privateRefs);
  const vaultBundle = encryptVaultBundle({
    cards: vaultCards,
    allowedEmails: vm.vaultAuth.allowedEmails,
    pin: bundle.vaultPin,
    googleClientId: vm.vaultAuth.googleClientId,
    driveVaultFileId: vm.vaultAuth.driveVaultFileId,
    embedSlots: Boolean(options.embedEncryptedVault),
    deterministicSeed: options.embedEncryptedVault ? `${slug}-vault-v3` : undefined,
  });

  const gatewayHtml = renderGatewayHubHtml(vm);

  const appIndexHtml = renderStandaloneHtml(vm, cssText, clientJsText, markdown, vaultBundle, {
    variant: 'app',
    enablePwa: true,
    pwaRootPrefix: '..',
    omitExternalFontLink: false,
    siblingHref: '../magazine/index.html',
  });

  const magazineIndexHtml = renderStandaloneHtml(vm, cssText, clientJsText, markdown, vaultBundle, {
    variant: 'magazine',
    enablePwa: true,
    pwaRootPrefix: '..',
    omitExternalFontLink: false,
    siblingHref: '../app/index.html',
  });

  const standaloneHtml = renderStandaloneHtml(vm, cssText, clientJsText, markdown, vaultBundle, {
    variant: 'app',
    enablePwa: false,
    omitExternalFontLink: Boolean(options.omitExternalFonts),
    siblingHref: options.standaloneAppSiblingHref ?? './magazine-standalone.html',
  });

  const magazineStandaloneHtml = renderStandaloneHtml(
    vm,
    cssText,
    clientJsText,
    markdown,
    vaultBundle,
    {
      variant: 'magazine',
      enablePwa: false,
      omitExternalFontLink: Boolean(options.omitExternalFonts),
      siblingHref: options.standaloneMagSiblingHref ?? './plan-standalone.html',
    }
  );

  const cspSafeHtml = renderStandaloneHtml(vm, cssText, clientJsText, markdown, vaultBundle, {
    variant: 'app',
    enablePwa: false,
    omitExternalFontLink: true,
    cspSafe: true,
    siblingHref: '#top',
  });

  const magazineCspSafeHtml = renderStandaloneHtml(
    vm,
    cssText,
    clientJsText,
    markdown,
    vaultBundle,
    {
      variant: 'magazine',
      enablePwa: false,
      omitExternalFontLink: true,
      cspSafe: true,
      siblingHref: '#top',
    }
  );

  const artifactHtml = renderBodyContent(vm, cssText, clientJsText, markdown, vaultBundle, {
    variant: 'app',
    forArtifactBodyOnly: true,
    cspSafe: false,
    siblingHref: '#top',
  });

  // Verify ALL RED policy checks on BOTH Site 1 and Site 2 before emitting!
  for (const [label, htmlDoc] of [
    [`${slug} Site 1 (Companion App)`, standaloneHtml],
    [`${slug} Site 2 (Editorial Magazine)`, magazineStandaloneHtml],
  ] as const) {
    const results = runAllPolicyChecks({
      rawYamlObj: bundle.rawYamlObj,
      trip: bundle.trip,
      rates: bundle.rates,
      privateRefs: bundle.privateRefs,
      vaultPin: bundle.usingExampleVaultPin ? undefined : bundle.vaultPin,
      vm,
      renderedHtml: htmlDoc,
      markdownExport: markdown,
    });

    const redFailures = results.filter((r) => r.severity === 'RED');
    if (redFailures.length > 0) {
      console.error(`\n[build] BLOCKED BY RED POLICY FAILURES in ${label}:`);
      for (const f of redFailures) {
        console.error(`  🔴 [${f.code}] ${f.description}\n     -> ${f.message}`);
      }
      process.exit(1);
    }
  }

  const manifestJson = JSON.stringify(
    {
      name: `${vm.decided.nameHe} · ${vm.dates.windowHe}`,
      short_name: vm.decided.nameHe,
      description: 'אפליקציית החופשה והמגזין של משפחת סייג — עובד גם אופליין',
      lang: 'he',
      dir: 'rtl',
      start_url: './app/index.html',
      display: 'standalone',
      background_color: '#F3F6FA',
      theme_color: '#0F2338',
    },
    null,
    2
  );

  const swJs = `const CACHE = 'family-trips-${slug}-v3';
const ASSETS = ['./', './index.html', './app/index.html', './magazine/index.html', './manifest.webmanifest'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./app/index.html')))
  );
});
`;

  return {
    gatewayHtml,
    appIndexHtml,
    magazineIndexHtml,
    standaloneHtml,
    magazineStandaloneHtml,
    artifactHtml,
    cspSafeHtml,
    magazineCspSafeHtml,
    markdown,
    manifestJson,
    swJs,
  };
}

export function getExpectedTripEntries(slug: string, built: BuiltArtifacts): Array<[string, string]> {
  return [
    [`${slug}/index.html`, built.gatewayHtml],
    [`${slug}/app/index.html`, built.appIndexHtml],
    [`${slug}/magazine/index.html`, built.magazineIndexHtml],
    [`${slug}/plan-standalone.html`, built.standaloneHtml],
    [`${slug}/magazine-standalone.html`, built.magazineStandaloneHtml],
    [`${slug}/plan-artifact.html`, built.artifactHtml],
    [`${slug}/plan-csp-safe.html`, built.cspSafeHtml],
    [`${slug}/magazine-csp-safe.html`, built.magazineCspSafeHtml],
    [`${slug}/plan.md`, built.markdown],
    [`${slug}/manifest.webmanifest`, built.manifestJson],
    [`${slug}/sw.js`, built.swJs],
  ];
}

export function buildEntireMultiTripDist(rootDir = PROJECT_ROOT): Array<[string, string]> {
  const slugs = discoverTripSlugs(rootDir);
  const portalEntries: PortalTripEntry[] = [];
  const files: Array<[string, string]> = [];

  for (const slug of slugs) {
    const bundle = loadProjectData(rootDir, slug);
    const vm = deriveTripViewModel(bundle.trip, bundle.rates);
    portalEntries.push({ slug, vm });

    const built = buildAllArtifacts(rootDir, { tripSlug: slug, embedEncryptedVault: false });
    files.push(...getExpectedTripEntries(slug, built));
  }

  const portalHtml = renderTripsPortalHtml(portalEntries);
  return [['index.html', portalHtml], ...files];
}

function main(): void {
  const isCheckOnly = process.argv.includes('--check');
  const emitPrivateIdx = process.argv.indexOf('--emit-private-artifacts');
  const privateOutDir = emitPrivateIdx >= 0 ? process.argv[emitPrivateIdx + 1] : undefined;
  const tripArgIdx = process.argv.indexOf('--trip');
  const targetSlug = tripArgIdx >= 0 ? (process.argv[tripArgIdx + 1] ?? DEFAULT_TRIP_SLUG) : DEFAULT_TRIP_SLUG;

  const distDir = path.join(PROJECT_ROOT, 'dist');
  const filesToEmit = buildEntireMultiTripDist(PROJECT_ROOT);

  if (isCheckOnly) {
    const stale: string[] = [];
    for (const [relPath, expected] of filesToEmit) {
      const target = path.join(distDir, relPath);
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== expected) {
        stale.push(relPath);
      }
    }
    if (stale.length > 0) {
      console.error(`[build:check] 🔴 Stale or missing dist files: ${stale.join(', ')}`);
      process.exit(1);
    }
    console.log(`[build:check] ✓ All ${filesToEmit.length} multi-trip dist artifacts match fresh build byte-for-byte.`);
    return;
  }

  for (const [relPath, content] of filesToEmit) {
    const fullPath = path.join(distDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }

  // Write git-ignored encrypted Drive vault file locally per trip when real private.yaml exists
  for (const slug of discoverTripSlugs(PROJECT_ROOT)) {
    const bundle = loadProjectData(PROJECT_ROOT, slug);
    if (!bundle.usingExamplePrivateRefs && !bundle.usingExampleVaultPin) {
      const vm = deriveTripViewModel(bundle.trip, bundle.rates);
      const cards = buildVaultCardsFromPrivateRefs(bundle.trip, bundle.privateRefs);
      const encryptedDriveJson = encryptVaultBundle({
        cards,
        allowedEmails: vm.vaultAuth.allowedEmails,
        pin: bundle.vaultPin,
        googleClientId: vm.vaultAuth.googleClientId,
        driveVaultFileId: vm.vaultAuth.driveVaultFileId,
        embedSlots: true,
      });
      fs.writeFileSync(
        path.join(bundle.tripDir, 'drive-vault.encrypted.json'),
        JSON.stringify(encryptedDriveJson, null, 2),
        'utf8'
      );
    }
  }

  if (privateOutDir) {
    const privBuilt = buildAllArtifacts(PROJECT_ROOT, {
      tripSlug: targetSlug,
      embedEncryptedVault: true,
      standaloneAppSiblingHref: './livigno_editorial_magazine.html',
      standaloneMagSiblingHref: './livigno_companion_app.html',
      omitExternalFonts: true,
    });
    fs.mkdirSync(privateOutDir, { recursive: true });
    fs.writeFileSync(
      path.join(privateOutDir, 'livigno_companion_app.html'),
      privBuilt.standaloneHtml,
      'utf8'
    );
    fs.writeFileSync(
      path.join(privateOutDir, 'livigno_editorial_magazine.html'),
      privBuilt.magazineStandaloneHtml,
      'utf8'
    );
    console.log(
      `[build] ✓ Emitted encrypted-vault private previews for ${targetSlug} to ${privateOutDir} (0 plaintext leaks).`
    );
  }

  console.log(
    `[build] ✓ Built ${filesToEmit.length} public-safe artifacts in dist/ (Root Portal + ${discoverTripSlugs(PROJECT_ROOT).join(', ')}).`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
