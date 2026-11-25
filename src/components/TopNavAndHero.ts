import type { TripViewModel } from '../domain/deriveTrip.js';
import { html, type SafeHtml } from '../domain/format.js';

export function renderTopNav(vm: TripViewModel): SafeHtml {
  return html`
    <div class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="#top">ליביניו</a>
        <nav class="navlinks" aria-label="ניווט ראשי בדף">
          <a href="#now">עכשיו</a>
          <a href="#map">מפת הכפר</a>
          <a href="#week">השבוע</a>
          <a href="#who">מי נוסע</a>
          <a href="#stay">איפה ישנים</a>
          <a href="#getting">להגיע</a>
          <a href="#r-livigno">ליביניו</a>
          <a href="#budget">המחירון</a>
          <a href="#todo">משימות</a>
          <a href="#trip">טיסות</a>
          <a href="#alternatives">חלופות</a>
        </nav>
        <div class="topbar-actions">
          <button
            type="button"
            class="fx-pill"
            id="fxRateBtn"
            title="שער היורו מתעדכן אוטומטית מהבנק המרכזי האירופי (ECB) — לחץ לרענון מיידי"
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
            title="מצב תצוגה: בהיר / כהה"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button
            type="button"
            class="iconbtn"
            id="printBtn"
            aria-label="הדפסת דף כיס לתיק"
            title="הדפסת דף כיס / שמירה כ-PDF"
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
            aria-label="חיפוש בדף"
            title="חיפוש בכל הדף (Ctrl+K או /)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

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
            placeholder="חיפוש מהיר — דירה, טיסה, בית ספר, מסעדה, מחיר…"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="searchclose" id="searchCloseBtn">Esc</button>
        </div>
        <div class="searchresults" id="searchResults"></div>
      </div>
    </div>
  `;
}

export function renderMountainHeroSvg(vm: TripViewModel): SafeHtml {
  const top = vm.decided.topM.toLocaleString('en-US');
  const base = vm.decided.baseM.toLocaleString('en-US');
  return html`
    <svg
      class="mountain"
      viewBox="0 0 390 270"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="הר ליביניו מהכפר בגובה ${base} מטר עד הפסגה ב-${top} מטר עם פיסטה כחולה, אדומה ושחורה ורכבל"
    >
      <rect class="m-sky" x="0" y="0" width="390" height="270" />
      <circle class="m-sun" cx="326" cy="48" r="22" />
      <polygon class="m-far" points="0,136 42,102 82,124 132,76 172,110 218,66 262,104 302,82 346,120 390,96 390,270 0,270" />
      <polygon class="m-snow" points="0,210 50,174 96,188 150,110 185,54 205,38 236,78 270,118 310,146 350,170 390,160 390,270 0,270" />
      <polygon class="m-shade" points="205,38 236,78 226,138 198,100" />
      <polygon class="m-shade2" points="150,110 185,54 176,116 160,152" />
      <path class="m-contour" d="M30 226 Q110 200 190 220 T390 212" />
      <path class="m-contour" d="M60 202 Q130 176 200 194 T370 188" />
      <path class="m-contour" d="M110 168 Q160 144 215 160 T330 158" />
      <path class="m-run blue" d="M200 52 C 172 98, 150 136, 122 180 S 92 226, 72 256" />
      <path class="m-run red" d="M207 54 C 216 98, 190 144, 210 190 S 232 232, 216 258" />
      <path class="m-run black" d="M212 50 C 250 90, 268 136, 288 180 S 306 226, 318 256" />
      <line class="m-cable" x1="358" y1="254" x2="205" y2="38" />
      <line class="m-pylon" x1="307" y1="182" x2="307" y2="200" />
      <line class="m-pylon" x1="256" y1="110" x2="256" y2="128" />
      <line class="m-cable" x1="281" y1="146" x2="281" y2="154" />
      <rect class="m-cabin" x="272" y="154" width="18" height="14" rx="2" />
      <polygon class="m-tree" points="20,258 30,236 40,258" />
      <polygon class="m-tree" points="38,260 47,242 56,260" />
      <polygon class="m-tree" points="336,260 345,240 354,260" />
      <polygon class="m-tree" points="366,260 374,244 382,260" />
      <rect class="m-ground" x="0" y="258" width="390" height="12" />
      <line class="m-cable" x1="205" y1="38" x2="205" y2="20" />
      <text class="m-alt top" x="199" y="17" text-anchor="end">${top} m</text>
      <text class="m-alt" x="102" y="252">${base} m</text>
    </svg>
  `;
}

export function renderHeroAndNow(vm: TripViewModel): SafeHtml {
  const topOpenItems = vm.openItems.slice(0, 5);

  return html`
    <header class="hero" id="top">
      <div class="hero-text">
        <div class="hero-eyebrow">
          <span class="mono">${vm.dates.spanDmYear}</span>
          <span>${vm.party.peopleHe} נוסעים · אל על למילאנו מלפנסה</span>
        </div>
        <h1>
          <span class="pre">שבוע סקי משפחתי</span>
          <span class="big">ליביניו</span>
        </h1>
        <p class="lede">${vm.heroLedeHe}</p>
        <div class="hero-badges">
          <div class="stamp" id="countdownStamp" data-until="${vm.dates.departureEpochMs}" hidden>
            <b class="cd-n mono"></b>
            <span>ימים עד ההמראה · ${vm.dates.startLongHe} ב-${vm.flights.out.dep}</span>
          </div>
        </div>
      </div>
      <div class="hero-map">
        ${renderMountainHeroSvg(vm)}
      </div>
    </header>

    <section id="now">
      <div class="wrap narrow">
        <div class="timetravel-bar" id="timeTravelBar">
          <div class="tt-head">
            <span>מצב שטח ("עכשיו על ההר") — בדוק איך הדף מתנהג בכל רגע בטיול:</span>
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

        <h2 class="t">שלטי הדרך</h2>
        <p class="sub">
          ירוק אורן — הוזמן וסגור. צהוב גונדולה — נשאר להזמין (רובם עם ביטול חינם). השלטים מסונכרנים
          אוטומטית גם עם סימון המשימות שלך בדף.
        </p>

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
            <span>מה עושים עכשיו — לפי סדר הדחיפות האמיתי</span>
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
          <p class="muted" style="margin:10px 0 0;font-size:14.5px">
            לרשימה המלאה ולסימון ביצוע — <a href="#todo">כל ${vm.counts.openTotal} המשימות הפתוחות</a>.
          </p>
        </div>
      </div>
    </section>
  `;
}
