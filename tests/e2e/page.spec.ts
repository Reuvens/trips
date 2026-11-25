import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectData } from '../../src/data/loadTrip.js';
import { deriveTripViewModel } from '../../src/domain/deriveTrip.js';
import { generateCanonicalMarkdown } from '../../src/domain/markdownExport.js';
import { buildVaultCardsFromPrivateRefs, encryptVaultBundle } from '../../src/domain/vaultCrypto.js';
import { renderStandaloneHtml } from '../../src/components/renderPage.js';
import { compileClientScript, loadCombinedStyles } from '../../scripts/build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORTAL_URI = 'file://' + path.join(ROOT, 'dist', 'index.html');
const APP_URI = 'file://' + path.join(ROOT, 'dist', 'livigno-2027', 'plan-standalone.html');
const MAG_URI = 'file://' + path.join(ROOT, 'dist', 'livigno-2027', 'magazine-standalone.html');
const GATEWAY_URI = 'file://' + path.join(ROOT, 'dist', 'livigno-2027', 'index.html');
const APP_CSP_PATH = path.join(ROOT, 'dist', 'livigno-2027', 'plan-csp-safe.html');
const MAG_CSP_PATH = path.join(ROOT, 'dist', 'livigno-2027', 'magazine-csp-safe.html');

test.describe('Family Trips Multi-Trip Engine — Real Browser E2E Suite', () => {
  test('[Portal & Site 1 & Site 2 & Gateway] render RTL with zero JS errors, valid #anchors, and no raw tokens', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(PORTAL_URI);
    await expect(page.locator('[data-trip-card="livigno-2027"]')).toHaveCount(1);
    const portalDir = await page.evaluate(() => getComputedStyle(document.body).direction);
    expect(portalDir).toBe('rtl');

    await page.goto(GATEWAY_URI);
    await expect(page.locator('.hub-card')).toHaveCount(2);

    for (const uri of [APP_URI, MAG_URI]) {
      await page.goto(uri);
      const dir = await page.evaluate(() => getComputedStyle(document.body).direction);
      expect(dir).toBe('rtl');

      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).not.toContain('{{');
      expect(bodyText).not.toContain('<!--@');

      const brokenAnchors = await page.$$eval('a[href^="#"]', (els) =>
        els
          .map((a) => a.getAttribute('href')?.slice(1) ?? '')
          .filter((id) => id && id !== 'top' && !document.getElementById(id))
      );
      expect(brokenAnchors).toEqual([]);
    }
    expect(errors).toEqual([]);
  });

  test('[P4] zero horizontal overflow, compact min-content width, and strict right-alignment across 360px (Android), 390px, 768px, and 1280px on BOTH sites', async ({
    page,
  }) => {
    for (const uri of [APP_URI, MAG_URI]) {
      await page.goto(uri);
      for (const width of [360, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 840 });
        const layoutCheck = await page.evaluate(() => {
          const overflow =
            document.documentElement.scrollWidth - document.documentElement.clientWidth;
          const root = document.querySelector('.rtl-root') ?? document.body;
          const cs = getComputedStyle(root);
          const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
          return {
            overflow,
            dir: cs.direction,
            align: cs.textAlign,
            scrollX: window.scrollX,
            headerH,
          };
        });
        expect(layoutCheck.overflow, `Overflow on ${uri} at ${width}px`).toBeLessThanOrEqual(1);
        expect(layoutCheck.dir).toBe('rtl');
        expect(layoutCheck.align).toBe('right');
        expect(layoutCheck.scrollX).toBe(0);
        if (width <= 390) {
          expect(layoutCheck.headerH, `Sticky header too tall on ${uri}`).toBeLessThanOrEqual(62);
        }
      }

      // Verify min-content intrinsic width never exceeds mobile viewport (prevents Android iframe LTR cutoff!)
      await page.setViewportSize({ width: 360, height: 740 });
      const minContentW = await page.evaluate(() => {
        document.documentElement.style.width = 'min-content';
        const w = document.documentElement.scrollWidth;
        document.documentElement.style.width = '';
        return w;
      });
      expect(minContentW, `Intrinsic min-content width on ${uri}`).toBeLessThanOrEqual(361);
    }
  });

  test('[Site 1: Companion App] 5 bottom tabs, non-sticky dismissible Member Spotlight, cross-tab Trail Sign jump, Day Deck & Packing List', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 384, height: 740 });
    await page.goto(APP_URI);
    await expect(page.locator('[data-app-tab]')).toHaveCount(5);

    const headerBefore = await page.evaluate(
      () => document.querySelector('header')!.getBoundingClientRect().height
    );

    // Day-by-Day interactive deck switches panels cleanly
    await page.click('[data-day-tab="day-sun-fri-core"]');
    await expect(page.locator('[data-day-panel="day-sun-fri-core"]')).toBeVisible();
    await expect(page.locator('[data-day-panel="day-sun-fri-core"]')).toContainText('13:05');

    // Family Avatar Personalizer opens in NON-sticky flow, scrolls out of view, and closes via ✕ or toggle
    await page.click('#topAvatarStrip [data-member-filter="orit"]');
    await expect(page.locator('#memberSpotlight')).toBeVisible();
    await expect(page.locator('#memberSpotlight')).toContainText('אורית');

    const headerAfter = await page.evaluate(
      () => document.querySelector('header')!.getBoundingClientRect().height
    );
    expect(headerAfter).toBe(headerBefore);
    expect(headerAfter).toBeLessThanOrEqual(62);

    // Scrolling down moves #memberSpotlight completely off screen (NOT fixed/sticky!)
    await page.evaluate(() => window.scrollTo(0, 520));
    const spotlightBottomScrolled = await page.evaluate(
      () => document.getElementById('memberSpotlight')!.getBoundingClientRect().bottom
    );
    expect(spotlightBottomScrolled).toBeLessThan(0);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Clicking ✕ close button dismisses #memberSpotlight
    await page.click('[data-close-spotlight]');
    await expect(page.locator('#memberSpotlight')).toBeHidden();

    // Clicking Trail Sign #getting in Tab 1 automatically switches to Wallet Tab (Tab 3)!
    await page.click('#signs .sign[data-sign-id="transfer"]');
    await expect(page.locator('[data-app-pane="wallet"]')).toHaveClass(/is-active/);
    await expect(page.locator('#getting')).toBeVisible();

    // Switch to Village Tab (Tab 2) -> Interactive Valley Map & Culinary Filter
    await page.click('[data-app-tab="village"]');
    await expect(page.locator('svg.mountain .m-run')).toHaveCount(3);
    await expect(page.locator('.map-pin-group')).toHaveCount(8);
    await page.click('[data-pin-btn="campo23"]');
    await expect(page.locator('#mapPinTitle')).toContainText('Campo Scuola 23');

    await page.click('[data-spot-filter="dutyfree"]');
    await expect(page.locator('.spot-card:visible')).toHaveCount(1);

    // Switch to Prep Tab (Tab 4) -> Interactive Packing Checklist updates progress bar
    await page.click('[data-app-tab="prep"]');
    await page.check('[data-pack-input="pack-passports"]');
    await page.check('[data-pack-input="pack-italy-plug"]');
    await expect(page.locator('#packingProgressText')).toContainText('2 / 12 נארזו');
  });

  test('[Site 2: Editorial Magazine] full-bleed cover, 5 chapters, closed alternatives, and Search opening drawer', async ({
    page,
  }) => {
    await page.goto(MAG_URI);
    await expect(page.locator('.mag-cover')).toBeVisible();
    await expect(page.locator('.mag-chapter-header')).toHaveCount(5);
    await expect(page.locator('#lunch-meetups .meetup-card')).toHaveCount(4);

    const altOpen = await page.$eval('details#alternatives', (d) => (d as HTMLDetailsElement).open);
    expect(altOpen).toBe(false);

    // Search for "צרוויניה" opens closed #alternatives drawer
    await page.click('#searchBtn');
    await page.fill('#searchInput', 'צרוויניה');
    await expect(page.locator('.sres').first()).toBeVisible();
    await page.locator('.sres').first().click();
    const altNowOpen = await page.$eval(
      'details#alternatives',
      (d) => (d as HTMLDetailsElement).open
    );
    expect(altNowOpen).toBe(true);
  });

  test('auto-updates all ₪ amounts dynamically when live ECB Euro rate arrives & offline fallback has zero jump', async ({
    page,
  }) => {
    await page.route('https://api.frankfurter.dev/**', (r) => r.abort());
    await page.route('https://open.er-api.com/**', (r) => r.abort());
    await page.route('https://api.open-meteo.com/**', (r) => r.abort());

    await page.goto(MAG_URI);
    await page.click('#fxRateBtn');
    // Offline fallback matches exact SSR ₪35,071 with zero rounding jump
    await expect(page.locator('#budgetGrandIls')).toHaveText('₪35,071');

    // Now mock live ECB rate 4.00
    await page.unroute('https://api.frankfurter.dev/**');
    await page.route('https://api.frankfurter.dev/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          amount: 1.0,
          base: 'EUR',
          date: '2026-11-24',
          rates: { ILS: 4.0 },
        }),
      });
    });

    await page.click('#fxRateBtn');
    await expect(page.locator('#fxRateText')).toHaveText('€1 = ₪4.00');
    await expect(page.locator('#budgetGrandIls')).toHaveText('₪38,284');
  });

  test('[R2 & Simulator] currency/scope toggles and What-If Simulator stay 100% consistent', async ({
    page,
  }) => {
    await page.route('https://api.frankfurter.dev/**', (r) => r.abort());
    await page.route('https://open.er-api.com/**', (r) => r.abort());
    await page.route('https://api.open-meteo.com/**', (r) => r.abort());

    await page.goto(APP_URI);
    await page.click('[data-app-tab="budget"]');

    await page.click('[data-curr-btn="eur"]');
    const metaEurOnly = await page.locator('#budgetTotalMeta').innerText();
    expect(metaEurOnly).not.toContain('₪');
    expect(metaEurOnly).toContain('€1,914');

    await page.click('[data-curr-btn="ils"]');
    const metaIlsOnly = await page.locator('#budgetTotalMeta').innerText();
    expect(metaIlsOnly).not.toContain('€');
    expect(metaIlsOnly).toContain('₪7,014');

    await page.click('[data-curr-btn="both"]');
    await page.click('#scopeToggleBtn');
    await expect(page.locator('#budgetGrandEur')).toHaveText('€1,914');
    await expect(page.locator('#budgetGrandIls')).toHaveText('₪7,014');

    // Simulator savings check
    await page.selectOption('#simGearSchool', { index: 1 });
    await expect(page.locator('#simTotalEur')).toHaveText('€9,406');
    await page.click('#simResetBtn');
    await expect(page.locator('#simTotalEur')).toHaveText('€9,571');
  });

  test('[P7+] ticking a task in Prep Tab syncs Done Zone, Priority Strip, and Trail Sign in Today Tab', async ({
    page,
  }) => {
    await page.goto(APP_URI);
    await page.click('[data-app-tab="prep"]');

    await page.locator('.todo[data-item="transfer-book"] .dchk').click();
    await expect(page.locator('#donelist .todo[data-item="transfer-book"]')).toHaveCount(1);

    await page.click('[data-app-tab="today"]');
    await expect(page.locator('#openRemainingBadge')).toContainText('12');
    await expect(page.locator('#signs .sign[data-sign-id="transfer"]')).toHaveClass(/done/);
  });

  test('[Site 1 Hash Routing] initial #vault URL hash and hashchange automatically activate Wallet tab', async ({
    page,
  }) => {
    await page.goto(`${APP_URI}#vault`);
    await expect(page.locator('[data-app-pane="wallet"]')).toHaveClass(/is-active/);
    await expect(page.locator('#vault')).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#packing';
    });
    await expect(page.locator('[data-app-pane="prep"]')).toHaveClass(/is-active/);
    await expect(page.locator('#packing')).toBeVisible();
  });

  test('[Vault E2E] PBKDF2-HMAC-SHA256 Family Vault rejects wrong email/PIN, unlocks for authorized email + PIN, and wipes on Lock', async ({
    page,
  }) => {
    const bundle = loadProjectData(ROOT);
    const vm = deriveTripViewModel(bundle.trip, bundle.rates);
    const md = generateCanonicalMarkdown(vm);
    const css = loadCombinedStyles(ROOT);
    const js = compileClientScript(ROOT);
    const firstBookingKey = bundle.trip.flights.bookings[0]!.refKey;
    const firstNightPinKey = bundle.trip.firstNightBooked!.pinRefKey;
    const cards = buildVaultCardsFromPrivateRefs(bundle.trip, {
      ...bundle.privateRefs,
      [firstBookingKey]: 'E2E_VAULT_PNR_99X',
      [firstNightPinKey]: '8877',
      matmid: 'E2E_MATMID_555',
    });
    const vault = encryptVaultBundle({
      cards,
      allowedEmails: ['family.test@example.com'],
      pin: '7392',
      embedSlots: true,
      deterministicSeed: 'e2e-vault-seed',
    });
    const htmlWithVault = renderStandaloneHtml(vm, css, js, md, vault, {
      variant: 'magazine',
      omitExternalFontLink: true,
      cspSafe: true,
    });

    // Ensure zero plaintext secret or PIN in vault JSON or non-binary HTML!
    const htmlNoImages = htmlWithVault.replace(
      /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g,
      '[IMAGE]'
    );
    expect(htmlNoImages).not.toContain('E2E_VAULT_PNR_99X');
    expect(htmlNoImages).not.toContain('E2E_MATMID_555');
    expect(htmlNoImages).not.toContain('family.test@example.com');
    expect(JSON.stringify(vault)).not.toContain('7392');

    await page.setContent(htmlWithVault, { waitUntil: 'load' });

    // 1. Unauthorized Google email -> rejected
    await page.fill('#vaultEmailInput', 'intruder@example.com');
    await page.fill('#vaultPinInput', '7392');
    await page.click('#vaultUnlockSubmitBtn');
    await expect(page.locator('#vaultFeedbackMsg')).toContainText('גישה נדחתה');
    await expect(page.locator('#vaultUnlockedView')).toBeHidden();

    // 2. Authorized email + wrong PIN -> MAC failure
    await page.fill('#vaultEmailInput', 'family.test@example.com');
    await page.fill('#vaultPinInput', '9999');
    await page.click('#vaultUnlockSubmitBtn');
    await expect(page.locator('#vaultFeedbackMsg')).toContainText('קוד הכספת שגוי');
    await expect(page.locator('#vaultUnlockedView')).toBeHidden();

    // 3. Authorized email (case-insensitive) + synthetic PIN -> Cryptographically unlocked!
    await page.fill('#vaultEmailInput', 'FAMILY.TEST@EXAMPLE.COM');
    await page.fill('#vaultPinInput', '7392');
    await page.click('#vaultUnlockSubmitBtn');
    await expect(page.locator('#vaultUnlockedView')).toBeVisible();
    await expect(page.locator('#vaultUnlockedView')).toContainText('E2E_VAULT_PNR_99X');
    await expect(page.locator('#vaultUnlockedView')).toContainText('8877');
    await expect(page.locator('#vaultUnlockedView')).toContainText('E2E_MATMID_555');

    // 4. Lock button wipes secrets from DOM immediately
    await page.click('#vaultLockBtn');
    await expect(page.locator('#vaultUnlockedView')).toBeHidden();
    const wipedHtml = await page.locator('#vaultUnlockedView').innerHTML();
    expect(wipedHtml).toBe('');
  });

  test('[R3] BOTH CSP-safe bundles (App & Magazine) run with zero console errors or network requests under strict CSP', async ({
    page,
  }) => {
    const errors: string[] = [];
    const externalRequests: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('request', (req) => {
      if (req.url().startsWith('http')) externalRequests.push(req.url());
    });

    for (const cspFile of [APP_CSP_PATH, MAG_CSP_PATH]) {
      const rawHtml = fs.readFileSync(cspFile, 'utf8');
      const strictHtml = rawHtml.replace(
        '<meta charset="utf-8">',
        `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;">`
      );
      await page.setContent(strictHtml, { waitUntil: 'load' });
      await page.click('#fxRateBtn');
    }

    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('[R4 & R5] Keyboard accessibility, valid ARIA, Dark Mode & OS prefers-color-scheme:dark WCAG contrast on BOTH sites', async ({
    page,
  }) => {
    await page.goto(MAG_URI);

    const oritCard = page.locator('[data-member-card="orit"]');
    await oritCard.focus();
    await page.keyboard.press('Enter');
    await expect(oritCard).toHaveAttribute('aria-pressed', 'true');
    // Reset member filter back to all
    await page.keyboard.press('Enter');

    await page.click('#searchBtn');
    await expect(page.locator('#searchLayer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#searchLayer')).toBeHidden();
    const activeId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(activeId).toBe('searchBtn');

    // Verify ARIA correctness on role="tab" day-tabs (no aria-pressed!) and [data-todo-filter] (has aria-pressed)
    const ariaAudit = await page.evaluate(() => {
      const dayTabsWithPressed = Array.from(document.querySelectorAll('[role="tab"]')).filter((t) =>
        t.hasAttribute('aria-pressed')
      ).length;
      const todoFiltersMissingPressed = Array.from(
        document.querySelectorAll('[data-todo-filter]')
      ).filter((b) => !b.hasAttribute('aria-pressed')).length;
      return { dayTabsWithPressed, todoFiltersMissingPressed };
    });
    expect(ariaAudit.dayTabsWithPressed).toBe(0);
    expect(ariaAudit.todoFiltersMissingPressed).toBe(0);

    const contrastMeasureFn = () => {
      function parseRgba(str: string): [number, number, number, number] {
        const m = str.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0', '1'];
        return [Number(m[0]), Number(m[1]), Number(m[2]), m[3] !== undefined ? Number(m[3]) : 1];
      }
      function effectiveBg(el: Element | null): [number, number, number] {
        let cur: Element | null = el;
        while (cur) {
          const [r, g, b, a] = parseRgba(getComputedStyle(cur).backgroundColor);
          if (a >= 0.5) return [r, g, b];
          cur = cur.parentElement;
        }
        return [16, 23, 21];
      }
      function lum([r, g, b]: [number, number, number]): number {
        const chan = [r, g, b].map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * chan[0]! + 0.7152 * chan[1]! + 0.0722 * chan[2]!;
      }
      function textBgRatio(selector: string): number {
        const el = document.querySelector(selector);
        if (!el) return 21;
        const [r, g, b] = parseRgba(getComputedStyle(el).color);
        const l1 = lum([r, g, b]);
        const l2 = lum(effectiveBg(el));
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }
      const headerEl = document.querySelector('.app-shell-header, .mag-topbar');
      const dockEl = document.querySelector('.app-bottom-dock');
      const headerAlpha = headerEl ? parseRgba(getComputedStyle(headerEl).backgroundColor)[3] : 1;
      const dockAlpha = dockEl ? parseRgba(getComputedStyle(dockEl).backgroundColor)[3] : 1;

      return {
        weatherMetric: textBgRatio('.wh-metric b'),
        inactiveDayTab: textBgRatio('.day-tab:not(.is-active) b'),
        activeDayTab: textBgRatio('.day-tab.is-active b'),
        activeAvatar: textBgRatio('.avatar-pill.is-active'),
        dayTrack: textBgRatio('.dp-track p'),
        meetupHead: textBgRatio('.meetup-card h4'),
        packItem: textBgRatio('.pack-item b'),
        vaultInput: textBgRatio('.vf-field input'),
        activePin: textBgRatio('.pin-pill.is-selected'),
        headerAlpha,
        dockAlpha,
      };
    };

    // Check BOTH explicit data-theme="dark" AND OS prefers-color-scheme: dark (without data-theme) on BOTH sites!
    for (const uri of [APP_URI, MAG_URI]) {
      // Mode A: OS prefers-color-scheme: dark (first visit, no data-theme attribute)
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(uri);
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
      const osDark = await page.evaluate(contrastMeasureFn);
      for (const [k, v] of Object.entries(osDark)) {
        if (k === 'headerAlpha' || k === 'dockAlpha') {
          expect(v, `Opaque chrome ${k} in OS dark on ${uri}`).toBeGreaterThanOrEqual(0.85);
        } else {
          expect(v, `WCAG contrast ${k} in OS dark on ${uri}`).toBeGreaterThanOrEqual(4.5);
        }
      }

      // Mode B: Explicit data-theme="dark" under light OS media
      await page.emulateMedia({ colorScheme: 'light' });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      const explicitDark = await page.evaluate(contrastMeasureFn);
      for (const [k, v] of Object.entries(explicitDark)) {
        if (k === 'headerAlpha' || k === 'dockAlpha') {
          expect(v, `Opaque chrome ${k} in explicit dark on ${uri}`).toBeGreaterThanOrEqual(0.85);
        } else {
          expect(v, `WCAG contrast ${k} in explicit dark on ${uri}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
