/**
 * Self-contained Client Controller for Livigno Ski 2027.
 * Transpiled into clean, zero-dependency browser JS at build time.
 */

interface VaultField {
  labelHe: string;
  value: string;
  copyable?: boolean;
}

interface VaultCard {
  id: string;
  categoryHe: string;
  titleHe: string;
  subtitleHe: string;
  fields: VaultField[];
}

interface EncryptedVaultBundle {
  version: 1;
  mode: 'embedded-encrypted' | 'google-drive-only';
  kdf: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  allowedEmailHashes: string[];
  maskedEmails: string[];
  googleClientId: string;
  driveVaultFileId: string;
  slots: Array<{
    emailHashHex: string;
    maskedEmail: string;
    saltB64: string;
    ivB64: string;
    ciphertextB64: string;
    macB64: string;
  }>;
}

interface ClientPayload {
  variant?: 'app' | 'magazine';
  cspSafe?: boolean;
  initialRate: {
    eurIls: number;
    checkedIso: string;
    checkedDm: string;
    source: string;
  };
  peopleCount: number;
  partyMembersMeta?: Array<{
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
  mapPins: Array<{
    id: string;
    labelHe: string;
    labelEn: string;
    walkFromCalandaHe: string;
    forWho: string[];
    forWhoNamesHe: string;
    summaryHe: string;
    mapUrl: string;
  }>;
  openItemsMeta: Array<{
    id: string;
    titleHe: string;
    urgency: string;
    deadline?: string;
    deadlineDm?: string;
    targetAnchor: string;
  }>;
  timeline: {
    events: Array<{
      id: string;
      dayIndex: number;
      dateIso: string;
      kind: string;
      titleHe: string;
      subHe: string;
      tz: string;
      endTz?: string;
      startMs: number;
      endMs: number;
      fromMs: number;
      hotMs: number;
      untilMs: number;
      approx: boolean;
      whereHe?: string;
      mapUrl?: string;
      facts: Array<[string, string]>;
      notesHe: string[];
      links: Array<[string, string]>;
      forWho: string[];
    }>;
    days: Array<{
      n: number;
      dateIso: string;
      labelHe: string;
      titleHe: string;
      tz: string;
    }>;
    tzLabelsHe: Record<string, string>;
  };
  vault?: EncryptedVaultBundle;
  canonicalMarkdown: string;
}

(function initLivignoApp() {
  const dataEl = document.getElementById('app-data');
  if (!dataEl || !dataEl.textContent) return;

  let APP: ClientPayload;
  try {
    APP = JSON.parse(dataEl.textContent) as ClientPayload;
  } catch {
    return;
  }

  let currentEurIls = APP.initialRate.eurIls;
  let currentScope: 'family' | 'person' = 'family';
  let currentCurrencyMode: 'both' | 'eur' | 'ils' = 'both';
  let simulatedNowMs: number | null = null;

  function escHtml(s: string): string {
    return String(s ?? '').replace(/[&<>"]/g, (c) => {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c] ?? c;
    });
  }

  function fmtEur(n: number): string {
    return '€' + Math.round(n).toLocaleString('en-US');
  }

  function fmtIls(n: number): string {
    return '₪' + Math.round(n).toLocaleString('en-US');
  }

  function dmFromIso(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    return `${Number(m[3])}.${Number(m[2])}`;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 1. AUTOMATIC LIVE EURO EXCHANGE RATE (ECB Primary + Fallback + Cache)
  // ═════════════════════════════════════════════════════════════════════════
  const FX_CACHE_KEY = 'livigno27-fx-v2';
  const FX_TTL_MS = 6 * 3600 * 1000;

  function applyEurRateToDom(rate: number, dateStr: string, isLive: boolean): void {
    currentEurIls = rate;
    const rateText = document.getElementById('fxRateText');
    const statusLabel = document.getElementById('fxStatusLabel');
    const fxDot = document.getElementById('fxDot');

    if (rateText) rateText.textContent = `€1 = ₪${rate.toFixed(2)}`;
    if (statusLabel) {
      statusLabel.textContent = isLive ? `(חי · ${dmFromIso(dateStr)})` : `(${dmFromIso(dateStr)})`;
    }
    if (fxDot) {
      fxDot.classList.toggle('is-fallback', !isLive);
    }

    document.querySelectorAll<HTMLElement>('[data-eur]').forEach((el) => {
      const eurVal = Number(el.getAttribute('data-eur'));
      if (!Number.isFinite(eurVal)) return;
      if (el.id === 'simTotalIls') {
        el.textContent = `(${fmtIls(eurVal * rate)})`;
      } else {
        el.textContent = fmtIls(eurVal * rate);
      }
    });

    refreshTariffBoardDisplay();
    refreshSimulator();
  }

  async function fetchLiveEuroRate(force = false): Promise<void> {
    if (APP.cspSafe) {
      applyEurRateToDom(APP.initialRate.eurIls, APP.initialRate.checkedIso, false);
      return;
    }

    if (!force) {
      try {
        const rawCache = localStorage.getItem(FX_CACHE_KEY);
        if (rawCache) {
          const cached = JSON.parse(rawCache) as { rate: number; date: string; ts: number };
          if (
            typeof cached.rate === 'number' &&
            cached.rate > 1 &&
            Date.now() - cached.ts < FX_TTL_MS
          ) {
            applyEurRateToDom(cached.rate, cached.date, true);
            return;
          }
        }
      } catch {
        // Ignore storage restrictions
      }
    }

    const fetchTimeout = async (url: string): Promise<Response> => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), 4500);
      try {
        return await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      } finally {
        clearTimeout(id);
      }
    };

    try {
      const res = await fetchTimeout('https://api.frankfurter.dev/v1/latest?from=EUR&to=ILS');
      if (res.ok) {
        const data = (await res.json()) as { date?: string; rates?: { ILS?: number } };
        const ils = data.rates?.ILS;
        if (typeof ils === 'number' && ils > 1) {
          const date = data.date ?? new Date().toISOString().slice(0, 10);
          try {
            localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ rate: ils, date, ts: Date.now() }));
          } catch {}
          applyEurRateToDom(ils, date, true);
          return;
        }
      }
    } catch {
      // Try secondary fallback silently
    }

    try {
      const res2 = await fetchTimeout('https://open.er-api.com/v6/latest/EUR');
      if (res2.ok) {
        const data2 = (await res2.json()) as { rates?: { ILS?: number } };
        const ils2 = data2.rates?.ILS;
        if (typeof ils2 === 'number' && ils2 > 1) {
          const today = new Date().toISOString().slice(0, 10);
          try {
            localStorage.setItem(
              FX_CACHE_KEY,
              JSON.stringify({ rate: ils2, date: today, ts: Date.now() })
            );
          } catch {}
          applyEurRateToDom(ils2, today, true);
          return;
        }
      }
    } catch {
      // Offline or strict CSP iframe — keep verified build-time rate cleanly
    }

    applyEurRateToDom(APP.initialRate.eurIls, APP.initialRate.checkedIso, false);
  }

  const fxBtn = document.getElementById('fxRateBtn');
  if (fxBtn) {
    fxBtn.addEventListener('click', () => {
      if (APP.cspSafe) {
        applyEurRateToDom(APP.initialRate.eurIls, APP.initialRate.checkedIso, false);
        return;
      }
      const statusLabel = document.getElementById('fxStatusLabel');
      if (statusLabel) statusLabel.textContent = '(מרענן…)';
      void fetchLiveEuroRate(true);
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. THEME TOGGLE (Light / Dark) & PRINT BUTTON
  // ═════════════════════════════════════════════════════════════════════════
  const THEME_KEY = 'livigno27-theme';
  const themeBtn = document.getElementById('themeToggle');
  function syncThemeAria(): void {
    if (!themeBtn) return;
    const cur = document.documentElement.getAttribute('data-theme');
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = cur === 'dark' || (!cur && prefersDark);
    themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  }
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  } catch {}
  syncThemeAria();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isCurrentlyDark = cur === 'dark' || (!cur && prefersDark);
      const next = isCurrentlyDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      syncThemeAria();
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
    });
  }

  const printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. SCROLL-SPY NAVIGATION
  // ═════════════════════════════════════════════════════════════════════════
  const navAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('.navlinks a[href^="#"]'));
  if ('IntersectionObserver' in window && navAnchors.length > 0) {
    const secMap = new Map<Element, HTMLAnchorElement>();
    navAnchors.forEach((a) => {
      const id = a.getAttribute('href')?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (target) secMap.set(target, a);
    });

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const link = secMap.get(en.target);
            if (link) {
              navAnchors.forEach((x) => x.classList.remove('is-active'));
              link.classList.add('is-active');
            }
          }
        });
      },
      { rootMargin: '-20% 0px -68% 0px' }
    );
    secMap.forEach((_a, el) => obs.observe(el));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. INTERACTIVE TARIFF BOARD & DECISION SIMULATOR
  // ═════════════════════════════════════════════════════════════════════════
  function refreshTariffBoardDisplay(): void {
    const board = document.getElementById('budgettable');
    if (!board) return;
    const divisor = currentScope === 'person' ? APP.peopleCount : 1;

    board.querySelectorAll<HTMLElement>('.trow[data-line-eur]').forEach((row) => {
      const baseEur = Number(row.getAttribute('data-line-eur'));
      const scaledEur = baseEur / divisor;
      const eurSpan = row.querySelector<HTMLElement>('.eur-val');
      const ilsSpan = row.querySelector<HTMLElement>('.ils-sub');

      if (eurSpan) {
        eurSpan.textContent = fmtEur(scaledEur);
        eurSpan.hidden = currentCurrencyMode === 'ils';
      }
      if (ilsSpan) {
        ilsSpan.textContent = fmtIls(scaledEur * currentEurIls);
        ilsSpan.hidden = currentCurrencyMode === 'eur';
      }
    });

    const grandEurEl = document.getElementById('budgetGrandEur');
    const grandIlsEl = document.getElementById('budgetGrandIls');
    const headingEl = document.getElementById('budgetTotalHeading');
    const metaEl = document.getElementById('budgetTotalMeta');
    const scaledTotal = APP.canonicalBudget.totalEur / divisor;

    if (headingEl) {
      headingEl.textContent =
        currentScope === 'person'
          ? `ממוצע לאדם (חלוקה ל-${APP.peopleCount} נפשות)`
          : `סך הכול למשפחה (${APP.peopleCount} נפשות)`;
    }
    if (grandEurEl) {
      grandEurEl.textContent =
        currentCurrencyMode === 'ils'
          ? fmtIls(scaledTotal * currentEurIls)
          : fmtEur(scaledTotal);
    }
    if (grandIlsEl) {
      grandIlsEl.textContent = fmtIls(scaledTotal * currentEurIls);
      grandIlsEl.hidden = currentCurrencyMode !== 'both';
    }

    if (metaEl) {
      const perPersonExact = Number(metaEl.getAttribute('data-per-person-exact'));
      const paidEur = Number(metaEl.getAttribute('data-paid-eur')) / divisor;
      const leftEur = Number(metaEl.getAttribute('data-left-eur')) / divisor;
      const vsCompEur = Number(metaEl.getAttribute('data-vs-comp-eur')) / divisor;

      const fmtSecondary = (eurAmt: number): string =>
        currentCurrencyMode === 'ils' ? fmtIls(eurAmt * currentEurIls) : fmtEur(eurAmt);

      const perPersonLead =
        currentCurrencyMode === 'both'
          ? `${fmtEur(perPersonExact)} (${fmtIls(perPersonExact * currentEurIls)})`
          : currentCurrencyMode === 'eur'
            ? fmtEur(perPersonExact)
            : fmtIls(perPersonExact * currentEurIls);

      const familyLead =
        currentCurrencyMode === 'both'
          ? `${fmtEur(APP.canonicalBudget.totalEur)} (${fmtIls(APP.canonicalBudget.totalEur * currentEurIls)})`
          : currentCurrencyMode === 'eur'
            ? fmtEur(APP.canonicalBudget.totalEur)
            : fmtIls(APP.canonicalBudget.totalEur * currentEurIls);

      const vsCompText =
        vsCompEur > 0
          ? `נמוך ב-${fmtSecondary(vsCompEur)} מאומדן ההשוואה שלפיו בחרנו`
          : vsCompEur < 0
            ? `גבוה ב-${fmtSecondary(-vsCompEur)} מאומדן ההשוואה שלפיו בחרנו`
            : 'בדיוק כמו אומדן ההשוואה שלפיו בחרנו';

      const leadHtml =
        currentScope === 'person'
          ? `מתוך <span class="mono">${escHtml(familyLead)}</span> למשפחה`
          : `<span class="mono">${escHtml(perPersonLead)}</span> לאדם`;

      metaEl.innerHTML =
        `${leadHtml} · שולם עד היום <span class="mono">${escHtml(fmtSecondary(paidEur))}</span>, ` +
        `נותר <span class="mono" id="budgetLeftEur">${escHtml(fmtSecondary(leftEur))}</span> · ` +
        escHtml(vsCompText);
    }
  }

  document.querySelectorAll<HTMLButtonElement>('[data-curr-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-curr-btn') as 'both' | 'eur' | 'ils';
      currentCurrencyMode = mode;
      document.querySelectorAll('[data-curr-btn]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      refreshTariffBoardDisplay();
    });
  });

  const scopeBtn = document.getElementById('scopeToggleBtn');
  if (scopeBtn) {
    scopeBtn.addEventListener('click', () => {
      currentScope = currentScope === 'family' ? 'person' : 'family';
      const isPerson = currentScope === 'person';
      scopeBtn.classList.toggle('is-active', isPerson);
      scopeBtn.setAttribute('aria-pressed', isPerson ? 'true' : 'false');
      scopeBtn.textContent = isPerson ? 'תצוגת לאדם (לחץ למשפחה)' : 'למשפחה (לחץ ללאדם)';
      refreshTariffBoardDisplay();
    });
  }

  const simTransfer = document.getElementById('simTransfer') as HTMLSelectElement | null;
  const simGearSchool = document.getElementById('simGearSchool') as HTMLSelectElement | null;
  const simInsurance = document.getElementById('simInsurance') as HTMLSelectElement | null;
  const simLastSat = document.getElementById('simLastSat') as HTMLSelectElement | null;
  const simResetBtn = document.getElementById('simResetBtn');

  function refreshSimulator(): void {
    if (!simTransfer || !simGearSchool || !simInsurance || !simLastSat) return;
    const fixedBase =
      APP.canonicalBudget.totalEur -
      APP.canonicalBudget.transferPickEur -
      APP.canonicalBudget.gearPlusSchoolSeparateEur;
    const scenarioEur =
      fixedBase +
      Number(simTransfer.value) +
      Number(simGearSchool.value) +
      Number(simInsurance.value) +
      Number(simLastSat.value);
    const delta = scenarioEur - APP.canonicalBudget.totalEur;

    const totalEurEl = document.getElementById('simTotalEur');
    const totalIlsEl = document.getElementById('simTotalIls');
    const deltaEl = document.getElementById('simDeltaBadge');

    if (totalEurEl) totalEurEl.textContent = fmtEur(scenarioEur);
    if (totalIlsEl) {
      totalIlsEl.setAttribute('data-eur', String(scenarioEur));
      totalIlsEl.textContent = `(${fmtIls(scenarioEur * currentEurIls)})`;
    }
    if (deltaEl) {
      if (delta === 0) {
        deltaEl.className = 'chip c-ok';
        deltaEl.textContent = 'תוכנית הבסיס (€0 הפרש)';
      } else if (delta < 0) {
        deltaEl.className = 'chip c-ok';
        deltaEl.textContent = `חיסכון של ${fmtEur(-delta)} (${fmtIls(-delta * currentEurIls)})`;
      } else {
        deltaEl.className = 'chip c-wn';
        deltaEl.textContent = `תוספת של +${fmtEur(delta)} (+${fmtIls(delta * currentEurIls)})`;
      }
    }
  }

  [simTransfer, simGearSchool, simInsurance, simLastSat].forEach((sel) => {
    sel?.addEventListener('change', refreshSimulator);
  });

  simResetBtn?.addEventListener('click', () => {
    if (simTransfer) simTransfer.selectedIndex = 0;
    if (simGearSchool) simGearSchool.selectedIndex = 0;
    if (simInsurance) simInsurance.selectedIndex = 0;
    if (simLastSat) simLastSat.selectedIndex = 0;
    refreshSimulator();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 5. INTERACTIVE LIVIGNO VALLEY MAP & FAMILY MEMBER FILTER
  // ═════════════════════════════════════════════════════════════════════════
  function selectMapPin(pinId: string): void {
    const pin = APP.mapPins.find((p) => p.id === pinId);
    if (!pin) return;

    document.querySelectorAll('.map-pin-group').forEach((g) => {
      g.classList.toggle('is-selected', g.getAttribute('data-pin-id') === pinId);
    });
    document.querySelectorAll('[data-pin-btn]').forEach((b) => {
      const sel = b.getAttribute('data-pin-btn') === pinId;
      b.classList.toggle('is-selected', sel);
      b.setAttribute('aria-pressed', sel ? 'true' : 'false');
    });

    const titleEl = document.getElementById('mapPinTitle');
    const enEl = document.getElementById('mapPinEn');
    const distEl = document.getElementById('mapPinDistance');
    const sumEl = document.getElementById('mapPinSummary');
    const whoEl = document.getElementById('mapPinWho');
    const linkEl = document.getElementById('mapPinLink') as HTMLAnchorElement | null;

    if (titleEl) titleEl.textContent = pin.labelHe;
    if (enEl) enEl.textContent = pin.labelEn;
    if (distEl) distEl.textContent = pin.walkFromCalandaHe;
    if (sumEl) sumEl.textContent = pin.summaryHe;
    if (whoEl) whoEl.textContent = `רלוונטי ל: ${pin.forWhoNamesHe}`;
    if (linkEl) linkEl.href = pin.mapUrl;
  }

  document.querySelectorAll<HTMLElement>('.map-pin-group').forEach((g) => {
    const pid = g.getAttribute('data-pin-id');
    if (!pid) return;
    g.addEventListener('click', () => selectMapPin(pid));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectMapPin(pid);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-pin-btn]').forEach((btn) => {
    const pid = btn.getAttribute('data-pin-btn');
    if (pid) btn.addEventListener('click', () => selectMapPin(pid));
  });

  function applyMemberFilter(memberId: string): void {
    document.querySelectorAll('[data-member-filter]').forEach((b) => {
      const active = b.getAttribute('data-member-filter') === memberId;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    document.querySelectorAll<HTMLElement>('[data-member-card]').forEach((card) => {
      const cid = card.getAttribute('data-member-card');
      const sel = memberId !== 'all' && cid === memberId;
      card.classList.toggle('is-selected', sel);
      card.classList.toggle('is-dimmed', memberId !== 'all' && cid !== memberId);
      card.setAttribute('aria-pressed', sel ? 'true' : 'false');
    });

    document.querySelectorAll<HTMLElement>('.map-pin-group').forEach((g) => {
      const whoList = (g.getAttribute('data-who') ?? '').split(',');
      g.classList.toggle('is-dimmed', memberId !== 'all' && !whoList.includes(memberId));
    });

    document.querySelectorAll<HTMLElement>('.dp-track[data-track-who]').forEach((tr) => {
      const whoList = (tr.getAttribute('data-track-who') ?? '').split(',');
      const match = memberId !== 'all' && whoList.includes(memberId);
      tr.classList.toggle('is-highlighted', match);
      tr.classList.toggle('is-dimmed', memberId !== 'all' && !match);
    });

    document.querySelectorAll<HTMLElement>('.pack-item[data-who]').forEach((pi) => {
      const whoList = (pi.getAttribute('data-who') ?? '').split(',');
      pi.classList.toggle('is-member-focus', memberId !== 'all' && whoList.includes(memberId));
    });

    const spotlight = document.getElementById('memberSpotlight');
    if (spotlight) {
      const m = (APP.partyMembersMeta ?? []).find((x) => x.id === memberId);
      if (!m || memberId === 'all') {
        spotlight.hidden = true;
        spotlight.innerHTML = '';
      } else {
        spotlight.hidden = false;
        spotlight.innerHTML =
          `<div class="ms-row">` +
          `<div class="ms-copy">` +
          `<b>${escHtml(m.nameHe)}</b> <span class="muted">(${escHtml(m.roleHe)})</span> · ` +
          `<b>סקי-פס:</b> <span class="mono">${escHtml(m.passText)}</span> · ` +
          `<b>מושבים:</b> ${escHtml(m.seatsStatusHe)}<br>` +
          `<small>${escHtml(m.scheduleFocusHe)}</small>` +
          `</div>` +
          `<button type="button" class="ms-close-btn" data-close-spotlight aria-label="סגירת תצוגה אישית וחזרה לכל המשפחה">✕ סגור</button>` +
          `</div>`;
      }
    }

    if (memberId === 'orit') {
      selectMapPin('aquagranda');
    } else if (memberId === 'mika' || memberId === 'nitzan' || memberId === 'gali') {
      selectMapPin('campo23');
    } else if (memberId === 'reuven') {
      selectMapPin('mottolino');
    }
  }

  document.getElementById('memberSpotlight')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement | null)?.closest('[data-close-spotlight]')) {
      applyMemberFilter('all');
    }
  });

  document.querySelectorAll<HTMLButtonElement>('[data-member-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-member-filter') ?? 'all';
      const alreadyActive = id !== 'all' && btn.classList.contains('is-active');
      applyMemberFilter(alreadyActive ? 'all' : id);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-member-card]').forEach((card) => {
    const id = card.getAttribute('data-member-card');
    if (!id) return;
    card.setAttribute('aria-pressed', 'false');
    const toggleCard = () => {
      const isAlreadySelected = card.classList.contains('is-selected');
      applyMemberFilter(isAlreadySelected ? 'all' : id);
    };
    card.addEventListener('click', toggleCard);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCard();
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 6. HOST MESSAGE STUDIO (English <-> Italiano + Copy + WhatsApp Sync)
  // ═════════════════════════════════════════════════════════════════════════
  let currentMsgLang: 'en' | 'it' = 'en';

  document.querySelectorAll<HTMLButtonElement>('[data-msg-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = (btn.getAttribute('data-msg-lang') as 'en' | 'it') ?? 'en';
      currentMsgLang = lang;
      document.querySelectorAll('[data-msg-lang]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      document.querySelectorAll<HTMLElement>('[data-msg-card]').forEach((card) => {
        const pre = card.querySelector<HTMLElement>('.msg-pre');
        const wa = card.querySelector<HTMLAnchorElement>('[data-wa-link]');
        if (!pre) return;
        const body = pre.getAttribute(lang === 'it' ? 'data-body-it' : 'data-body-en') ?? '';
        pre.textContent = body;
        if (wa) {
          const base = wa.href.split('?')[0];
          wa.href = `${base}?text=${encodeURIComponent(body)}`;
        }
      });
    });
  });

  function copyTextSync(value: string): boolean {
    if (navigator.clipboard && window.isSecureContext) {
      void navigator.clipboard.writeText(value).catch(() => {});
    }
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;inset-inline-start:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    document.body.removeChild(ta);
    return ok || Boolean(navigator.clipboard);
  }

  document.querySelectorAll<HTMLButtonElement>('.copy-msg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-copy-target');
      const card = id ? document.querySelector(`[data-msg-card="${id}"]`) : null;
      const pre = card?.querySelector('.msg-pre');
      const fb = id ? document.querySelector(`[data-feedback="${id}"]`) : null;
      if (pre && pre.textContent) {
        copyTextSync(pre.textContent);
        if (fb) {
          fb.textContent = `הועתק (${currentMsgLang.toUpperCase()}) ✓`;
          setTimeout(() => {
            fb.textContent = '';
          }, 2500);
        }
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 7. DEADLINES, SYNCHRONIZED TO-DO CENTER, .ICS & LOSSLESS MARKDOWN COPY
  // ═════════════════════════════════════════════════════════════════════════
  const doneZone = document.getElementById('donezone');
  const DONE_STORE_KEY = doneZone?.getAttribute('data-store') ?? 'livigno27-done-v2';
  const doneListEl = document.getElementById('donelist');
  const doneCountEl = document.getElementById('donecount');
  const doneEmptyEl = document.getElementById('doneempty');
  const doneClearBtn = document.getElementById('doneclear');
  let activeTodoFilter = 'all';

  function daysUntilIso(iso: string, refMs: number): number {
    const p = iso.split('-');
    const targetUtc = Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    const ref = new Date(refMs);
    const todayUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
    return Math.round((targetUtc - todayUtc) / 86_400_000);
  }

  function relativeDaysHe(days: number): string {
    if (days < -1) return `באיחור של ${-days} ימים`;
    if (days === -1) return 'עבר אתמול';
    if (days === 0) return 'היום';
    if (days === 1) return 'מחר';
    if (days < 14) return `בעוד ${days} ימים`;
    return `בעוד ${Math.round(days / 7)} שבועות`;
  }

  function decorateDeadlines(refMs: number): void {
    document.querySelectorAll<HTMLElement>('.todo[data-deadline]').forEach((card) => {
      const iso = card.getAttribute('data-deadline')!;
      const chip = card.querySelector<HTMLElement>('.chip.dl');
      if (!chip) return;
      const baseShort = chip.getAttribute('data-base') ?? chip.textContent?.split(' · ')[0] ?? '';
      chip.setAttribute('data-base', baseShort);
      const d = daysUntilIso(iso, refMs);
      chip.textContent = `${baseShort} · ${relativeDaysHe(d)}`;
      chip.className = `chip dl ${d < 0 ? 'c-al' : d <= 7 ? 'c-wn' : 'c-muted'}`;
      card.setAttribute('data-overdue', d < 0 ? '1' : '0');
    });
  }

  function loadDoneIds(): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(DONE_STORE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveDoneIds(ids: string[]): void {
    try {
      localStorage.setItem(DONE_STORE_KEY, JSON.stringify(ids));
    } catch {}
  }

  const todoCards: HTMLElement[] = Array.from(document.querySelectorAll<HTMLElement>('.todo[data-item]'));

  function syncTopSignsAndPriority(): void {
    const doneSet = new Set(
      todoCards.filter((c) => c.dataset.done === '1').map((c) => c.dataset.item!)
    );

    // Sync Trail Signs
    document.querySelectorAll<HTMLElement>('#signs .sign').forEach((sign) => {
      const defDone = sign.getAttribute('data-default-done') === '1';
      const defStatus = sign.getAttribute('data-default-status') ?? '';
      const linked = (sign.getAttribute('data-linked-tasks') ?? '')
        .split(',')
        .filter(Boolean);
      const isNowDone = defDone || (linked.length > 0 && linked.every((id) => doneSet.has(id)));
      sign.classList.toggle('done', isNowDone);
      sign.classList.toggle('open', !isNowDone);
      const stSpan = sign.querySelector('.sign-status');
      if (stSpan) stSpan.textContent = isNowDone ? 'סגור' : defStatus;
    });

    // Sync Top Priority Strip
    const openMeta = APP.openItemsMeta.filter((m) => !doneSet.has(m.id));
    const badge = document.getElementById('openRemainingBadge');
    if (badge) {
      badge.textContent =
        openMeta.length === 0 ? 'כל המשימות הושלמו!' : `${openMeta.length} משימות פתוחות`;
    }
    const ol = document.getElementById('liveNextSteps');
    if (ol) {
      if (openMeta.length === 0) {
        ol.innerHTML = '<li><b>הכול סגור ומוכן לטיסה!</b></li>';
      } else {
        ol.innerHTML = openMeta
          .slice(0, 5)
          .map(
            (it) =>
              `<li data-priority-item="${escHtml(it.id)}"><b>${escHtml(it.titleHe)}</b>${
                it.deadlineDm ? ` <span class="mono muted">(יעד ${escHtml(it.deadlineDm)})</span>` : ''
              } — <a href="${escHtml(it.targetAnchor)}">לפרק הרלוונטי</a></li>`
          )
          .join('');
      }
    }
  }

  function applyTodoFilter(): void {
    todoCards.forEach((card) => {
      if (card.dataset.done === '1') {
        card.hidden = false;
        return;
      }
      if (activeTodoFilter === 'all') {
        card.hidden = false;
      } else if (activeTodoFilter === 'red') {
        card.hidden = card.getAttribute('data-urgency') !== 'red';
      } else if (activeTodoFilter === 'overdue') {
        card.hidden = card.getAttribute('data-overdue') !== '1';
      }
    });
  }

  function refreshDoneZone(): void {
    if (!doneListEl) return;
    const count = doneListEl.children.length;
    if (doneCountEl) doneCountEl.textContent = String(count);
    if (doneEmptyEl) doneEmptyEl.hidden = count > 0;
    if (doneClearBtn) doneClearBtn.hidden = count === 0;
    syncTopSignsAndPriority();
    applyTodoFilter();
  }

  function setTodoDone(card: HTMLElement, on: boolean, persist: boolean): void {
    if (!doneListEl) return;
    const id = card.dataset.item!;
    const chk = card.querySelector<HTMLButtonElement>('.dchk');
    if (on) {
      if (card.dataset.done === '1') return;
      const slot = document.createElement('div');
      slot.className = 'dslot';
      slot.dataset.slot = id;
      card.parentNode?.insertBefore(slot, card);
      doneListEl.appendChild(card);
      card.dataset.done = '1';
      card.classList.add('is-done');
      chk?.setAttribute('aria-checked', 'true');
    } else {
      if (card.dataset.done !== '1') return;
      const slot = document.querySelector(`.dslot[data-slot="${id}"]`);
      if (slot && slot.parentNode) {
        slot.parentNode.insertBefore(card, slot);
        slot.parentNode.removeChild(slot);
      }
      card.dataset.done = '';
      card.classList.remove('is-done');
      chk?.setAttribute('aria-checked', 'false');
    }
    if (persist) {
      saveDoneIds(
        todoCards.filter((c) => c.dataset.done === '1').map((c) => c.dataset.item!)
      );
    }
    refreshDoneZone();
  }

  todoCards.forEach((card) => {
    const header = card.querySelector('.th');
    if (!header || header.querySelector('.dchk')) return;
    const title = card.querySelector('.tt')?.textContent?.trim() ?? '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dchk';
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-checked', 'false');
    btn.setAttribute('aria-label', `סימון "${title}" כטופל`);
    header.insertBefore(btn, header.firstChild);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setTodoDone(card, card.dataset.done !== '1', true);
    });
  });

  const savedDone = loadDoneIds();
  savedDone.forEach((id) => {
    const match = todoCards.find((c) => c.dataset.item === id);
    if (match) setTodoDone(match, true, false);
  });
  decorateDeadlines(Date.now());
  refreshDoneZone();

  doneClearBtn?.addEventListener('click', () => {
    [...todoCards].reverse().forEach((c) => setTodoDone(c, false, false));
    saveDoneIds([]);
    refreshDoneZone();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-todo-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTodoFilter = btn.getAttribute('data-todo-filter') ?? 'all';
      document.querySelectorAll('[data-todo-filter]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyTodoFilter();
    });
  });

  // .ics Calendar Reminder Download
  const icsBtn = document.getElementById('downloadIcsBtn');
  icsBtn?.addEventListener('click', () => {
    const dtStamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d+Z$/, 'Z');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Livigno Ski 2027//HE',
      'CALSCALE:GREGORIAN',
    ];
    APP.openItemsMeta.forEach((it) => {
      if (!it.deadline) return;
      const ymd = it.deadline.replace(/-/g, '');
      lines.push(
        'BEGIN:VEVENT',
        `UID:livigno27-${it.id}@ski-planner`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${ymd}`,
        `SUMMARY:חופשת סקי ליביניו: ${it.titleHe}`,
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'livigno-ski-2027-deadlines.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Lossless AI Context Copy
  function getFullMarkdown(): string {
    return APP.canonicalMarkdown;
  }
  (window as unknown as { livignoMarkdown: () => string }).livignoMarkdown = getFullMarkdown;

  function showCopyFeedback(msg: string, ok: boolean): void {
    const say = document.getElementById('ctxSay');
    if (!say) return;
    say.textContent = msg;
    say.className = `ctxsay ${ok ? 'ok' : 'bad'}`;
  }

  ['askClaude', 'askGemini', 'copyMdOnlyBtn'].forEach((id) => {
    const el = document.getElementById(id);
    el?.addEventListener('click', () => {
      const md = getFullMarkdown();
      const kb = Math.max(1, Math.round(md.length / 1024));
      if (copyTextSync(md)) {
        showCopyFeedback(
          id === 'copyMdOnlyBtn'
            ? `הועתק ללוח (${kb}KB של סיכום מלא כולל תקציב ו-${APP.openItemsMeta.length} משימות) ✓`
            : `הועתק (${kb}KB) ✓ — הדבק בשיחה החדשה (Ctrl+V) ושאל כל שאלה.`,
          true
        );
      } else {
        showCopyFeedback('לא ניתן להעתיק אוטומטית בדפדפן זה.', false);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 8. FULL-PAGE SEARCH (Ctrl+K / /)
  // ═════════════════════════════════════════════════════════════════════════
  const searchLayer = document.getElementById('searchLayer');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const searchResults = document.getElementById('searchResults');
  const searchTriggerBtn = document.getElementById('searchBtn');
  let searchIndex: Array<{ el: HTMLElement; text: string; low: string; head: string }> | null = null;
  let searchHits: Array<{ el: HTMLElement; text: string; low: string; head: string }> = [];
  let activeHitIdx = -1;
  let lastHighlighted: HTMLElement | null = null;

  function buildSearchIndex() {
    const out: Array<{ el: HTMLElement; text: string; low: string; head: string }> = [];
    let currentHead = 'ליביניו';
    const selector = 'h2, h3, h4, p, li, dd, td, .tt';
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (
        el.closest('.searchlayer') ||
        el.closest('.topbar') ||
        el.closest('.timetravel-bar')
      ) {
        return;
      }
      const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (txt.length < 3 || txt.length > 700) return;
      if (/^H[234]$/.test(el.tagName) || el.classList.contains('tt')) {
        currentHead = txt.slice(0, 85);
      }
      out.push({ el, text: txt, low: txt.toLowerCase(), head: currentHead });
    });
    return out;
  }

  function highlightTokens(text: string, tokens: string[]): string {
    const low = text.toLowerCase();
    const ranges: Array<[number, number]> = [];
    tokens.forEach((t) => {
      let pos = 0;
      while (true) {
        const idx = low.indexOf(t, pos);
        if (idx === -1) break;
        ranges.push([idx, idx + t.length]);
        pos = idx + t.length;
      }
    });
    if (!ranges.length) return escHtml(text);
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [ranges[0]!];
    for (let i = 1; i < ranges.length; i++) {
      const prev = merged[merged.length - 1]!;
      const cur = ranges[i]!;
      if (cur[0] <= prev[1]) prev[1] = Math.max(prev[1], cur[1]);
      else merged.push(cur);
    }
    let out = '';
    let cursor = 0;
    merged.forEach(([s, e]) => {
      out += escHtml(text.slice(cursor, s)) + '<mark>' + escHtml(text.slice(s, e)) + '</mark>';
      cursor = e;
    });
    return out + escHtml(text.slice(cursor));
  }

  function performSearch(query: string): void {
    if (!searchResults) return;
    const q = query.trim().toLowerCase();
    activeHitIdx = -1;
    if (q.length < 2) {
      searchResults.innerHTML =
        '<div class="searchhint">הקלד מילה לחיפוש מהיר בכל הדף (כולל בתוך מגירת החלופות הסגורה).</div>';
      searchHits = [];
      return;
    }
    if (!searchIndex) searchIndex = buildSearchIndex();
    const tokens = q.split(/\s+/).filter(Boolean);
    const found = searchIndex.filter((item) => tokens.every((t) => item.low.includes(t)));
    searchHits = found.slice(0, 35);
    if (!searchHits.length) {
      searchResults.innerHTML = `<div class="searchhint">לא נמצאו תוצאות עבור <b>${escHtml(query)}</b>.</div>`;
      return;
    }
    let resHtml = `<div class="srcount">${found.length} תוצאות</div>`;
    searchHits.forEach((h, i) => {
      const snippet = h.text.length > 150 ? h.text.slice(0, 150) + '…' : h.text;
      resHtml += `<button type="button" class="sres" data-hit="${i}"><span class="srh">${highlightTokens(
        h.head,
        tokens
      )}</span><span class="srt">${highlightTokens(snippet, tokens)}</span></button>`;
    });
    searchResults.innerHTML = resHtml;
  }

  function closeSearchModal(restoreFocus = true): void {
    if (!searchLayer) return;
    searchLayer.hidden = true;
    if (restoreFocus && searchTriggerBtn) {
      searchTriggerBtn.focus();
    }
  }

  function activateAppTab(tabId: string, scrollTop = false): void {
    const panes = document.querySelectorAll<HTMLElement>('[data-app-pane]');
    if (!panes.length) return;
    panes.forEach((p) => {
      p.classList.toggle('is-active', p.getAttribute('data-app-pane') === tabId);
    });
    document.querySelectorAll<HTMLElement>('[data-app-tab]').forEach((btn) => {
      const active = btn.getAttribute('data-app-tab') === tabId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function ensureElementTabActive(el: Element | null): void {
    if (!el) return;
    const pane = el.closest<HTMLElement>('[data-app-pane]');
    const tabId = pane?.getAttribute('data-app-pane');
    if (tabId) activateAppTab(tabId, false);
  }

  function jumpToSearchResult(idx: number): void {
    const hit = searchHits[idx];
    if (!hit || !searchLayer) return;
    closeSearchModal(false);
    ensureElementTabActive(hit.el);
    let d = hit.el.closest('details');
    while (d) {
      d.open = true;
      d = d.parentElement?.closest('details') ?? null;
    }
    if (lastHighlighted) lastHighlighted.classList.remove('hit');
    lastHighlighted = hit.el;
    hit.el.classList.add('hit');
    if (!hit.el.hasAttribute('tabindex')) hit.el.setAttribute('tabindex', '-1');
    hit.el.focus({ preventScroll: true });
    hit.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => hit.el.classList.remove('hit'), 2500);
  }

  function openSearchModal(): void {
    if (!searchLayer || !searchInput) return;
    searchLayer.hidden = false;
    performSearch(searchInput.value);
    searchInput.focus();
    searchInput.select();
  }

  searchTriggerBtn?.addEventListener('click', openSearchModal);
  document.getElementById('searchCloseBtn')?.addEventListener('click', () => {
    closeSearchModal(true);
  });
  searchLayer?.addEventListener('click', (e) => {
    if (e.target === searchLayer) closeSearchModal(true);
  });
  searchInput?.addEventListener('input', () => performSearch(searchInput.value));
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeSearchModal(true);
      return;
    }
    const items = searchResults?.querySelectorAll('.sres') ?? [];
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      activeHitIdx = (activeHitIdx + 1) % items.length;
      items.forEach((el, k) => el.setAttribute('data-active', k === activeHitIdx ? '1' : '0'));
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      activeHitIdx = (activeHitIdx - 1 + items.length) % items.length;
      items.forEach((el, k) => el.setAttribute('data-active', k === activeHitIdx ? '1' : '0'));
    } else if (e.key === 'Enter' && searchHits.length) {
      e.preventDefault();
      jumpToSearchResult(activeHitIdx < 0 ? 0 : activeHitIdx);
    }
  });
  searchResults?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.sres');
    if (btn) jumpToSearchResult(Number(btn.getAttribute('data-hit')));
  });

  document.addEventListener('keydown', (e) => {
    if (!searchLayer) return;
    if (e.key === 'Escape' && !searchLayer.hidden) {
      e.preventDefault();
      closeSearchModal(true);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal();
      return;
    }
    if (e.key === '/' && searchLayer.hidden) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      openSearchModal();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 9. LIVE "NOW" CARD, COUNTDOWN STAMP & TIME-TRAVEL SIMULATOR
  // ═════════════════════════════════════════════════════════════════════════
  const tzFormatters: Record<string, Intl.DateTimeFormat> = {};
  const DOW_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  function getTzParts(ms: number, tz: string) {
    if (!tzFormatters[tz]) {
      tzFormatters[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        weekday: 'short',
      });
    }
    const o: Record<string, string> = {};
    tzFormatters[tz]!.formatToParts(new Date(ms)).forEach((p) => {
      o[p.type] = p.value;
    });
    const w = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday ?? 'Sun');
    return {
      y: Number(o.year),
      m: Number(o.month),
      d: Number(o.day),
      H: Number(o.hour) % 24,
      M: Number(o.minute),
      w: w < 0 ? 0 : w,
    };
  }

  function formatHmInTz(ms: number, tz: string): string {
    const p = getTzParts(ms, tz);
    return `${String(p.H).padStart(2, '0')}:${String(p.M).padStart(2, '0')}`;
  }

  function formatYmdInTz(ms: number, tz: string): string {
    const p = getTzParts(ms, tz);
    return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  }

  function formatDayNameInTz(ms: number, tz: string): string {
    const p = getTzParts(ms, tz);
    return `${DOW_HE[p.w]} ${p.d}.${p.m}`;
  }

  function parseNowOverride(param: string): number | null {
    if (!param) return null;
    if (/(Z|[+-]\d\d:?\d\d)$/.test(param)) {
      const parsed = Date.parse(param);
      return Number.isNaN(parsed) ? null : parsed;
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(param);
    if (!m) return null;
    const dateStr = `${m[1]}-${m[2]}-${m[3]}`;
    const dayObj = APP.timeline.days.find((d) => d.dateIso === dateStr);
    const offset = dayObj?.tz === 'Asia/Jerusalem' ? '+02:00' : '+01:00';
    const parsed = Date.parse(`${dateStr}T${m[4] ?? '12'}:${m[5] ?? '00'}:00${offset}`);
    return Number.isNaN(parsed) ? null : parsed;
  }

  // Check initial URL `?now=...`
  const urlNowMatch = /[?#&]now=([^&#]+)/.exec(location.search + '&' + location.hash);
  if (urlNowMatch) {
    simulatedNowMs = parseNowOverride(decodeURIComponent(urlNowMatch[1]!));
  }

  function getActiveNowMs(): number {
    return simulatedNowMs !== null ? simulatedNowMs : Date.now();
  }

  function updateCountdownStamp(nowMs: number): void {
    const stamp = document.getElementById('countdownStamp');
    if (!stamp) return;
    const depMs = Number(stamp.getAttribute('data-until'));
    if (!Number.isFinite(depMs) || nowMs >= depMs) {
      stamp.hidden = true;
      return;
    }
    const depYmd = formatYmdInTz(depMs, 'Asia/Jerusalem');
    const nowYmd = formatYmdInTz(nowMs, 'Asia/Jerusalem');
    const daysLeft = Math.round((Date.parse(depYmd) - Date.parse(nowYmd)) / 86_400_000);
    const numEl = stamp.querySelector('.cd-n');
    if (numEl) numEl.textContent = String(Math.max(0, daysLeft));
    stamp.hidden = false;
  }

  function formatCountdownChip(evStartMs: number, evEndMs: number, nowMs: number, tz: string): string {
    if (nowMs >= evStartMs && nowMs < evEndMs) {
      return `עכשיו · עד ${formatHmInTz(evEndMs, tz)}`;
    }
    const diffMin = Math.round((evStartMs - nowMs) / 60_000);
    if (diffMin < 60) return `בעוד ${Math.max(1, diffMin)} דק׳`;
    if (diffMin < 24 * 60) {
      const h = Math.floor(diffMin / 60);
      const m = String(diffMin % 60).padStart(2, '0');
      return `בעוד ${h}:${m} ש׳`;
    }
    const days = Math.round(
      (Date.parse(formatYmdInTz(evStartMs, tz)) - Date.parse(formatYmdInTz(nowMs, tz))) / 86_400_000
    );
    return days <= 1 ? 'מחר' : `בעוד ${days} ימים`;
  }

  function renderLiveNowCard(): void {
    const box = document.getElementById('nowcard');
    if (!box) return;
    const t = getActiveNowMs();
    updateCountdownStamp(t);
    decorateDeadlines(t);

    const events = APP.timeline.events;
    const days = APP.timeline.days;
    const first = events[0];
    const last = events[events.length - 1];

    const clockLabel = document.getElementById('activeClockLabel');
    const displayZone =
      first && t >= first.startMs && last && t <= last.untilMs ? 'Europe/Rome' : 'Asia/Jerusalem';
    if (clockLabel) {
      clockLabel.textContent = `${formatDayNameInTz(t, displayZone)} · ${formatHmInTz(t, displayZone)} (${
        APP.timeline.tzLabelsHe[displayZone] ?? displayZone
      })`;
    }

    if (!first || !last) return;

    const phase = t < first.fromMs ? 'before' : t >= last.untilMs ? 'after' : 'trip';
    box.setAttribute('data-phase', phase);

    const out: string[] = [];
    if (simulatedNowMs !== null) {
      out.push(
        `<div class="nc-banner"><span>תצוגת בדיקה ("מסע בזמן"): הדף מוצג כאילו עכשיו <b>${escHtml(
          formatDayNameInTz(t, displayZone)
        )} בשעה ${escHtml(formatHmInTz(t, displayZone))}</b></span></div>`
      );
    }

    if (phase === 'before') {
      box.setAttribute('data-compact', '1');
      out.push(
        `<div class="nc-head"><span class="nc-badge">לפני הטיול</span><span class="nc-daytitle">המראה ${escHtml(
          formatCountdownChip(first.startMs, first.endMs, t, first.tz)
        )} · ${escHtml(first.titleHe)}</span></div>`,
        `<p class="nc-sub" style="margin:0">בזמן אמת במהלך שבוע הסקי הכרטיס הזה הופך למרכז ניווט חי (טיסות, הסעה, מעבר דירות, שעות הקורס של הבנות ויציאה לשדה). אפשר ללחוץ על כפתורי ״מצב שטח״ למעלה כדי לבדוק כל יום כבר עכשיו.</p>`
      );
    } else if (phase === 'after') {
      box.setAttribute('data-compact', '1');
      out.push(
        `<div class="nc-head"><span class="nc-badge">סיום הטיול</span><span class="nc-daytitle">החופשה בליביניו הסתיימה — ברוכים השבים!</span></div>`
      );
    } else {
      box.removeAttribute('data-compact');
      const activeDay =
        days.find((d) => d.dateIso === formatYmdInTz(t, d.tz)) ??
        days.find((d) => d.dateIso >= formatYmdInTz(t, 'Europe/Rome')) ??
        days[0]!;

      const currentOrNext =
        events.find((e) => t >= e.startMs && t < e.endMs) ??
        events.find((e) => e.startMs > t) ??
        last;
      const isLiveNow = t >= currentOrNext.startMs && t < currentOrNext.endMs;

      out.push(
        `<div class="nc-head">` +
          `<span class="nc-badge">${isLiveNow ? 'קורה עכשיו' : 'הדבר הבא'}</span>` +
          `<span class="nc-daytitle">יום ${activeDay.n + 1} · ${escHtml(activeDay.labelHe)} · ${escHtml(
            activeDay.titleHe
          )}</span>` +
          `</div>`,
        `<h3 class="nc-hero-title">${escHtml(currentOrNext.titleHe)}</h3>`,
        `<p class="nc-sub">${escHtml(currentOrNext.subHe)}</p>`,
        `<p style="margin:6px 0 0;font-size:15px">` +
          `<b class="mono">${escHtml(formatHmInTz(currentOrNext.startMs, currentOrNext.tz))}${
            currentOrNext.approx ? '~' : ''
          }</b> · ${escHtml(
            APP.timeline.tzLabelsHe[currentOrNext.tz] ?? currentOrNext.tz
          )} ` +
          `<span class="chip c-ac">${escHtml(
            formatCountdownChip(
              currentOrNext.startMs,
              currentOrNext.endMs,
              t,
              currentOrNext.endTz ?? currentOrNext.tz
            )
          )}</span>` +
          `</p>`
      );

      if (currentOrNext.facts.length > 0) {
        out.push(
          '<div class="nc-facts">' +
            currentOrNext.facts
              .map(
                ([k, v]) =>
                  `<div class="nc-fact"><span>${escHtml(k)}</span><b>${escHtml(v)}</b></div>`
              )
              .join('') +
            '</div>'
        );
      }

      if (currentOrNext.mapUrl || currentOrNext.links.length > 0) {
        out.push(
          '<div class="nc-actions">' +
            (currentOrNext.mapUrl
              ? `<a class="btn-action" href="${escHtml(
                  currentOrNext.mapUrl
                )}" target="_blank" rel="noopener">ניווט ב-Google Maps ↗</a>`
              : '') +
            currentOrNext.links
              .map(
                ([lbl, href]) =>
                  `<a class="btn-action secondary" href="${escHtml(
                    href
                  )}" target="_blank" rel="noopener">${escHtml(lbl)}</a>`
              )
              .join('') +
            '</div>'
        );
      }

      const dayEvents = events.filter((e) => e.dayIndex === activeDay.n);
      if (dayEvents.length > 0) {
        out.push(
          '<div class="nc-schedule"><h5>לוח הזמנים של היום</h5><ul>' +
            dayEvents
              .map((ev) => {
                const cls =
                  t >= ev.startMs && t < ev.endMs
                    ? 'is-now'
                    : t >= ev.endMs
                      ? 'is-done'
                      : '';
                return `<li class="${cls}"><b class="mono">${escHtml(
                  formatHmInTz(ev.startMs, ev.tz)
                )}${ev.approx ? '~' : ''}</b><span>${escHtml(ev.titleHe)}</span></li>`;
              })
              .join('') +
            '</ul></div>'
        );
      }
    }

    box.innerHTML = out.join('');
  }

  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iso = btn.getAttribute('data-now') ?? '';
      simulatedNowMs = iso ? parseNowOverride(iso) : null;
      document.querySelectorAll('[data-preset]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      renderLiveNowCard();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 10. COMPANION APP TAB DOCK & CROSS-TAB HASH ANCHOR NAVIGATION
  // ═════════════════════════════════════════════════════════════════════════
  document.querySelectorAll<HTMLButtonElement>('[data-app-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-app-tab');
      if (tabId) activateAppTab(tabId, true);
    });
  });

  function syncHashTarget(smooth = false): void {
    const rawHash = window.location.hash;
    if (!rawHash || rawHash === '#' || rawHash === '#top') return;
    let targetId = rawHash.slice(1);
    try {
      targetId = decodeURIComponent(targetId);
    } catch {}
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    ensureElementTabActive(targetEl);
    let d = targetEl.closest('details');
    while (d) {
      d.open = true;
      d = d.parentElement?.closest('details') ?? null;
    }
    targetEl.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }

  document.addEventListener('click', (e) => {
    const anchor = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor) return;
    const rawHash = anchor.getAttribute('href');
    if (!rawHash || rawHash === '#' || rawHash === '#top') return;
    let targetId = rawHash.slice(1);
    try {
      targetId = decodeURIComponent(targetId);
    } catch {}
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    const pane = targetEl.closest<HTMLElement>('[data-app-pane]');
    if (pane && !pane.classList.contains('is-active')) {
      e.preventDefault();
      ensureElementTabActive(targetEl);
      let d = targetEl.closest('details');
      while (d) {
        d.open = true;
        d = d.parentElement?.closest('details') ?? null;
      }
      if (history.replaceState) {
        history.replaceState(null, '', `#${targetId}`);
      }
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  window.addEventListener('hashchange', () => syncHashTarget(false));
  syncHashTarget(false);

  // ═════════════════════════════════════════════════════════════════════════
  // 11. INTERACTIVE DAY-BY-DAY DECK & CULINARY SPOT FILTER
  // ═════════════════════════════════════════════════════════════════════════
  document.querySelectorAll<HTMLButtonElement>('[data-day-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const dayId = tab.getAttribute('data-day-tab');
      if (!dayId) return;
      document.querySelectorAll<HTMLElement>('[data-day-tab]').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll<HTMLElement>('[data-day-panel]').forEach((panel) => {
        const show = panel.getAttribute('data-day-panel') === dayId;
        panel.classList.toggle('is-active', show);
        panel.hidden = !show;
      });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-spot-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-spot-filter') ?? 'all';
      document.querySelectorAll('[data-spot-filter]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      document.querySelectorAll<HTMLElement>('.spot-card[data-spot-cat]').forEach((card) => {
        card.hidden = cat !== 'all' && card.getAttribute('data-spot-cat') !== cat;
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 12. INTERACTIVE FAMILY SKI PACKING CHECKLIST
  // ═════════════════════════════════════════════════════════════════════════
  const packingStudio = document.getElementById('packing');
  const PACK_STORE_KEY = packingStudio?.getAttribute('data-pack-store') ?? 'livigno27-packing-v3';
  const packInputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-pack-input]'));
  const packProgressText = document.getElementById('packingProgressText');
  const packProgressBar = document.getElementById('packingProgressBar');
  const packResetBtn = document.getElementById('packingResetBtn');
  let activePackGroup = 'all';

  function loadPackedIds(): Set<string> {
    try {
      const raw = JSON.parse(localStorage.getItem(PACK_STORE_KEY) ?? '[]');
      return new Set(Array.isArray(raw) ? raw : []);
    } catch {
      return new Set();
    }
  }

  function savePackedIds(ids: string[]): void {
    try {
      localStorage.setItem(PACK_STORE_KEY, JSON.stringify(ids));
    } catch {}
  }

  function syncPackingUi(): void {
    if (!packInputs.length) return;
    const checkedIds: string[] = [];
    packInputs.forEach((inp) => {
      const pid = inp.getAttribute('data-pack-input')!;
      const label = inp.closest<HTMLElement>('.pack-item');
      if (inp.checked) checkedIds.push(pid);
      label?.classList.toggle('is-packed', inp.checked);
      if (label) {
        const grp = label.getAttribute('data-pack-group');
        label.hidden = activePackGroup !== 'all' && grp !== activePackGroup;
      }
    });
    const pct = Math.round((checkedIds.length / packInputs.length) * 100);
    if (packProgressText) {
      packProgressText.textContent = `${checkedIds.length} / ${packInputs.length} נארזו (${pct}%)`;
    }
    if (packProgressBar) {
      packProgressBar.style.width = `${pct}%`;
    }
    if (packResetBtn) {
      packResetBtn.hidden = checkedIds.length === 0;
    }
  }

  const initialPacked = loadPackedIds();
  packInputs.forEach((inp) => {
    const pid = inp.getAttribute('data-pack-input')!;
    inp.checked = initialPacked.has(pid);
    inp.addEventListener('change', () => {
      const nowChecked = packInputs
        .filter((x) => x.checked)
        .map((x) => x.getAttribute('data-pack-input')!);
      savePackedIds(nowChecked);
      syncPackingUi();
    });
  });
  syncPackingUi();

  packResetBtn?.addEventListener('click', () => {
    packInputs.forEach((inp) => {
      inp.checked = false;
    });
    savePackedIds([]);
    syncPackingUi();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-pack-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activePackGroup = btn.getAttribute('data-pack-filter') ?? 'all';
      document.querySelectorAll('[data-pack-filter]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      syncPackingUi();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 13. LIVE LIVIGNO WEATHER & SNOW FETCHER (Open-Meteo, CSP-Safe Guarded)
  // ═════════════════════════════════════════════════════════════════════════
  const WX_CACHE_KEY = 'livigno27-wx-v3';
  const weatherHub = document.getElementById('live-weather');

  function describeWmoCodeHe(code: number): string {
    if (code === 0) return 'שמיים בהירים ושמש אלפינית ☀️';
    if (code <= 3) return 'מעונן חלקית–בהיר ⛅';
    if (code >= 71 && code <= 77) return 'יורד שלג בעמק ❄️';
    if (code >= 85 && code <= 86) return 'ממטרי שלג טרי 🌨️';
    if (code >= 45 && code <= 48) return 'ערפל הרים קל';
    return 'מזג אוויר הררי קריר';
  }

  function applyLiveWeatherDom(vTemp: number, windKmh: number, wmo: number, snow7dCm: number): void {
    const summitTemp = Math.round(vTemp - 6.8);
    const vEl = document.getElementById('wxVillageTemp');
    const vSub = document.getElementById('wxVillageSub');
    const sEl = document.getElementById('wxSummitTemp');
    const wEl = document.getElementById('wxWind');
    const cEl = document.getElementById('wxConditionLabel');
    const badge = document.getElementById('weatherLiveBadge');
    const mini = document.getElementById('scWeatherMini');
    const snowSub = document.getElementById('wxSnowSub');

    const vStr = `\u200E${Math.round(vTemp)}°C`;
    const sStr = `\u200E${summitTemp}°C`;
    if (vEl) vEl.textContent = vStr;
    if (vSub) vSub.textContent = 'טמפרטורה חיה בליביניו עכשיו';
    if (sEl) sEl.textContent = sStr;
    if (wEl) wEl.textContent = `${Math.round(windKmh)} קמ״ש`;
    if (cEl) cEl.textContent = describeWmoCodeHe(wmo);
    if (badge) badge.textContent = 'חי מליביניו עכשיו · Open-Meteo';
    if (snowSub && snow7dCm > 0) {
      snowSub.textContent = `צפי שלג טרי השבוע: +${Math.round(snow7dCm)} ס״מ`;
    }
    if (mini) {
      mini.textContent = `עכשיו בליביניו: ${vStr} בכפר · ${sStr} בפסגה`;
    }
  }

  async function fetchLiveLivignoWeather(force = false): Promise<void> {
    if (APP.cspSafe || !weatherHub) return;
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(WX_CACHE_KEY) ?? 'null');
        if (cached && Date.now() - cached.ts < 2 * 3600 * 1000) {
          applyLiveWeatherDom(cached.vTemp, cached.wind, cached.wmo, cached.snow7d);
          return;
        }
      } catch {}
    }

    const lat = weatherHub.getAttribute('data-lat') ?? '46.5382';
    const lon = weatherHub.getAttribute('data-lon') ?? '10.1357';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=snowfall_sum&timezone=Europe%2FRome`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (res.ok) {
        const data = (await res.json()) as {
          current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number };
          daily?: { snowfall_sum?: number[] };
        };
        const vTemp = data.current?.temperature_2m;
        if (typeof vTemp === 'number') {
          const wind = data.current?.wind_speed_10m ?? 8;
          const wmo = data.current?.weather_code ?? 1;
          const snow7d = (data.daily?.snowfall_sum ?? []).reduce((a, b) => a + (b || 0), 0);
          try {
            localStorage.setItem(
              WX_CACHE_KEY,
              JSON.stringify({ vTemp, wind, wmo, snow7d, ts: Date.now() })
            );
          } catch {}
          applyLiveWeatherDom(vTemp, wind, wmo, snow7d);
        }
      }
    } catch {
      // Offline — keep February Livigno climate baseline silently
    } finally {
      clearTimeout(timer);
    }
  }

  document.getElementById('refreshWeatherBtn')?.addEventListener('click', () => {
    void fetchLiveLivignoWeather(true);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 14. GOOGLE SIGN-IN + CRYPTOGRAPHIC PBKDF2-HMAC-SHA256 FAMILY VAULT
  // ═════════════════════════════════════════════════════════════════════════
  // Pure-TS FIPS 180-4 SHA-256 + HMAC + PBKDF2 fallback (used when crypto.subtle is unavailable on file://)
  const K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  function sha256Pure(msg: Uint8Array): Uint8Array {
    const bitLen = msg.length * 8;
    const padLen = ((msg.length + 9 + 63) & ~63);
    const buf = new Uint8Array(padLen);
    buf.set(msg);
    buf[msg.length] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
    dv.setUint32(padLen - 4, bitLen >>> 0, false);

    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const w = new Uint32Array(64);

    for (let off = 0; off < padLen; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const v15 = w[i - 15]!, v2 = w[i - 2]!;
        const s0 = ((v15 >>> 7) | (v15 << 25)) ^ ((v15 >>> 18) | (v15 << 14)) ^ (v15 >>> 3);
        const s1 = ((v2 >>> 17) | (v2 << 15)) ^ ((v2 >>> 19) | (v2 << 13)) ^ (v2 >>> 10);
        w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K256[i]! + w[i]!) >>> 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => odv.setUint32(i * 4, v, false));
    return out;
  }

  function hmacSha256Pure(key: Uint8Array, data: Uint8Array): Uint8Array {
    const k = key.length > 64 ? sha256Pure(key) : key;
    const ipad = new Uint8Array(64);
    const opad = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      const kb = k[i] ?? 0;
      ipad[i] = kb ^ 0x36;
      opad[i] = kb ^ 0x5c;
    }
    const inner = new Uint8Array(64 + data.length);
    inner.set(ipad);
    inner.set(data, 64);
    const innerHash = sha256Pure(inner);
    const outer = new Uint8Array(64 + 32);
    outer.set(opad);
    outer.set(innerHash, 64);
    return sha256Pure(outer);
  }

  function pbkdf2Pure(password: Uint8Array, salt: Uint8Array, iterations: number, dkLen: number): Uint8Array {
    const blocks = Math.ceil(dkLen / 32);
    const out = new Uint8Array(blocks * 32);
    for (let b = 1; b <= blocks; b++) {
      const saltBlock = new Uint8Array(salt.length + 4);
      saltBlock.set(salt);
      new DataView(saltBlock.buffer).setUint32(salt.length, b, false);
      let u = hmacSha256Pure(password, saltBlock);
      const t = new Uint8Array(u);
      for (let i = 1; i < iterations; i++) {
        u = hmacSha256Pure(password, u);
        for (let j = 0; j < 32; j++) t[j]! ^= u[j]!;
      }
      out.set(t, (b - 1) * 32);
    }
    return out.subarray(0, dkLen);
  }

  function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function b64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function derive64Bytes(secretUtf8: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const enc = new TextEncoder().encode(secretUtf8);
    if (window.crypto && window.crypto.subtle) {
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        enc as BufferSource,
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const bits = await window.crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
        baseKey,
        512
      );
      return new Uint8Array(bits);
    }
    return pbkdf2Pure(enc, salt, iterations, 64);
  }

  async function decryptFamilyVault(
    bundle: EncryptedVaultBundle,
    rawEmail: string,
    rawPin: string
  ): Promise<VaultCard[]> {
    const normEmail = rawEmail.trim().toLowerCase();
    const emailHash = bytesToHex(sha256Pure(new TextEncoder().encode(normEmail)));
    if (!bundle.allowedEmailHashes.includes(emailHash)) {
      throw new Error('UNAUTHORIZED_EMAIL');
    }
    const slot = bundle.slots.find((s) => s.emailHashHex === emailHash);
    if (!slot) {
      throw new Error('GOOGLE_DRIVE_REQUIRED');
    }
    const salt = b64ToBytes(slot.saltB64);
    const iv = b64ToBytes(slot.ivB64);
    const ciphertext = b64ToBytes(slot.ciphertextB64);
    const expectedMac = b64ToBytes(slot.macB64);

    const derived = await derive64Bytes(`${normEmail}:${rawPin.trim()}`, salt, bundle.iterations);
    const encKey = derived.subarray(0, 32);
    const macKey = derived.subarray(32, 64);

    const macInput = new Uint8Array(salt.length + iv.length + ciphertext.length);
    macInput.set(salt, 0);
    macInput.set(iv, salt.length);
    macInput.set(ciphertext, salt.length + iv.length);
    const actualMac = hmacSha256Pure(macKey, macInput);

    let diff = actualMac.length ^ expectedMac.length;
    for (let i = 0; i < expectedMac.length; i++) {
      diff |= (actualMac[i] ?? 0) ^ expectedMac[i]!;
    }
    if (diff !== 0) {
      throw new Error('INVALID_PIN');
    }

    const plainBytes = new Uint8Array(ciphertext.length);
    const totalBlocks = Math.ceil(ciphertext.length / 32);
    for (let counter = 0; counter < totalBlocks; counter++) {
      const blockIn = new Uint8Array(iv.length + 4);
      blockIn.set(iv);
      new DataView(blockIn.buffer).setUint32(iv.length, counter, false);
      const ks = hmacSha256Pure(encKey, blockIn);
      const off = counter * 32;
      const len = Math.min(32, ciphertext.length - off);
      for (let i = 0; i < len; i++) {
        plainBytes[off + i] = ciphertext[off + i]! ^ ks[i]!;
      }
    }
    const parsed = JSON.parse(new TextDecoder().decode(plainBytes)) as { cards: VaultCard[] };
    return parsed.cards;
  }

  const vaultForm = document.getElementById('vaultUnlockForm') as HTMLFormElement | null;
  const vaultEmailInput = document.getElementById('vaultEmailInput') as HTMLInputElement | null;
  const vaultPinInput = document.getElementById('vaultPinInput') as HTMLInputElement | null;
  const vaultFeedback = document.getElementById('vaultFeedbackMsg');
  const vaultAllowedHint = document.getElementById('vaultAllowedHint');
  const vaultLockedView = document.getElementById('vaultLockedView');
  const vaultUnlockedView = document.getElementById('vaultUnlockedView');
  const vaultLockBtn = document.getElementById('vaultLockBtn');

  if (APP.vault && vaultAllowedHint) {
    vaultAllowedHint.textContent =
      `חשבונות Google מורשים כרגע בכספת: ${APP.vault.maskedEmails.join(' · ')} ` +
      `(ניתן להוסיף את שאר בני המשפחה ברשימת allowedEmails ב-data/trip.yaml).`;
  }

  // Optional Google Identity Services (Sign in with Google) when googleClientId is set on HTTPS
  if (
    APP.vault?.googleClientId &&
    !APP.cspSafe &&
    location.protocol === 'https:'
  ) {
    const gScript = document.createElement('script');
    gScript.src = 'https://accounts.google.com/gsi/client';
    gScript.async = true;
    gScript.defer = true;
    gScript.onload = () => {
      const g = (window as unknown as {
        google?: {
          accounts?: {
            id?: {
              initialize: (cfg: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
              renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
            };
          };
        };
      }).google;
      const slotEl = document.getElementById('googleSignInButtonSlot');
      if (!g?.accounts?.id || !slotEl) return;
      g.accounts.id.initialize({
        client_id: APP.vault!.googleClientId,
        callback: (resp) => {
          try {
            const payloadB64 = resp.credential.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
            if (!payloadB64) return;
            const claims = JSON.parse(atob(payloadB64)) as { email?: string; email_verified?: boolean };
            if (claims.email && claims.email_verified && vaultEmailInput) {
              vaultEmailInput.value = claims.email;
              vaultEmailInput.readOnly = true;
              const badge = document.getElementById('googleSignedInBadge');
              if (badge) {
                badge.textContent = `מחובר ב-Google כ-${claims.email} ✓`;
                badge.hidden = false;
              }
              vaultPinInput?.focus();
            }
          } catch {}
        },
      });
      g.accounts.id.renderButton(slotEl, { theme: 'outline', size: 'large', text: 'signin_with' });
    };
    document.head.appendChild(gScript);
  }

  function renderUnlockedVaultCards(cards: VaultCard[]): void {
    if (!vaultUnlockedView || !vaultLockedView) return;
    vaultUnlockedView.innerHTML = cards
      .map(
        (c) =>
          `<div class="vc-secret-card">` +
          `<span class="chip c-ac">${escHtml(c.categoryHe)}</span>` +
          `<h4>${escHtml(c.titleHe)}</h4>` +
          `<p class="muted" style="margin:0 0 8px;font-size:13px">${escHtml(c.subtitleHe)}</p>` +
          c.fields
            .map(
              (f) =>
                `<div class="vc-field-row">` +
                `<div><small class="muted" style="display:block;font-size:12px">${escHtml(f.labelHe)}</small>` +
                `<b class="mono ltr" style="font-size:14.5px">${escHtml(f.value)}</b></div>` +
                (f.copyable
                  ? `<button type="button" class="vc-copy-btn" data-vault-copy="${escHtml(f.value)}">העתק</button>`
                  : '') +
                `</div>`
            )
            .join('') +
          `</div>`
      )
      .join('');
    vaultLockedView.hidden = true;
    vaultUnlockedView.hidden = false;
    if (vaultLockBtn) vaultLockBtn.hidden = false;
  }

  vaultUnlockedView?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-vault-copy]');
    if (!btn) return;
    const val = btn.getAttribute('data-vault-copy') ?? '';
    if (copyTextSync(val)) {
      const prev = btn.textContent;
      btn.textContent = 'הועתק ✓';
      setTimeout(() => {
        btn.textContent = prev;
      }, 1800);
    }
  });

  vaultLockBtn?.addEventListener('click', () => {
    if (vaultUnlockedView) {
      vaultUnlockedView.innerHTML = '';
      vaultUnlockedView.hidden = true;
    }
    if (vaultLockedView) vaultLockedView.hidden = false;
    vaultLockBtn.hidden = true;
    if (vaultPinInput) vaultPinInput.value = '';
    if (vaultFeedback) {
      vaultFeedback.textContent = 'הכספת ננעלה והנתונים המפוענחים נוקו מהזיכרון.';
      vaultFeedback.className = 'vault-feedback';
    }
  });

  vaultForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!APP.vault || !vaultEmailInput || !vaultPinInput || !vaultFeedback) return;
    vaultFeedback.textContent = 'מאמת הרשאה ומפענח קריפטוגרפית…';
    vaultFeedback.className = 'vault-feedback';

    void decryptFamilyVault(APP.vault, vaultEmailInput.value, vaultPinInput.value)
      .then((cards) => {
        vaultFeedback.textContent = '';
        renderUnlockedVaultCards(cards);
      })
      .catch((err: unknown) => {
        const code = err instanceof Error ? err.message : '';
        vaultFeedback.className = 'vault-feedback is-err';
        if (code === 'UNAUTHORIZED_EMAIL') {
          vaultFeedback.textContent =
            'גישה נדחתה: כתובת ה-Google הזו אינה ברשימת בני המשפחה המורשים.';
        } else if (code === 'GOOGLE_DRIVE_REQUIRED') {
          vaultFeedback.textContent =
            'חשבון מורשה זוהה ✓ — במהדורת GitHub הציבורית קובץ הסודות מופרד פיזית (לטעינה מ-Google Drive הפרטי שלכם או בגרסת התיק האישית).';
        } else {
          vaultFeedback.textContent = 'קוד הכספת שגוי — אימות החתימה הקריפטוגרפי נכשל.';
        }
      });
  });

  void fetchLiveEuroRate(false);
  void fetchLiveLivignoWeather(false);
  renderLiveNowCard();
  setInterval(renderLiveNowCard, 60_000);
})();
