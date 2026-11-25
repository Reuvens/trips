import type { TripViewModel } from '../domain/deriveTrip.js';
import type { EncryptedVaultBundle } from '../domain/vaultCrypto.js';
import { html, rawHtml } from '../domain/format.js';
import { renderCompanionAppBody } from '../sites/renderCompanionApp.js';
import { renderEditorialMagazineBody } from '../sites/renderEditorialMagazine.js';

export type SiteVariant = 'app' | 'magazine';

export interface ClientAppPayload {
  variant: SiteVariant;
  cspSafe: boolean;
  initialRate: {
    eurIls: number;
    checkedIso: string;
    checkedDm: string;
    source: string;
  };
  peopleCount: number;
  partyMembersMeta: Array<{
    id: string;
    nameHe: string;
    roleHe: string;
    seatsStatusHe: string;
    passText: string;
    gearTierHe: string;
    scheduleFocusHe: string;
  }>;
  canonicalBudget: {
    totalEur: number;
    paidEur: number;
    transferPickEur: number;
    gearPlusSchoolSeparateEur: number;
  };
  mapPins: TripViewModel['villageMapPins'];
  openItemsMeta: Array<{
    id: string;
    titleHe: string;
    urgency: string;
    deadline?: string;
    deadlineDm?: string;
    targetAnchor: string;
  }>;
  timeline: TripViewModel['timeline'];
  vault: EncryptedVaultBundle;
  canonicalMarkdown: string;
}

export function buildClientAppPayload(
  vm: TripViewModel,
  canonicalMarkdown: string,
  vault: EncryptedVaultBundle,
  options: { variant?: SiteVariant; cspSafe?: boolean } = {}
): ClientAppPayload {
  return {
    variant: options.variant ?? 'app',
    cspSafe: Boolean(options.cspSafe),
    initialRate: {
      eurIls: vm.rates.eurIls,
      checkedIso: vm.rates.checkedIso,
      checkedDm: vm.rates.checkedDm,
      source: vm.rates.source,
    },
    peopleCount: vm.party.peopleCount,
    partyMembersMeta: vm.party.members.map((m) => ({
      id: m.id,
      nameHe: m.nameHe,
      roleHe: m.roleHe,
      seatsStatusHe: m.seatsStatusHe,
      passText: m.passText,
      gearTierHe: m.gearTierHe,
      scheduleFocusHe: m.scheduleFocusHe,
    })),
    canonicalBudget: {
      totalEur: vm.budget.totalEur,
      paidEur: vm.budget.paidEur,
      transferPickEur: vm.simulator.transferPrivateEur,
      gearPlusSchoolSeparateEur: vm.simulator.gearPlusSchoolSeparateEur,
    },
    mapPins: vm.villageMapPins,
    openItemsMeta: vm.openItems.map((i) => ({
      id: i.id,
      titleHe: i.titleHe,
      urgency: i.urgency,
      deadline: i.deadline,
      deadlineDm: i.deadlineDm,
      targetAnchor: i.targetAnchor,
    })),
    timeline: vm.timeline,
    vault,
    canonicalMarkdown,
  };
}

export function renderBodyContent(
  vm: TripViewModel,
  cssText: string,
  clientJsText: string,
  canonicalMarkdown: string,
  vault: EncryptedVaultBundle,
  options: {
    variant?: SiteVariant;
    forArtifactBodyOnly?: boolean;
    cspSafe?: boolean;
    siblingHref?: string;
  } = {}
): string {
  const variant: SiteVariant = options.variant ?? 'app';
  const payloadJson = JSON.stringify(
    buildClientAppPayload(vm, canonicalMarkdown, vault, {
      variant,
      cspSafe: Boolean(options.cspSafe),
    })
  ).replace(/</g, '\\u003c');

  const artifactHeadInBody = options.forArtifactBodyOnly
    ? html`
        <title>שבוע סקי בליביניו · ${vm.dates.windowHe}</title>
        ${rawHtml(
          '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700;900&family=Suez+One&family=Assistant:wght@400;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap">'
        )}
        <style>
${rawHtml(cssText)}
        </style>
      `
    : '';

  const siteMarkup =
    variant === 'magazine'
      ? renderEditorialMagazineBody(vm, { siblingAppHref: options.siblingHref })
      : renderCompanionAppBody(vm, { siblingMagazineHref: options.siblingHref });

  const body = html`
    ${artifactHeadInBody}
    <div class="rtl-root" dir="rtl" data-site-variant="${variant}">
      ${siteMarkup}
    </div>
    <script type="application/json" id="app-data">${rawHtml(payloadJson)}</script>
    <script>
${rawHtml(clientJsText)}
    </script>
  `;

  return body.toString().trim() + '\n';
}

export function renderStandaloneHtml(
  vm: TripViewModel,
  cssText: string,
  clientJsText: string,
  canonicalMarkdown: string,
  vault: EncryptedVaultBundle,
  options: {
    variant?: SiteVariant;
    enablePwa?: boolean;
    pwaRootPrefix?: string;
    omitExternalFontLink?: boolean;
    cspSafe?: boolean;
    siblingHref?: string;
  } = {}
): string {
  const variant: SiteVariant = options.variant ?? 'app';
  const bodyInner = renderBodyContent(vm, cssText, clientJsText, canonicalMarkdown, vault, {
    variant,
    forArtifactBodyOnly: false,
    cspSafe: Boolean(options.cspSafe),
    siblingHref: options.siblingHref,
  });

  const fontTag = options.omitExternalFontLink
    ? ''
    : '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700;900&family=Suez+One&family=Assistant:wght@400;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap">';

  const prefix = options.pwaRootPrefix ?? '.';
  const pwaHead = options.enablePwa
    ? `<link rel="manifest" href="${prefix}/manifest.webmanifest"><meta name="theme-color" content="${
        variant === 'magazine' ? '#14241f' : '#0F2338'
      }">`
    : '';

  const pwaScript = options.enablePwa
    ? `<script>if('serviceWorker' in navigator && location.protocol.startsWith('http')){window.addEventListener('load',function(){navigator.serviceWorker.register('${prefix}/sw.js').catch(function(){});});}</script>`
    : '';

  const titlePrefix =
    variant === 'magazine'
      ? 'מגזין שלג בליביניו · מהדורת משפחת סייג'
      : 'אפליקציית ליביניו ’27 · משפחת סייג';
  const pageTitle = html`<title>${titlePrefix} (${vm.dates.windowHe})</title>`.toString();
  const pageDesc = html`<meta name="description" content="תוכנית חופשת הסקי המשפחתית בליביניו (${vm.dates.windowHe}) — שער יורו חי, מזג אוויר ומצלמות, מפגשי צהריים, כספת הזמנות מוצפנת ואריזה">`.toString();

  return `<!doctype html>
<html lang="he" dir="rtl" style="direction:rtl;text-align:right">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${pageTitle}
  ${pageDesc}
  ${pwaHead}
  ${fontTag}
  <style>
${cssText}
  </style>
</head>
<body dir="rtl" data-site-variant="${variant}" style="direction:rtl;text-align:right;margin:0">
${bodyInner}
${pwaScript}
</body>
</html>
`;
}
