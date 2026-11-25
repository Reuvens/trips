/**
 * SITE 1 (OPTION 1): Mobile-First Family Ski Companion App (`livigno_companion_app`)
 * Native-feeling 5-tab thumb navigation, Family Avatar Personalizer, Snow Quick Cockpit,
 * Live Weather/Webcams, Encrypted Google+PIN Vault, Packing Studio, and Live Euro Cashflow.
 */
import { ALPINE_PHOTOS } from '../assets/alpinePhotos.js';
import type { TripViewModel } from '../domain/deriveTrip.js';
import { html, type SafeHtml } from '../domain/format.js';
import { renderLivignoMapSection, renderPartySection, renderWeekSection } from '../components/MapAndWeek.js';
import { renderGettingSection, renderStaySection } from '../components/StayAndGetting.js';
import { renderBudgetSection, renderLivignoSection } from '../components/LivignoAndBudget.js';
import {
  renderAlternativesAndFooter,
  renderFlightsSection,
  renderTodosSection,
} from '../components/TodosFlightsAlternatives.js';
import {
  renderCulinaryAndDutyFreeGuide,
  renderDayByDayInteractiveDeck,
  renderEmergencyAndPhrasebook,
  renderFamilyAvatarBar,
  renderFamilyVaultSection,
  renderInteractivePackingChecklist,
  renderLiveWeatherAndWebcams,
  renderLunchMeetupsBridge,
  renderSnowModeQuickCockpit,
} from '../components/UpgradeWidgets.js';

export function renderCompanionAppBody(
  vm: TripViewModel,
  options: { siblingMagazineHref?: string } = {}
): SafeHtml {
  const topOpenItems = vm.openItems.slice(0, 5);
  const switchHref = options.siblingMagazineHref ?? '../magazine/index.html';

  return html`
    <header class="app-shell-header" id="top">
      <div class="app-header-top">
        <a class="app-logo" href="#top">ליביניו ’27</a>

        <div class="topbar-actions">
          <button
            type="button"
            class="fx-pill"
            id="fxRateBtn"
            title="שער היורו מתעדכן אוטומטית מהבנק המרכזי האירופי (ECB) — לחץ לרענון"
            aria-label="שער יורו-שקל חי — לחץ לרענון"
          >
            <span class="fx-dot" id="fxDot"></span>
            <span class="mono" id="fxRateText">€1 = ₪${vm.rates.eurIlsDisplay}</span>
            <span class="fx-label-long muted" id="fxStatusLabel">(${vm.rates.checkedDm})</span>
          </button>
          <button
            type="button"
            class="iconbtn"
            id="themeToggle"
            aria-label="החלפת מצב תצוגה בהיר או כהה"
            aria-pressed="false"
            title="מצב בהיר / כהה"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button
            type="button"
            class="iconbtn hide-xs"
            id="printBtn"
            aria-label="הדפסת דף כיס"
            title="הדפסה / שמירה כ-PDF"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
          </button>
          <button
            type="button"
            class="iconbtn"
            id="searchBtn"
            aria-label="חיפוש בכל האפליקציה"
            title="חיפוש מהיר (Ctrl+K או /)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="searchlayer" id="searchLayer" hidden>
      <div class="searchbox" role="dialog" aria-modal="true" aria-label="חיפוש בדף">
        <div class="searchtop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="search"
            id="searchInput"
            placeholder="חיפוש מהיר בכל הלשוניות — דירה, טיסה, מסעדה, אריזה, מחיר…"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="searchclose" id="searchCloseBtn">Esc</button>
        </div>
        <div class="searchresults" id="searchResults"></div>
      </div>
    </div>

    <main id="appMain">
      <!-- Scrollable (NON-sticky!) top bar: edition switch, countdown, and family personalizer -->
      <div class="app-scroll-intro">
        <div class="app-subbar">
          <span class="chip c-ac" id="countdownStamp" data-until="${vm.dates.departureEpochMs}" hidden>
            עוד <b class="cd-n mono"></b> ימים להמראה
          </span>
          <a class="edition-switch-link" href="${switchHref}">מהדורת מגזין אלפיני ✦</a>
        </div>
        ${renderFamilyAvatarBar(vm)}
      </div>

      <!-- ═══ TAB 1: TODAY & ITINERARY (היום והמסלול) ═══ -->
      <div class="app-tab-pane is-active" data-app-pane="today">
        <div class="app-hero-card">
          <div class="app-hero-inner">
            <img
              src="${ALPINE_PHOTOS.heroValley}"
              alt="עמק ליביניו המושלג בבוקר שמש אלפיני עם בקתות עץ וגונדולה לפסגות"
            />
            <div class="app-hero-overlay">
              <span class="app-hero-kicker">
                ${vm.party.peopleHe} בני משפחה · ליביניו, איטליה · <span class="ltr">${vm.dates.spanDmYear}</span>
              </span>
              <h1>החופשה המשפחתית בליביניו</h1>
              <p>${vm.heroLedeHe}</p>
            </div>
          </div>
        </div>

        <section id="now">
          <div class="wrap narrow">
            ${renderSnowModeQuickCockpit(vm)}

            <div class="timetravel-bar" id="timeTravelBar">
              <div class="tt-head">
                <span>מצב שטח חי ("עכשיו על ההר"):</span>
                <span class="mono" id="activeClockLabel"></span>
              </div>
              <div class="tt-buttons">
                ${vm.timeline.presets.map(
                  (p, i) => html`
                    <button
                      type="button"
                      class="tt-btn${i === 0 ? ' is-active' : ''}"
                      data-preset="${p.id}"
                      data-now="${p.isoParam}"
                      aria-pressed="${i === 0 ? 'true' : 'false'}"
                      title="${p.descriptionHe}"
                    >
                      ${p.labelHe}
                    </button>
                  `
                )}
              </div>
            </div>

            <div class="nowcard" id="nowcard" data-phase="before">
              <p class="muted" style="margin:0">טוען את לוח הזמנים החי…</p>
            </div>

            <h2 class="t">התוכנית היומית — מותאמת לכל אחד במשפחה</h2>
            <p class="sub">
              דפדפו בין שלבי השבוע כדי לראות במקביל את המסלול של ראובן, הקורס של הבנות, היום של אורית ונקודת המפגש המשותפת.
            </p>
            ${renderDayByDayInteractiveDeck(vm)}

            <h2 class="t">שלטי הדרך והצעד הבא</h2>
            <div class="signs" id="signs">
              ${vm.signs.map(
                (s) => html`
                  <a
                    class="sign ${s.done ? 'done' : 'open'}"
                    href="${s.href}"
                    data-sign-id="${s.id}"
                    data-linked-tasks="${s.linkedTaskIds.join(',')}"
                    data-default-done="${s.done ? '1' : '0'}"
                    data-default-status="${s.statusHe}"
                  >
                    <b>${s.labelHe}</b>
                    <span class="sign-status">${s.statusHe}</span>
                  </a>
                `
              )}
            </div>

            <div class="priority-box" id="priorityBox">
              <h4>
                <span>מה פתוח עכשיו לפי דחיפות</span>
                <span class="chip c-ac" id="openRemainingBadge">${vm.counts.openTotal} משימות פתוחות</span>
              </h4>
              <ol class="priority-steps" id="liveNextSteps">
                ${topOpenItems.map(
                  (it) => html`
                    <li data-priority-item="${it.id}">
                      <b>${it.titleHe}</b>${it.deadlineDm ? html` <span class="mono muted">(יעד ${it.deadlineDm})</span>` : ''} —
                      <a href="${it.targetAnchor}">לפרק הרלוונטי</a>
                    </li>
                  `
                )}
              </ol>
            </div>
          </div>
        </section>

        ${renderWeekSection(vm)}
      </div>

      <!-- ═══ TAB 2: LIVIGNO, MAP, WEATHER, MEETUPS & DINING (ליביניו והמפה) ═══ -->
      <div class="app-tab-pane" data-app-pane="village">
        <section style="padding-bottom:0">
          <div class="wrap">
            ${renderLiveWeatherAndWebcams(vm)}
            ${renderLunchMeetupsBridge(vm)}

            <div class="photo-feature-split">
              <img
                src="${ALPINE_PHOTOS.aquagrandaSpa}"
                alt="בריכת האינסוף התרמית החמה של Aquagranda בליביניו מוקפת שלג מול הרי האלפים"
                loading="lazy"
              />
              <div class="photo-feature-copy">
                <span class="chip c-ac">החופשה של אורית · Wellness & Village</span>
                <h3 style="font-size:22px;font-weight:800;margin:8px 0 6px">Aquagranda, גונדולות פנורמיות ומדרחוב פטור ממכס</h3>
                <p style="margin:0;color:var(--ink-2);font-size:15px">
                  בריכות חמות תחת כיפת השמיים ב-36°C מול הפסגות המושלגות, שביל הליכה מישורי לאורך הנהר עד המחלבה
                  ומפגש צהריים יומי עם המשפחה בלי לנעול מגלשיים.
                </p>
              </div>
            </div>
          </div>
        </section>

        ${renderLivignoMapSection(vm)}
        ${renderLivignoSection(vm)}

        <section style="padding-top:0">
          <div class="wrap">
            ${renderCulinaryAndDutyFreeGuide(vm)}
          </div>
        </section>
      </div>

      <!-- ═══ TAB 3: WALLET, VAULT, CHALETS, FLIGHTS & EMERGENCY (התיק והכספת) ═══ -->
      <div class="app-tab-pane" data-app-pane="wallet">
        <section style="padding-bottom:0">
          <div class="wrap">
            ${renderFamilyVaultSection()}

            <div class="photo-feature-split">
              <img
                src="${ALPINE_PHOTOS.chaletWarmth}"
                alt="סלון עץ אלפיני חמים בדירה בליביניו מול חלון פנורמי של פסגות מושלגות בשקיעה"
                loading="lazy"
              />
              <div class="photo-feature-copy">
                <span class="chip c-ok">2 הזמנות לינה מאומתות</span>
                <h3 style="font-size:22px;font-weight:800;margin:8px 0 6px">הבית שלכם בעמק ליביניו (8 לילות)</h3>
                <p style="margin:0;color:var(--ink-2);font-size:15px">
                  ליל שישי ב-<b>Casa Noemi</b> בתוך הכפר + שבוע שלם בדירת <b>Appartamenti Calanda — SOLE</b> במדרחוב הראשי
                  צמוד לחנות הציוד ולבית הספר לסקי.
                </p>
              </div>
            </div>
          </div>
        </section>

        ${renderStaySection(vm)}
        ${renderFlightsSection(vm)}
        ${renderGettingSection(vm)}

        <section style="padding-top:0">
          <div class="wrap">
            <h2 class="t">קווי אוטובוס חינמיים, מספרי חירום ושיחון איטלקית</h2>
            ${renderEmergencyAndPhrasebook(vm)}
          </div>
        </section>
      </div>

      <!-- ═══ TAB 4: PACKING, TASKS & FAMILY CARDS (הכנות וציוד) ═══ -->
      <div class="app-tab-pane" data-app-pane="prep">
        <section style="padding-bottom:0">
          <div class="wrap narrow">
            ${renderInteractivePackingChecklist(vm)}
          </div>
        </section>
        ${renderTodosSection(vm)}
        ${renderPartySection(vm)}
      </div>

      <!-- ═══ TAB 5: LIVE EURO BUDGET, SIMULATOR & RESEARCH (תקציב והחלטות) ═══ -->
      <div class="app-tab-pane" data-app-pane="budget">
        ${renderBudgetSection(vm)}
        ${renderAlternativesAndFooter(vm)}
      </div>
    </main>

    <!-- Fixed Thumb-Friendly Bottom Navigation Dock -->
    <nav class="app-bottom-dock" aria-label="ניווט לשוניות ראשי באפליקציה">
      <div class="app-dock-inner">
        <button type="button" class="app-dock-btn is-active" data-app-tab="today" aria-pressed="true">
          <span class="dock-ico" aria-hidden="true">🗓️</span>
          <span>היום והמסלול</span>
        </button>
        <button type="button" class="app-dock-btn" data-app-tab="village" aria-pressed="false">
          <span class="dock-ico" aria-hidden="true">🏔️</span>
          <span>ליביניו והמפה</span>
        </button>
        <button type="button" class="app-dock-btn" data-app-tab="wallet" aria-pressed="false">
          <span class="dock-ico" aria-hidden="true">🔐</span>
          <span>התיק והכספת</span>
        </button>
        <button type="button" class="app-dock-btn" data-app-tab="prep" aria-pressed="false">
          <span class="dock-ico" aria-hidden="true">🎒</span>
          <span>אריזה ומשימות</span>
        </button>
        <button type="button" class="app-dock-btn" data-app-tab="budget" aria-pressed="false">
          <span class="dock-ico" aria-hidden="true">💶</span>
          <span>תקציב והחלטות</span>
        </button>
      </div>
    </nav>
  `;
}
