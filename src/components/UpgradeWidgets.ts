import { ALPINE_PHOTOS } from '../assets/alpinePhotos.js';
import type { TripViewModel } from '../domain/deriveTrip.js';
import { html, type SafeHtml } from '../domain/format.js';

export function renderSnowModeQuickCockpit(vm: TripViewModel): SafeHtml {
  return html`
    <div class="snow-cockpit" id="snowCockpit" aria-label="כפתורי שטח מהירים">
      <a class="sc-tile" href="#live-weather" data-jump-target="live-weather">
        <span class="sc-icon" aria-hidden="true">❄️</span>
        <b>שלג ומצלמות</b>
        <small id="scWeatherMini"><span class="ltr">${vm.liveMountain.febBaselineVillageC}°C</span> בכפר · ${vm.liveMountain.febSnowBaseCm} ס״מ שלג</small>
      </a>
      <a class="sc-tile" href="${vm.apartment.mapUrl}" target="_blank" rel="noopener">
        <span class="sc-icon" aria-hidden="true">🧭</span>
        <b>ניווט ל-Calanda</b>
        <small>${vm.apartment.address}</small>
      </a>
      <a class="sc-tile sc-vault-trigger" href="#vault" data-jump-target="vault">
        <span class="sc-icon" aria-hidden="true">🔐</span>
        <b>כספת ההזמנות</b>
        <small>קודי PNR ו-PIN למשפחה</small>
      </a>
      <a class="sc-tile" href="${vm.apartment.whatsappUrl}" target="_blank" rel="noopener">
        <span class="sc-icon" aria-hidden="true">💬</span>
        <b>WhatsApp ל-${vm.apartment.hostName}</b>
        <small>תיאום מזוודות וצ׳ק-אין</small>
      </a>
    </div>
  `;
}

export function renderFamilyAvatarBar(vm: TripViewModel): SafeHtml {
  return html`
    <div class="avatar-strip" id="topAvatarStrip" role="group" aria-label="תצוגה אישית לפי בן משפחה">
      <button
        type="button"
        class="avatar-pill is-active"
        data-member-filter="all"
        aria-pressed="true"
      >
        <span class="av-circle av-all">5</span>
        <span>כל המשפחה</span>
      </button>
      ${vm.party.members.map((m) => {
        const initial = m.nameHe.slice(0, 1);
        return html`
          <button
            type="button"
            class="avatar-pill"
            data-member-filter="${m.id}"
            aria-pressed="false"
          >
            <span class="av-circle av-${m.grade}">${initial}</span>
            <span>${m.nameHe}</span>
          </button>
        `;
      })}
    </div>
    <div class="member-spotlight" id="memberSpotlight" hidden></div>
  `;
}

export function renderLiveWeatherAndWebcams(vm: TripViewModel): SafeHtml {
  const lm = vm.liveMountain;
  return html`
    <div class="weather-hub" id="live-weather" data-lat="${lm.latitude}" data-lon="${lm.longitude}">
      <div class="wh-top">
        <div>
          <span class="chip c-ac" id="weatherLiveBadge">ממוצע סוף פברואר · מתעדכן חי מליביניו</span>
          <h3 style="font-size:21px;font-weight:800;margin:6px 0 2px">מזג אוויר, שלג ומצלמות חיות בעמק</h3>
          <p class="muted" style="margin:0;font-size:14.5px">
            נתונים חיים מליביניו (<span class="mono">${vm.decided.baseM.toLocaleString('en-US')}m–${vm.decided.topM.toLocaleString('en-US')}m</span>) ומצלמות שידור ישיר משני הרכסים
          </p>
        </div>
        <button type="button" class="btn-action secondary" id="refreshWeatherBtn" style="min-height:36px;font-size:13.5px">
          רענון תחזית ↻
        </button>
      </div>

      <div class="wh-metrics">
        <div class="wh-metric">
          <span>בכפר (${vm.decided.baseM.toLocaleString('en-US')}m)</span>
          <b class="mono" id="wxVillageTemp">${lm.febBaselineVillageC}°C</b>
          <small id="wxVillageSub">ממוצע פברואר בצהריים</small>
        </div>
        <div class="wh-metric">
          <span>בפסגות (${vm.decided.topM.toLocaleString('en-US')}m)</span>
          <b class="mono" id="wxSummitTemp">${lm.febBaselineSummitC}°C</b>
          <small id="wxSummitSub">שלג יבש ואיכותי</small>
        </div>
        <div class="wh-metric">
          <span>בסיס שלג אופייני</span>
          <b class="mono" id="wxSnowDepth">${lm.febSnowBaseCm} cm</b>
          <small id="wxSnowSub">שיא העונה האלפינית</small>
        </div>
        <div class="wh-metric">
          <span>רוח ותחושה</span>
          <b class="mono" id="wxWind">מתונה</b>
          <small id="wxConditionLabel">בהיר–מעונן חלקית</small>
        </div>
      </div>

      <div class="webcam-grid">
        ${lm.webcams.map(
          (cam) => html`
            <a class="webcam-card" href="${cam.url}" target="_blank" rel="noopener">
              <div>
                <b>📹 ${cam.labelHe}</b>
                <span>${cam.subHe}</span>
              </div>
              <span class="mono" style="font-size:13px;font-weight:700">שידור חי ↗</span>
            </a>
          `
        )}
      </div>
    </div>
  `;
}

export function renderDayByDayInteractiveDeck(vm: TripViewModel): SafeHtml {
  return html`
    <div class="day-deck" id="dayDeck">
      <div class="day-tabs" role="tablist" aria-label="בחירת יום במסלול החופשה">
        ${vm.dailyPlanCards.map(
          (d, idx) => html`
            <button
              type="button"
              class="day-tab${idx === 0 ? ' is-active' : ''}"
              role="tab"
              aria-selected="${idx === 0 ? 'true' : 'false'}"
              data-day-tab="${d.id}"
            >
              <span class="mono day-badge">${d.dateBadgeHe}</span>
              <b>${d.tabLabelHe}</b>
            </button>
          `
        )}
      </div>

      <div class="day-panels">
        ${vm.dailyPlanCards.map(
          (d, idx) => html`
            <article
              class="day-panel${idx === 0 ? ' is-active' : ''}"
              data-day-panel="${d.id}"
              ${idx === 0 ? '' : html`hidden`}
            >
              <div class="dp-head">
                <span class="chip c-ac mono">${d.dateBadgeHe}</span>
                <h3>${d.titleHe}</h3>
                <p>${d.summaryHe}</p>
              </div>
              <div class="dp-tracks">
                <div class="dp-track t-reuven" data-track-who="reuven">
                  <div class="dp-track-tag">⛷️ ראובן (גולש מתקדם)</div>
                  <p>${d.reuvenTrackHe}</p>
                </div>
                <div class="dp-track t-girls" data-track-who="mika,nitzan,gali">
                  <div class="dp-track-tag">🎿 מיקה, ניצן וגלי (קורס וגלישה)</div>
                  <p>${d.girlsTrackHe}</p>
                </div>
                <div class="dp-track t-orit" data-track-who="orit">
                  <div class="dp-track-tag">🧖‍♀️ אורית (ספא, כפר ונוף)</div>
                  <p>${d.oritTrackHe}</p>
                </div>
              </div>
              <div class="dp-meetup">
                <b>🤝 איפה נפגשים כולם:</b> <span>${d.meetupHe}</span>
              </div>
            </article>
          `
        )}
      </div>
    </div>
  `;
}

export function renderLunchMeetupsBridge(vm: TripViewModel): SafeHtml {
  return html`
    <div class="meetup-showcase" id="lunch-meetups">
      <div class="ms-banner">
        <img
          src="${ALPINE_PHOTOS.alpineDining}"
          alt="מרפסת מסעדת הרים שטופת שמש בליביניו עם פיצוקרי, ברזאולה ואספרסו מול הפסגות"
          loading="lazy"
        />
        <div class="ms-banner-copy">
          <span class="chip c-ok">הגשר היומי בין הגולשים לאורית</span>
          <h3>איפה נפגשים בצהריים? 4 מקומות שמתאימים גם למגלשיים וגם להליכה רגלית</h3>
          <p>
            בליביניו לא צריך להיפרד ליום שלם: הקורס של הבנות מסתיים בדיוק ב-13:00 במרכז העמק,
            ואורית יכולה להצטרף ברגל או בגונדולה סגורה בלי ציוד סקי.
          </p>
        </div>
      </div>

      <div class="meetup-grid">
        ${vm.lunchMeetups.map(
          (m) => html`
            <div class="meetup-card">
              <div class="mc-head">
                <div>
                  <h4>${m.nameHe}</h4>
                  <span class="mono muted" style="font-size:12.5px">${m.nameEn}</span>
                </div>
                <span class="chip c-ac">${m.bestTimeHe}</span>
              </div>
              <div class="mc-split">
                <div><b>⛷️ לגולשים:</b> ${m.forSkierHe}</div>
                <div><b>🚶‍♀️ לאורית:</b> ${m.forOritHe}</div>
                <div><b>🍝 מה מזמינים:</b> ${m.dishTipHe}</div>
              </div>
              <div class="links" style="margin-top:auto;padding-top:8px">
                <a class="glink" href="${m.mapUrl}" target="_blank" rel="noopener">ניווט ב-Google Maps</a>
                ${m.url ? html`<a class="glink" href="${m.url}" target="_blank" rel="noopener">אתר המקום</a>` : ''}
              </div>
            </div>
          `
        )}
      </div>
    </div>
  `;
}

export function renderCulinaryAndDutyFreeGuide(vm: TripViewModel): SafeHtml {
  return html`
    <div class="culinary-block" id="culinary-guide">
      <div class="cb-head">
        <div>
          <h3 class="t" style="margin-top:0">מסעדות, אפרה-סקי ושדרת הדיוטי-פרי</h3>
          <p class="muted" style="margin:0;font-size:15px">
            המלצות ממוקדות למשפחה של חמישה: איפה חובה להזמין שולחן מראש, איפה עוצרים לקרפ ושוקו חם ואיפה קונים בלי מע״מ.
          </p>
        </div>
        <div class="cb-filters" role="group" aria-label="סינון המלצות אוכל וקניות">
          <button type="button" class="tf-filter is-active" data-spot-filter="all" aria-pressed="true">הכול</button>
          <button type="button" class="tf-filter" data-spot-filter="dinner" aria-pressed="false">ערב בכפר</button>
          <button type="button" class="tf-filter" data-spot-filter="mountain" aria-pressed="false">צהריים בהר</button>
          <button type="button" class="tf-filter" data-spot-filter="apres" aria-pressed="false">אפרה-סקי ומתוקים</button>
          <button type="button" class="tf-filter" data-spot-filter="dutyfree" aria-pressed="false">דיוטי-פרי</button>
        </div>
      </div>

      <div class="picks" style="margin-top:14px">
        ${vm.culinaryAndShopping.map(
          (s) => html`
            <div class="pick spot-card" data-spot-cat="${s.category}">
              <div class="pickhead">
                <h4>${s.nameHe}</h4>
                <span class="chip c-muted">${s.categoryLabelHe}</span>
              </div>
              <p class="mono muted" style="margin:0;font-size:12.5px">${s.nameEn}</p>
              <p style="margin:4px 0;font-size:14.5px">${s.vibeHe}</p>
              <p style="margin:0;font-size:14px"><b>מומלץ במיוחד:</b> ${s.mustTryHe}</p>
              <p class="muted" style="margin:4px 0 0;font-size:13.5px"><b>טיפ:</b> ${s.bookingTipHe}</p>
              <div class="links">
                <a class="glink" href="${s.mapUrl}" target="_blank" rel="noopener">פתיחה ב-Google Maps</a>
              </div>
            </div>
          `
        )}
      </div>
    </div>
  `;
}

export function renderInteractivePackingChecklist(vm: TripViewModel): SafeHtml {
  return html`
    <div class="packing-studio" id="packing" data-pack-store="livigno27-packing-v3">
      <div class="ps-head">
        <div>
          <h3 class="t" style="margin-top:0">רשימת אריזה חכמה לסקי ולכפר</h3>
          <p class="muted" style="margin:2px 0 0;font-size:14.5px">
            סמנו מה כבר מוכן בבית — השמירה אוטומטית בטלפון, ולחיצה על בן משפחה למעלה מדגישה את הציוד שלו.
          </p>
        </div>
        <div class="ps-progress-wrap">
          <span class="mono" id="packingProgressText">0 / ${vm.packingList.length} נארזו</span>
          <button type="button" class="doneclear" id="packingResetBtn" hidden>איפוס רשימה</button>
        </div>
      </div>

      <div class="ps-bar-track" aria-hidden="true">
        <div class="ps-bar-fill" id="packingProgressBar" style="width:0%"></div>
      </div>

      <div class="cb-filters" style="margin:12px 0" role="group" aria-label="סינון רשימת אריזה">
        <button type="button" class="tf-filter is-active" data-pack-filter="all" aria-pressed="true">הכול (${vm.packingList.length})</button>
        <button type="button" class="tf-filter" data-pack-filter="docs" aria-pressed="false">מסמכים וביטוח</button>
        <button type="button" class="tf-filter" data-pack-filter="ski_wear" aria-pressed="false">ביגוד גלישה אישי</button>
        <button type="button" class="tf-filter" data-pack-filter="orit_spa" aria-pressed="false">ספא והליכה בשלג</button>
        <button type="button" class="tf-filter" data-pack-filter="family_bag" aria-pressed="false">חשמל ומזוודות</button>
      </div>

      <div class="pack-grid" id="packingGrid">
        ${vm.packingList.map(
          (item) => html`
            <label
              class="pack-item"
              data-pack-id="${item.id}"
              data-pack-group="${item.group}"
              data-who="${item.forWho.join(',')}"
            >
              <input type="checkbox" class="pack-chk" data-pack-input="${item.id}" />
              <div class="pack-body">
                <div class="pack-top">
                  <b>${item.labelHe}</b>
                  <span class="chip c-muted">${item.forWhoNamesHe}</span>
                </div>
                <small>${item.noteHe}</small>
              </div>
            </label>
          `
        )}
      </div>
    </div>
  `;
}

export function renderEmergencyAndPhrasebook(vm: TripViewModel): SafeHtml {
  return html`
    <div class="field-kit" id="field-kit">
      <div class="grid2">
        <div class="info">
          <h4>🚌 4 קווי אוטובוס הסקי החינמיים בליביניו</h4>
          <p class="muted" style="margin:0 0 10px;font-size:14px">
            הנסיעה בכל הקווים בכפר חינמית לחלוטין (ללא כרטיס) ובתדירות גבוהה מהבוקר עד הערב:
          </p>
          <div class="bus-list">
            ${vm.fieldKit.skiBusLines.map(
              (bus) => html`
                <div class="bus-row">
                  <span class="bus-pill" style="background:${bus.badgeHex}">${bus.colorNameHe}</span>
                  <div>
                    <b>${bus.routeHe}</b>
                    <small>${bus.tipForFamilyHe}</small>
                  </div>
                </div>
              `
            )}
          </div>
        </div>

        <div class="info">
          <h4>🆘 מספרי חירום וטלפונים לחיוג מהיר בהר</h4>
          <div class="em-list">
            ${vm.fieldKit.emergencyContacts.map(
              (em) => html`
                <div class="em-row">
                  <div>
                    <b>${em.labelHe}</b>
                    <small>${em.noteHe}</small>
                  </div>
                  <a class="btn-action secondary mono" href="${em.telHref}" style="min-height:36px;padding:6px 12px;white-space:nowrap">
                    📞 ${em.phoneDisplay}
                  </a>
                </div>
              `
            )}
          </div>
        </div>
      </div>

      <details class="q" style="margin-top:16px">
        <summary>🇮🇹 שיחון כיס איטלקי מהיר לשלג, למסעדה ולמארחים (${vm.fieldKit.italianPhrases.length} משפטים שימושיים)</summary>
        <div class="qb">
          <div class="phrase-grid">
            ${vm.fieldKit.italianPhrases.map(
              (ph) => html`
                <div class="phrase-card">
                  <span class="chip c-muted">${ph.contextHe}</span>
                  <b class="ltr" style="display:block;font-size:16px;margin-top:4px">${ph.it}</b>
                  <span style="font-size:14.5px;color:var(--accent);font-weight:700">${ph.phoneticHe}</span>
                  <small class="muted" style="display:block;margin-top:2px">${ph.meaningHe}</small>
                </div>
              `
            )}
          </div>
        </div>
      </details>
    </div>
  `;
}

export function renderFamilyVaultSection(): SafeHtml {
  return html`
    <div class="vault-card" id="vault">
      <div class="vault-header">
        <div>
          <span class="chip c-ok" id="vaultSecurityBadge">מוצפן קריפטוגרפית (PBKDF2-SHA256 + MAC)</span>
          <h3 style="font-size:22px;font-weight:800;margin:6px 0 4px">🔐 כספת ההזמנות המשפחתית</h3>
          <p class="muted" style="margin:0;font-size:14.5px">
            גישה למורשי המשפחה בלבד (חשבון Google מאומת + קוד הכספת המשפחתי). בריפו הציבורי ב-GitHub לא שמור אף קוד הזמנה או PIN גלוי.
          </p>
        </div>
        <button type="button" class="btn-action secondary" id="vaultLockBtn" hidden>
          נעל כספת 🔒
        </button>
      </div>

      <div id="vaultLockedView" class="vault-locked-box">
        <div id="googleGsiContainer" class="gsi-row">
          <div id="googleSignInButtonSlot"></div>
          <span id="googleSignedInBadge" class="chip c-ok" hidden></span>
        </div>

        <form id="vaultUnlockForm" class="vault-form" autocomplete="off">
          <div class="vf-field">
            <label for="vaultEmailInput">חשבון Google מורשה של בן משפחה</label>
            <input
              type="email"
              id="vaultEmailInput"
              class="ltr"
              placeholder="name@gmail.com"
              required
              autocomplete="email"
            />
          </div>
          <div class="vf-field">
            <label for="vaultPinInput">קוד כספת משפחתי (4 ספרות)</label>
            <input
              type="password"
              id="vaultPinInput"
              class="ltr mono"
              inputmode="numeric"
              pattern="[0-9]{4,8}"
              maxlength="8"
              placeholder="••••"
              required
            />
          </div>
          <button type="submit" class="btn-action" id="vaultUnlockSubmitBtn">
            פתיחת הכספת 🔓
          </button>
        </form>

        <p id="vaultFeedbackMsg" class="vault-feedback" role="status" aria-live="polite"></p>
        <p class="muted" style="margin:8px 0 0;font-size:13px" id="vaultAllowedHint"></p>
      </div>

      <div id="vaultUnlockedView" class="vault-unlocked-grid" hidden></div>
    </div>
  `;
}
