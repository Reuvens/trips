/**
 * SITE 2 (OPTION 2): Editorial Boutique Luxury Alpine Magazine (`livigno_editorial_magazine`)
 * Condé Nast Traveler / Monocle Winter Edition aesthetic with full-bleed Alpine photography,
 * editorial Hebrew serif typography, frosted-glass concierge bar, photo story spreads,
 * Google+PIN Encrypted Family Vault, and full shared data parity.
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

export function renderEditorialMagazineBody(
  vm: TripViewModel,
  options: { siblingAppHref?: string } = {}
): SafeHtml {
  const topOpenItems = vm.openItems.slice(0, 5);
  const switchHref = options.siblingAppHref ?? '../app/index.html';

  return html`
    <header class="mag-topbar">
      <div class="mag-topbar-inner">
        <div class="mag-brand-row">
          <a class="mag-brand" href="#top">ליביניו ’27</a>
          <a class="edition-switch-link mag-switch-pill" href="${switchHref}">
            אפליקציית שטח ↗
          </a>
        </div>

        <nav class="mag-chapters-nav mag-chapters-desktop" aria-label="פרקי המגזין">
          <a href="#now">01 המסלול</a>
          <a href="#live-weather">02 ההר והאוכל</a>
          <a href="#stay">03 הבקתות</a>
          <a href="#vault">04 כספת ואריזה</a>
          <a href="#budget">05 תזרים ומחקר</a>
        </nav>

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
            title="מצב בהיר / ערב בקתה כהה"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button
            type="button"
            class="iconbtn hide-xs"
            id="printBtn"
            aria-label="הדפסת המדריך"
            title="הדפסה / PDF"
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
            aria-label="חיפוש במגזין"
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
            placeholder="חיפוש במגזין — מסעדות, ספא, דירה, טיסה, ציוד, מחיר…"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="searchclose" id="searchCloseBtn">Esc</button>
        </div>
        <div class="searchresults" id="searchResults"></div>
      </div>
    </div>

    <main>
      <!-- ═══ CINEMATIC FULL-BLEED EDITORIAL COVER ═══ -->
      <section class="mag-cover" id="top" style="padding:0">
        <img
          class="mag-cover-img"
          src="${ALPINE_PHOTOS.heroValley}"
          alt="נוף פנורמי של עמק ליביניו המושלג, בקתות העץ והגונדולה העולה אל הפסגות הלבנות"
        />
        <div class="mag-cover-veil">
          <div class="mag-cover-inner">
            <span class="mag-kicker">מהדורת חורף אלפינית · ליביניו (<span class="ltr">${vm.decided.baseM.toLocaleString('en-US')}–${vm.decided.topM.toLocaleString('en-US')}m</span>) · <span class="ltr">${vm.dates.spanDmYear}</span></span>
            <h1>שבוע שלג בליביניו</h1>
            <p class="mag-sub">
              חמישה כרטיסים לעמק השמש הגבוה של לומברדיה: שישה ימי קורס וגלישה על פני 115 ק״מ של מסלולים,
              בריכות תרמיות חמות מול הפסגות, שדרת דיוטי-פרי איטלקית ואיחוד משפחתי כל צהריים על ההר.
            </p>

            <div class="mag-glass-ribbon">
              <div class="mag-ribbon-stat" id="countdownStamp" data-until="${vm.dates.departureEpochMs}" hidden>
                <span style="opacity:0.8">ספירה לאחור:</span>
                <b class="cd-n mono" style="margin-inline:4px;font-size:16px;color:#f4d39b"></b>
                <span>ימים להמראה (<span class="ltr">${vm.flights.out.dep}</span>)</span>
              </div>
              <div class="mag-ribbon-stat">
                <span style="opacity:0.8">גובה מרחב:</span>
                <b class="mono" style="margin-inline-start:4px">${vm.decided.baseM.toLocaleString('en-US')}–${vm.decided.topM.toLocaleString('en-US')} m</b>
              </div>
              <div class="mag-ribbon-stat">
                <span style="opacity:0.8">לינה סגורה:</span>
                <b style="margin-inline-start:4px">Casa Noemi + Calanda SOLE</b>
              </div>
              <a href="#vault" class="btn-action" style="min-height:36px;padding:6px 14px;font-size:13.5px">
                🔐 פתיחת כספת ההזמנות
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Non-sticky chapter strip on mobile so topbar stays ultra-slim -->
      <nav class="mag-chapters-mobile wrap narrow" aria-label="קפיצה לפרקי המגזין">
        <a class="edition-switch-link mag-switch-mobile" href="${switchHref}">לאפליקציית השטח בנייד ↗</a>
        <a href="#now">01 המסלול</a>
        <a href="#live-weather">02 ההר והאוכל</a>
        <a href="#stay">03 הבקתות</a>
        <a href="#vault">04 כספת ואריזה</a>
        <a href="#budget">05 תזרים ומחקר</a>
      </nav>

      <!-- ═══ CHAPTER 01: THE JOURNEY & RHYTHM OF THE DAYS ═══ -->
      <div class="mag-chapter-header">
        <span class="mag-chapter-num">פרק 01 · המסע וקצב הימים</span>
        <h2 class="mag-chapter-title">המסע וקצב הימים בעמק</h2>
        <p class="muted" style="margin:0;font-size:16px">בחרו בן משפחה להדגשה אישית, או דפדפו בין ימי החופשה ולוח הזמנים החי</p>
      </div>

      <section id="now" style="padding-top:8px">
        <div class="wrap narrow">
          ${renderFamilyAvatarBar(vm)}
          ${renderSnowModeQuickCockpit(vm)}

          <div class="timetravel-bar" id="timeTravelBar">
            <div class="tt-head">
              <span>קונסיירז׳ זמן אמת ("עכשיו בליביניו"):</span>
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

          ${renderDayByDayInteractiveDeck(vm)}

          <div class="signs" id="signs" style="margin-top:20px">
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
              <span>שולחן העבודה לפני הטיסה</span>
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
      ${renderPartySection(vm)}

      <!-- ═══ CHAPTER 02: MOUNTAIN, WELLNESS & GASTRONOMY ═══ -->
      <div class="mag-chapter-header">
        <span class="mag-chapter-num">פרק 02 · פסגות, ספא וקולינריה</span>
        <h2 class="mag-chapter-title">שני רכסי שלג, ספא תרמי וקולינריה אלפינית</h2>
        <p class="muted" style="margin:0;font-size:16px">איך משלבים גלישה חזקה, קורס מתחילות רגוע ושבוע ספא מושלם לאורית — ונפגשים כל צהריים</p>
      </div>

      <section style="padding-top:10px;padding-bottom:0">
        <div class="wrap">
          ${renderLiveWeatherAndWebcams(vm)}

          <div class="photo-feature-split">
            <img
              src="${ALPINE_PHOTOS.aquagrandaSpa}"
              alt="בריכת האינסוף החמה של Aquagranda מוקפת שלג מול פסגות האלפים האיטלקיים"
              loading="lazy"
            />
            <div class="photo-feature-copy">
              <span class="chip c-ac">המגזין של אורית · Dolce Vita בשלג</span>
              <h3 style="font-size:24px;font-weight:800;margin:8px 0 8px">6 ימים מלאים בליביניו בלי לנעול מגלשיים</h3>
              <p style="margin:0;color:var(--ink-2);font-size:15.5px">
                מתחם הספא האלפיני <b>Aquagranda</b> (מהגדולים באירופה), טיילת שמש כבושה לאורך הנהר עד המחלבה המקומית,
                עלייה יבשה בגונדולות פנורמיות למסעדות הפסגה ויותר מ-250 חנויות פטורות ממכס מתחת לדירה.
              </p>
            </div>
          </div>

          ${renderLunchMeetupsBridge(vm)}
          ${renderCulinaryAndDutyFreeGuide(vm)}
        </div>
      </section>

      ${renderLivignoMapSection(vm)}
      ${renderLivignoSection(vm)}

      <!-- ═══ CHAPTER 03: THE CHALETS & ARRIVAL ═══ -->
      <div class="mag-chapter-header">
        <span class="mag-chapter-num">פרק 03 · הבקתות וההגעה לעמק</span>
        <h2 class="mag-chapter-title">הבקתות שלנו בעמק והדרך ממילאנו</h2>
      </div>

      <section style="padding-top:8px;padding-bottom:0">
        <div class="wrap">
          <div class="photo-feature-split">
            <img
              src="${ALPINE_PHOTOS.chaletWarmth}"
              alt="עיצוב פנים חמים של דירת בקתת עץ בליביניו מול שקיעה ורודה על הפסגות המושלגות"
              loading="lazy"
            />
            <div class="photo-feature-copy">
              <span class="chip c-ok">8 לילות סגורים בתוך ליביניו</span>
              <h3 style="font-size:24px;font-weight:800;margin:8px 0 8px">לילה ראשון ב-Casa Noemi ושבוע מלא ב-Calanda SOLE</h3>
              <p style="margin:0;color:var(--ink-2);font-size:15.5px">
                הגעה כבר ביום שישי לתוך העמק חוסכת את כל פקקי השבת של האלפים ומאפשרת לפתוח את שבת הראשונה על השלג ממש מתחת לבית ב-<span class="ltr">${vm.apartment.address}</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      ${renderStaySection(vm)}
      ${renderGettingSection(vm)}

      <!-- ═══ CHAPTER 04: VAULT, FLIGHTS, PACKING & FIELD KIT ═══ -->
      <div class="mag-chapter-header">
        <span class="mag-chapter-num">פרק 04 · כספת, טיסות, אריזה ובטיחות</span>
        <h2 class="mag-chapter-title">כספת המשפחה, הטיסות, האריזה וערכת השטח</h2>
      </div>

      <section style="padding-top:10px;padding-bottom:0">
        <div class="wrap">
          ${renderFamilyVaultSection()}
          ${renderEmergencyAndPhrasebook(vm)}
        </div>
      </section>

      ${renderFlightsSection(vm)}

      <section style="padding-top:0;padding-bottom:0">
        <div class="wrap narrow">
          ${renderInteractivePackingChecklist(vm)}
        </div>
      </section>

      ${renderTodosSection(vm)}

      <!-- ═══ CHAPTER 05: BUDGET, CASHFLOW, SIMULATOR & ARCHIVE ═══ -->
      <div class="mag-chapter-header">
        <span class="mag-chapter-num">פרק 05 · תזרים יורו חי וארכיון מחקר</span>
        <h2 class="mag-chapter-title">המחירון החי, סימולטור ההחלטות וארכיון ההשוואה</h2>
      </div>

      ${renderBudgetSection(vm)}
      ${renderAlternativesAndFooter(vm)}
    </main>
  `;
}
