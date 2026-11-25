import type { TripViewModel } from '../domain/deriveTrip.js';
import { formatEur, html, type SafeHtml } from '../domain/format.js';
import { renderMountainHeroSvg } from './TopNavAndHero.js';

export function renderLivignoSection(vm: TripViewModel): SafeHtml {
  const r = vm.decided;

  return html`
    <section id="r-livigno">
      <div class="wrap">
        <h2 class="t">${r.nameHe} — מנויים, ציוד, בית ספר והמדריך של אורית</h2>
        <p class="sub">
          עמק אלפיני גבוה ורחב בצמוד לגבול שווייץ: הכפר ב-<span class="mono">${r.baseM.toLocaleString('en-US')}m</span>,
          הפסגות עד <span class="mono">${r.topM.toLocaleString('en-US')}m</span> ו-<span class="mono">${r.pistesKm}</span> ק״מ של מסלולים בשני צדי העמק.
        </p>

        <div class="facts">
          <div class="fact"><b>${r.pistesKm} km</b><span>מסלולי גלישה</span></div>
          <div class="fact"><b>${r.baseM.toLocaleString('en-US')}–${r.topM.toLocaleString('en-US')} m</b><span>גובה כפר–פסגה</span></div>
          <div class="fact"><b>${vm.dates.skiDays}</b><span>ימי מנוי וציוד</span></div>
          <div class="fact"><b>${vm.dates.courseDays} × 2h</b><span>קורס (${vm.dates.courseHoursText})</span></div>
        </div>

        <div style="margin:14px 0 22px;border-radius:16px;overflow:hidden;border:1px solid var(--line);max-height:210px">
          ${renderMountainHeroSvg(vm)}
        </div>

        <h3 class="t" id="passes">
          סקי-פס ל-${vm.dates.skiDays} ימים + חובת ביטוח צד ג׳
          <span class="chip c-wn">לקנות אונליין</span>
        </h3>
        <p style="margin:0 0 10px;color:var(--ink-2)">
          המנוי מכסה מ-${vm.dates.aptInLongHe} עד ${vm.dates.courseEndLongHe} לארבעת הגולשים (אורית אינה צריכה מנוי גלישה).
          בתקציב: <b><span class="mono">${formatEur(r.passesEur)}</span></b> (כולל <span class="mono">${r.passesInsuranceText}</span> ביטוח צד ג׳ חובה).
          <a class="glink" href="${r.liftPassLink}" target="_blank" rel="noopener">מחירון Skipass Livigno הרשמי</a>
        </p>
        <ul style="margin:0 0 22px;padding-inline-start:20px;color:var(--ink-2)">
          <li><b>רכישה מראש אונליין</b> מוזילה את המחיר לעומת הקופה וחוסכת עמידה בתור בשבת בבוקר.</li>
          <li>
            <b>חוק ביטוח צד ג׳ באיטליה (${vm.worldFacts.italyPisteInsurance.lawHe}):</b> חובה חוקית על כל גולש בכל גיל —
            קנס של <span class="mono">${vm.worldFacts.italyPisteInsurance.fineHe}</span> ושלילת מנוי במקום. אם פוליסת הנסיעות אינה מציינת מפורשות
            Third-Party Ski Liability, מוסיפים אותו בקליק ברכישת הסקי-פס (~<span class="mono">${formatEur(vm.worldFacts.italyPisteInsurance.dayPriceEur)}</span> ליום לגולש).
          </li>
          <li><b>מדרגות גיל לפי שנת לידה:</b> ${vm.party.bandsSummaryHe}.</li>
        </ul>

        <h4 class="sub" id="school">השכרת ציוד — ליד Calanda ו-Campo Scuola 23</h4>
        <div class="picks">
          ${r.rentals.map(
            (v) => html`
              <div class="pick${v.pick ? ' best' : ''}">
                <div class="pickhead">
                  <h4>${v.name}</h4>
                  ${v.pick ? html`<span class="chip c-ok">הקרוב לדירה</span>` : ''}
                </div>
                <p class="basis">${v.whereHe}</p>
                <p style="margin:0;font-size:15px">${v.whatHe}</p>
                <div class="links">
                  <a class="glink" href="${v.url}" target="_blank" rel="noopener">לאתר החנות</a>
                </div>
              </div>
            `
          )}
        </div>

        <h4 class="sub">בתי ספר לסקי</h4>
        <div class="picks">
          ${r.schools.map(
            (v) => html`
              <div class="pick${v.pick ? ' best' : ''}">
                <div class="pickhead">
                  <h4>${v.name}</h4>
                  ${v.pick ? html`<span class="chip c-ok">המומלץ</span>` : ''}
                </div>
                <p class="basis">${v.whereHe}</p>
                <p style="margin:0;font-size:15px">${v.whatHe}</p>
                <div class="links">
                  <a class="glink" href="${v.url}" target="_blank" rel="noopener">לאתר בית הספר</a>
                </div>
              </div>
            `
          )}
        </div>

        <h3 class="t" id="orit-guide">
          המדריך של אורית — 6 ימים מלאים בליביניו בלי מגלשיים
          <span class="chip c-ac">מותאם ללא-גולשת</span>
        </h3>
        <div class="picks">
          ${vm.oritGuide.map(
            (g) => html`
              <div class="pick" data-orit-card="1">
                <div class="pickhead">
                  <h4>${g.titleHe}</h4>
                  <span class="chip c-muted">${g.whenHe}</span>
                </div>
                <p style="margin:0;font-size:15px;color:var(--ink-2)">${g.detailHe}</p>
                <div class="links">
                  <a class="glink" href="${g.mapUrl}" target="_blank" rel="noopener">מיקום במפה</a>
                  ${g.url ? html`<a class="glink" href="${g.url}" target="_blank" rel="noopener">אתר רשמי</a>` : ''}
                </div>
              </div>
            `
          )}
        </div>

        <h4 class="sub">סיכום יתרונות ונקודות לתשומת לב בליביניו</h4>
        <div class="proscons">
          ${r.flags.map(
            (f) => html`
              <div class="${f.kind === 'green' ? 'pro' : 'con'}">
                <b>${f.kind === 'green' ? '✓' : '✗'}</b>
                <span>${f.textHe}</span>
              </div>
            `
          )}
        </div>
      </div>
    </section>
  `;
}

export function renderBudgetSection(vm: TripViewModel): SafeHtml {
  const b = vm.budget;
  const s = vm.simulator;

  return html`
    <section id="budget">
      <div class="wrap narrow">
        <h2 class="t">המחירון, תזרים התשלומים וסימולטור החלטות</h2>
        <p class="sub">
          שער היורו מתעדכן אוטומטית מהבנק המרכזי האירופי (ECB) ומחשב מחדש את כל הסכומים בשקלים בזמן אמת.
          התקציב מפריד בבירור בין מה שכבר שולם, מה שהוזמן ומחכה לתשלום, מה שנשאר להזמין אונליין והוצאות במקום.
        </p>

        <!-- 4-Stage Cashflow Breakdown -->
        <div class="cashflow-panel" id="cashflowPanel">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px">
            <h4 style="font-size:17px;font-weight:800">תמונת תזרים מזומנים (לפי תוכנית הבסיס: <span class="mono">${b.totalText}</span>)</h4>
            <span class="muted" style="font-size:13.5px">הטיסות כבר שולמו בנפרד (${vm.flights.pointsTotalText} נק׳ + ${vm.flights.usdTotalText})</span>
          </div>
          <div class="cf-bar" role="img" aria-label="פילוח תזרים התקציב לארבעה שלבים">
            ${b.stages.map(
              (st) => html`
                <div
                  class="cf-seg s-${st.key}"
                  style="width:${Math.max(st.pct, 3)}%"
                  title="${st.labelHe}: ${st.eurText} (${st.pct}%)"
                ></div>
              `
            )}
          </div>
          <div class="cf-grid">
            ${b.stages.map(
              (st) => html`
                <div class="cf-item s-${st.key}">
                  <b>${st.labelHe} (${st.pct}%)</b>
                  <span class="mono">${st.eurText}</span>
                  <span class="mono muted" style="font-size:13.5px;margin-inline-start:6px" data-eur="${st.eur}">${st.ilsText}</span>
                  <small>${st.subHe}</small>
                </div>
              `
            )}
          </div>
        </div>

        <!-- Canonical Tariff Board -->
        <div class="tariff" id="budgettable" data-currency-mode="both" data-scope-mode="family" data-people="${vm.party.peopleCount}">
          <div class="tf-head">
            <div>
              <h3>המחירון</h3>
              <span class="mono" style="font-size:12.5px">TARIFFE ${vm.dates.startIso.slice(0, 4)} · LIVIGNO</span>
            </div>
            <div class="tf-controls">
              <button type="button" class="tf-toggle is-active" data-curr-btn="both" aria-pressed="true">€ + ₪</button>
              <button type="button" class="tf-toggle" data-curr-btn="eur" aria-pressed="false">€ בלבד</button>
              <button type="button" class="tf-toggle" data-curr-btn="ils" aria-pressed="false">₪ בלבד</button>
              <button type="button" class="tf-toggle" data-scope-btn="toggle" id="scopeToggleBtn" aria-pressed="false">למשפחה (לחץ ללאדם)</button>
            </div>
          </div>

          <ul class="tf-list">
            ${b.lines.map(
              (line) => html`
                <li class="trow${line.isBooked ? ' paid' : ''}" data-budget-key="${line.key}" data-line-eur="${line.eur}">
                  <div class="tr-top">
                    <b>${line.labelHe}</b>
                    <div class="tr-prices">
                      <span class="mono eur-val">${line.eurText}</span>
                      <span class="mono ils-sub" data-eur="${line.eur}">${line.ilsText}</span>
                    </div>
                  </div>
                  <div class="tr-sub">
                    <span class="tr-state">${line.statusHe}</span> · ${line.whatHe}
                    ${line.srcUrl && line.srcLabelHe
                      ? html` · <a class="glink" href="${line.srcUrl}" target="_blank" rel="noopener">${line.srcLabelHe}</a>`
                      : ''}
                    <span class="chip ${line.conf === 'quoted' ? 'c-ok' : 'c-wn'}">
                      ${line.conf === 'quoted' ? 'מחיר מפורסם' : 'חישוב שלנו'}
                    </span>
                  </div>
                </li>
              `
            )}
          </ul>

          <div class="tf-total">
            <div>
              <b id="budgetTotalHeading">סך הכול למשפחה (${vm.party.peopleCount} נפשות)</b>
              <div
                class="tf-total-meta"
                id="budgetTotalMeta"
                data-per-person-exact="${b.perPersonExactEur}"
                data-paid-eur="${b.paidEur}"
                data-left-eur="${b.leftEur}"
                data-vs-comp-eur="${b.vsComparisonDiffEur}"
              >
                <span class="mono">${b.perPersonText} (${b.perPersonIlsText})</span> לאדם · שולם עד היום
                <span class="mono">${b.paidText}</span>, נותר <span class="mono" id="budgetLeftEur">${b.leftText}</span>
                · ${b.vsComparisonHe}
              </div>
            </div>
            <div class="tf-total-amount">
              <span class="mono" id="budgetGrandEur">${b.totalText}</span>
              <small id="budgetGrandIls" data-eur="${b.totalEur}">${b.totalIlsText}</small>
            </div>
          </div>
        </div>

        <!-- Interactive What-If Decision Simulator -->
        <div class="sim-panel" id="whatIfSimulator">
          <div class="sim-head">
            <div>
              <h4 style="font-size:18px;font-weight:800">סימולטור החלטות ("מה אם?")</h4>
              <p class="muted" style="margin:2px 0 0;font-size:14px">
                בדוק איך ההחלטות שעדיין פתוחות משפיעות על הסכום הכולל ביורו ובשקלים (ללא שינוי נתוני המקור).
              </p>
            </div>
            <button type="button" class="btn-action secondary" id="simResetBtn" style="min-height:34px;font-size:13px">
              איפוס לתוכנית הבסיס
            </button>
          </div>

          <div class="sim-grid">
            <div class="sim-control">
              <label for="simTransfer">1. הגעה ממלפנסה הלוך-חזור</label>
              <select id="simTransfer">
                <option value="${s.transferPrivateEur}" selected>הסעה פרטית מומלצת (€${s.transferPrivateEur.toLocaleString('en-US')})</option>
                <option value="${s.transferCarEur}">שכירת וואן 7 מקומות כולל דלק (€${s.transferCarEur.toLocaleString('en-US')})</option>
                <option value="${s.transferSharedEur}">שאטל משותף Livigno Express (€${s.transferSharedEur.toLocaleString('en-US')})</option>
              </select>
            </div>

            <div class="sim-control">
              <label for="simGearSchool">2. קורס מתחילות + ציוד ל-4 גולשים</label>
              <select id="simGearSchool">
                <option value="${s.gearPlusSchoolSeparateEur}" selected>בנפרד: קורס Centrale + ציוד Sport4U (€${s.gearPlusSchoolSeparateEur.toLocaleString('en-US')})</option>
                <option value="${s.gearPlusSchoolCentraleBundleEur}">חבילת קורס+ציוד ב-Centrale + ציוד ראובן (€${s.gearPlusSchoolCentraleBundleEur.toLocaleString('en-US')} · חוסך €${s.centraleBundleSavingsEur})</option>
              </select>
            </div>

            <div class="sim-control">
              <label for="simInsurance">3. ביטוח נסיעות וסקי (5 נפשות)</label>
              <select id="simInsurance">
                <option value="0" selected>מוחרג מהמחירון (€0)</option>
                <option value="${s.insuranceFamilyEur}">הוספת אומדן ביטוח סקי (+€${s.insuranceFamilyEur})</option>
              </select>
            </div>

            <div class="sim-control">
              <label for="simLastSat">4. בוקר גלישה בשבת האחרונה</label>
              <select id="simLastSat">
                <option value="0" selected>ללא גלישה בשבת האחרונה (€0)</option>
                <option value="${s.lastSatSkiTotalEur}">יומי ל-4 גולשים + Aquagranda (+€${s.lastSatSkiTotalEur})</option>
              </select>
            </div>
          </div>

          <div class="sim-result">
            <div>
              <b>סה״כ בתרחיש שנבחר:</b>
              <span class="mono" style="font-size:22px;font-weight:700;margin-inline:8px" id="simTotalEur">${b.totalText}</span>
              <span class="mono muted" id="simTotalIls" data-eur="${b.totalEur}">(${b.totalIlsText})</span>
            </div>
            <span class="chip c-ok" id="simDeltaBadge">תוכנית הבסיס (€0 הפרש)</span>
          </div>
        </div>

        <details class="q">
          <summary>מה לא כלול במחירון הבסיס</summary>
          <div class="qb">
            <ul style="margin:0;padding-inline-start:20px;color:var(--ink-2)">
              ${b.excludedHe.map((x) => html`<li style="margin-bottom:5px">${x}</li>`)}
            </ul>
          </div>
        </details>
      </div>
    </section>
  `;
}
