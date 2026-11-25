import type { DerivedResortVM, TripViewModel } from '../domain/deriveTrip.js';
import { formatEur, html, type SafeHtml } from '../domain/format.js';

export function renderTodosSection(vm: TripViewModel): SafeHtml {
  return html`
    <section id="todo">
      <div class="wrap narrow">
        <h2 class="t">נשאר להזמין — מרכז המשימות</h2>
        <p class="sub">
          ${vm.counts.openTotal} פריטים מדורגים לפי צבעי פיסטות. סימון פריט כ"טופל" שומר אותו בדפדפן שלך,
          ומעדכן אוטומטית גם את שלטי הדרך ואת סרגל העדיפויות בראש הדף.
        </p>

        <div class="todo-toolbar">
          <div class="grades">
            <span><i class="umark u-red"></i>עכשיו (דחוף)</span>
            <span><i class="umark u-amber"></i>בקרוב</span>
            <span><i class="umark u-yellow"></i>אחר כך</span>
          </div>
          <div class="todo-filters" role="group" aria-label="סינון משימות">
            <button type="button" class="tf-filter is-active" data-todo-filter="all" aria-pressed="true">הכול (${vm.counts.openTotal})</button>
            <button type="button" class="tf-filter" data-todo-filter="red" aria-pressed="false">דחוף</button>
            <button type="button" class="tf-filter" data-todo-filter="overdue" aria-pressed="false">באיחור</button>
            <button type="button" class="tf-filter" id="downloadIcsBtn" title="הורדת כל תאריכי היעד ליומן הטלפון (.ics)">
              + ייצוא תזכורות ליומן (.ics)
            </button>
          </div>
        </div>

        <div class="todos" id="todoList">
          ${vm.openItems.map(
            (item) => html`
              <div
                class="todo"
                data-item="${item.id}"
                data-urgency="${item.urgency}"
                ${item.deadline ? html`data-deadline="${item.deadline}"` : ''}
              >
                <div class="th">
                  <i class="umark u-${item.urgency}" aria-hidden="true"></i>
                  <span class="tt">${item.titleHe}</span>
                  ${item.deadlineShortHe
                    ? html`<span class="chip c-muted dl">${item.deadlineShortHe}</span>`
                    : ''}
                </div>
                <p>${item.whatHe}</p>
                <div class="todo-links">
                  <a href="${item.targetAnchor}">לפרק בדף ←</a>
                  ${item.actionUrl && item.actionLabelHe
                    ? html`<a class="glink" href="${item.actionUrl}" target="_blank" rel="noopener">${item.actionLabelHe}</a>`
                    : ''}
                </div>
              </div>
            `
          )}
        </div>

        <div class="donezone" id="donezone" data-store="livigno27-done-v2">
          <div class="donehead">
            <h4>טופל</h4>
            <span class="chip c-ok mono" id="donecount">0</span>
            <button type="button" class="doneclear" id="doneclear" hidden>להחזיר הכול לרשימה</button>
          </div>
          <p class="muted" id="doneempty" style="margin:6px 0 0;font-size:14.5px">
            טרם סומנו משימות. לחצו על הריבוע שליד כל משימה כדי להעביר אותה לכאן; לחיצה חוזרת תחזיר אותה למקומה.
          </p>
          <div id="donelist"></div>
        </div>

        <div class="ctxbar">
          <h4 style="font-size:17.5px;font-weight:800;margin-bottom:4px">לשאול שאלת המשך ב-Claude או ב-Gemini</h4>
          <p class="muted" style="margin:0;font-size:14.5px">
            לחיצה מעתיקה סיכום Markdown מלא ומדויק ב-100% שנוצר ישירות משכבת הנתונים (כולל כל התקציב, הטיסות, הדירות ו-13 המשימות — וללא אף קוד הזמנה פרטי) ופותחת שיחה חדשה.
          </p>
          <div class="ctxbtns">
            <a class="btn-action" id="askClaude" href="https://claude.ai/new" target="_blank" rel="noopener">
              העתק ושאל את Claude ↗
            </a>
            <a class="btn-action secondary" id="askGemini" href="https://gemini.google.com/app" target="_blank" rel="noopener">
              העתק ושאל את Gemini ↗
            </a>
            <button type="button" class="btn-action secondary" id="copyMdOnlyBtn">
              העתקת ה-Markdown בלבד
            </button>
          </div>
          <p class="ctxsay" id="ctxSay" role="status" aria-live="polite"></p>
        </div>
      </div>
    </section>
  `;
}

export function renderFlightsSection(vm: TripViewModel): SafeHtml {
  const f = vm.flights;

  return html`
    <section id="trip">
      <div class="wrap">
        <h2 class="t">הטיסות וביקורת הגבולות באירופה</h2>
        <p class="sub">
          חמישה כרטיסים ב-${f.bookingCount} הזמנות נפרדות של אל על על אותן שתי טיסות ישירות למילאנו מלפנסה (MXP).
          מספרי ה-PNR ומספרי הכרטיסים שמורים בקובץ הפרטי המוגן.
        </p>

        <div class="tablewrap" id="flighttable">
          <table>
            <thead>
              <tr>
                <th>טיסה</th>
                <th>תאריך</th>
                <th>המראה</th>
                <th>נחיתה</th>
                <th>משך</th>
                <th>להיות בשדה עד</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b class="mono">${f.out.flight}</b><br /><a class="glink" href="${f.out.statusUrl}" target="_blank" rel="noopener">סטטוס</a></td>
                <td>${f.out.dateLongHe}</td>
                <td><b class="mono">${f.out.dep}</b><br /><span class="muted">${f.out.fromHe}</span></td>
                <td><b class="mono">${f.out.arr}</b><br /><span class="muted">${f.out.toHe}</span></td>
                <td class="d">${f.out.duration}</td>
                <td class="d"><b>${f.out.airportByClock}</b></td>
              </tr>
              <tr>
                <td><b class="mono">${f.back.flight}</b><br /><a class="glink" href="${f.back.statusUrl}" target="_blank" rel="noopener">סטטוס</a></td>
                <td>${f.back.dateLongHe}</td>
                <td><b class="mono">${f.back.dep}</b><br /><span class="muted">${f.back.fromHe}</span></td>
                <td>
                  <b class="mono">${f.back.arr}</b> <span class="muted">(${f.back.arrDateLongHe})</span>
                  <br /><span class="muted">${f.back.toHe}</span>
                </td>
                <td class="d">${f.back.duration}</td>
                <td class="d"><b>${f.back.airportByClock}</b></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="tablewrap" id="bookingtable" style="margin-top:14px">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>נוסעים</th>
                <th>סוג כרטיס</th>
                <th>שולם</th>
                <th>מושבים</th>
              </tr>
            </thead>
            <tbody>
              ${f.bookings.map(
                (b, idx) => html`
                  <tr>
                    <td class="d">${idx + 1}</td>
                    <td><b>${b.namesHe}</b></td>
                    <td>
                      ${b.classHe}
                      ${b.noteHe ? html`<br /><span class="muted">${b.noteHe}</span>` : ''}
                    </td>
                    <td class="p">${b.paidSummaryHe}</td>
                    <td class="${b.seatsAssigned ? '' : 'warnc'}">${b.seatsHe}</td>
                  </tr>
                `
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"><b>${f.bookingCount} הזמנות נפרדות · ${f.totalTickets} כרטיסים</b></td>
                <td class="p" colspan="2"><b>${f.pointsTotalText} נקודות מתמיד + ${f.usdTotalText} מסים</b></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="grid2" style="margin-top:18px">
          <div class="alertbox">
            <h4>למה ההזמנות נשמרות נפרדות — ואיך יושבים יחד</h4>
            <p>
              ההזמנה של ניצן נשמרת נפרדת במכוון לטובת גמישות מלאה עבורה (ללא איחוד הזמנות). כדי לשבת יחד:
              נכנסים ל"ניהול הזמנה" בכל אחת משתי הזמנות הנקודות, בוחרים מושבים צמודים ל-<span class="mono">${f.bookings[0]?.seatsHe ?? ''}</span>,
              ובשדה מבצעים צ׳ק-אין יחד בדלפק אחד.
            </p>
          </div>
          <div class="alertbox">
            <h4>כבודה וציוד</h4>
            <p>
              ${f.baggageHe}. מאחר שכל המגלשיים, הנעליים והקסדות מושכרים בליביניו, חמש מזוודות רגילות מספיקות
              בהחלט לכל בגדי הסקי (מומלץ שקיות וואקום למעילים ולמכנסי סקי שחוסכות נפח).
            </p>
          </div>
        </div>

        <h4 class="sub">בגבול האירופי — EES ו-ETIAS</h4>
        <div class="grid2">
          <div class="note">
            <b>EES — רישום ביומטרי בכניסה לשנגן (פעיל מ-${vm.worldFacts.ees.liveHe}):</b>
            טביעות אצבע ותמונת פנים בכניסה הראשונה לאיחוד האירופי. בחישוב הזמנים שלנו כבר הוספנו מרווח של
            <b>${vm.dates.airportExitMin} דקות</b> במלפנסה. <a class="glink" href="${vm.worldFacts.ees.src}" target="_blank" rel="noopener">מידע רשמי</a>
          </div>
          <div class="note">
            <b>ETIAS — אישור נסיעה מקוון (${formatEur(vm.worldFacts.etias.feeEur)}):</b>
            ${vm.worldFacts.etias.statusHe}. שמורה לכם משימת בדיקה לינואר 2027.
            <a class="glink" href="${vm.worldFacts.etias.src}" target="_blank" rel="noopener">סטטוס ETIAS</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAlternativeResortBlock(vm: TripViewModel, r: DerivedResortVM): SafeHtml {
  return html`
    <div id="r-${r.id}" style="margin-top:28px;padding-top:20px;border-top:2px solid var(--line)">
      <h3 class="altsec" style="margin-top:0">
        ${r.nameHe} · ${r.fitPct}% התאמה · ${r.verdictHe}
      </h3>
      <div class="facts">
        <div class="fact"><b>${r.pistesKm} km</b><span>מסלולים</span></div>
        <div class="fact"><b>${r.villageM.toLocaleString('en-US')}–${r.topM.toLocaleString('en-US')} m</b><span>כפר–פסגה</span></div>
        <div class="fact"><b>${r.transferHe}</b><span>מ${r.airportHe}</span></div>
        <div class="fact"><b>${r.totalText}</b><span>סה״כ בהשוואה</span></div>
      </div>

      <p style="margin:8px 0 14px;font-size:14.5px;color:var(--ink-2)">
        הגעה ביום שישי בסביבות <span class="mono">${r.arriveHe}</span> (${r.fridaySkiPossible ? 'אפשרי חימום קצר אחה״צ' : 'ללא גלישה בשישי'}) · יציאה בשבת האחרונה עד <span class="mono">${r.leaveByHe}</span> ·
        חיפוש לינה מתוארך לשבוע (<span class="mono">${vm.dates.aptSpanHe}</span>):
        <a class="glink" href="${r.bookingSearchUrl}" target="_blank" rel="noopener">Booking.com</a> ·
        <a class="glink" href="${r.airbnbSearchUrl}" target="_blank" rel="noopener">Airbnb</a> ·
        <a class="glink" href="${r.hotelsLink}" target="_blank" rel="noopener">Google Hotels</a> ·
        <a class="glink" href="${r.liftPassLink}" target="_blank" rel="noopener">מחירון סקי-פס</a>
      </p>

      <h4 class="sub">דירות שנבדקו לשבוע (${vm.dates.aptSpanHe})</h4>
      <div class="picks">
        ${r.stays.map(
          (st) => html`
            <div class="pick${st.pick ? ' best' : ''}">
              <div class="pickhead">
                <h4>${st.name}</h4>
                ${st.pick ? html`<span class="chip c-ok">נבחרה לתחשיב</span>` : ''}
              </div>
              <p class="mono" style="margin:0;font-weight:700">~${st.rangeText} לשבוע · ${st.perNightRangeText} ללילה</p>
              <p class="basis">${st.historicalBasisHe}</p>
              <dl class="kv">
                <dt>סוג</dt><dd>${st.kindHe}</dd>
                <dt>שינה ל-5</dt><dd>${st.bedsHe}</dd>
                <dt>למעלית</dt><dd>${st.liftHe}</dd>
                <dt>למרכז</dt><dd>${st.centreHe}</dd>
                <dt>יתרונות</dt><dd>${st.perksHe}</dd>
              </dl>
              ${st.watchHe ? html`<p class="watch"><b>לשים לב:</b> ${st.watchHe}</p>` : ''}
              <div class="links">
                ${st.bookingDatedUrl
                  ? html`<a class="glink" href="${st.bookingDatedUrl}" target="_blank" rel="noopener">Booking · ${vm.dates.aptSpanHe}</a>`
                  : ''}
                <a class="glink" href="${st.googleHotelsUrl}" target="_blank" rel="noopener">Google Hotels</a>
              </div>
            </div>
          `
        )}
      </div>

      ${r.firstNightOptions.length > 0
        ? html`
            <h4 class="sub">לילה ראשון (שישי ${vm.dates.startDm}) — אפשרויות שנבדקו</h4>
            <div class="picks">
              ${r.firstNightOptions.map(
                (fnOpt) => html`
                  <div class="pick${fnOpt.pick ? ' best' : ''}">
                    <div class="pickhead">
                      <h4>${fnOpt.name}</h4>
                      ${fnOpt.pick ? html`<span class="chip c-ok">נבחר לתחשיב</span>` : ''}
                    </div>
                    <p style="margin:0;font-size:14.5px">${fnOpt.whatHe}</p>
                    <div class="links">
                      <a class="glink" href="${fnOpt.url}" target="_blank" rel="noopener">אתר / הזמנה</a>
                      <a class="glink" href="${fnOpt.googleHotelsUrl}" target="_blank" rel="noopener">Google Hotels · ${vm.dates.startDm}</a>
                    </div>
                  </div>
                `
              )}
            </div>
          `
        : ''}

      <h4 class="sub">תחשיב חבילת הבסיס ב-${r.nameHe} (${r.packageText})</h4>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>סעיף</th>
              <th>אומדן</th>
              <th>מה כלול</th>
              <th>מקור</th>
            </tr>
          </thead>
          <tbody>
            ${r.comparisonLines.map(
              (line) => html`
                <tr>
                  <td><b>${line.labelHe}</b></td>
                  <td class="p"><b>${line.eurText}</b></td>
                  <td>${line.whatHe}</td>
                  <td><a class="glink" href="${line.src}" target="_blank" rel="noopener">${line.srcHe}</a></td>
                </tr>
              `
            )}
          </tbody>
          <tfoot>
            <tr>
              <td><b>סה״כ חבילה (לפני קורס ואוכל)</b></td>
              <td class="p"><b>${r.packageText}</b></td>
              <td colspan="2">טווח לפי בחירת דירה: <span class="mono">${r.packageRangeText}</span> · סה״כ כולל קורס ואוכל: <b><span class="mono">${r.totalText}</span></b></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h4 class="sub">הסעות ממלפנסה + השכרת ציוד ובתי ספר</h4>
      <div class="tablewrap">
        <table>
          <thead><tr><th>אפשרות הסעה</th><th>הלוך-חזור</th><th>פירוט</th><th>קישור</th></tr></thead>
          <tbody>
            ${r.transferOptions.map(
              (o) => html`
                <tr class="${o.pick ? 'pickrow' : ''}">
                  <td><b>${o.name}</b></td>
                  <td class="p">~${o.eurText}</td>
                  <td>${o.whatHe}</td>
                  <td><a class="glink" href="${o.url}" target="_blank" rel="noopener">להזמנה</a></td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>

      <div class="picks" style="margin-top:12px">
        ${r.rentals.map(
          (v) => html`
            <div class="pick${v.pick ? ' best' : ''}">
              <div class="pickhead">
                <h4>ציוד: ${v.name}</h4>
                ${v.pick ? html`<span class="chip c-ok">מומלץ</span>` : ''}
              </div>
              <p class="basis">${v.whereHe}</p>
              <p style="margin:0;font-size:14.5px">${v.whatHe}</p>
              <div class="links"><a class="glink" href="${v.url}" target="_blank" rel="noopener">אתר החנות</a></div>
            </div>
          `
        )}
        ${r.schools.map(
          (sc) => html`
            <div class="pick${sc.pick ? ' best' : ''}">
              <div class="pickhead">
                <h4>בית ספר: ${sc.name}</h4>
                ${sc.pick ? html`<span class="chip c-ok">מומלץ</span>` : ''}
              </div>
              <p class="basis">${sc.whereHe}</p>
              <p style="margin:0;font-size:14.5px">${sc.whatHe}</p>
              <div class="links"><a class="glink" href="${sc.url}" target="_blank" rel="noopener">אתר בית הספר</a></div>
            </div>
          `
        )}
      </div>

      <h4 class="sub">יתרונות וחסרונות</h4>
      <div class="proscons">
        ${r.flags.map(
          (fl) => html`
            <div class="${fl.kind === 'green' ? 'pro' : 'con'}">
              <b>${fl.kind === 'green' ? '✓' : '✗'}</b>
              <span>${fl.textHe}</span>
            </div>
          `
        )}
      </div>
    </div>
  `;
}

export function renderAlternativesAndFooter(vm: TripViewModel): SafeHtml {
  const lineKeys = vm.decided.comparisonLines.map((l) => ({ key: l.key, labelHe: l.labelHe }));

  return html`
    <section>
      <div class="wrap">
        <h2 class="t">חלופות שנשקלו וארכיון ההשוואה</h2>
        <p class="sub">
          כל תהליך קבלת ההחלטות (טבלת ההתאמה, ההשוואה הכלכלית שורה-מול-שורה, פירוט רכיבים, הדרכות ואוכל, אתרי המועמדים הנוספים ושלושת מחקרי העומק)
          שמור כאן במגירה סגורה כדי שהתוכנית הראשית תישאר ממוקדת בליביניו.
        </p>

        <details class="alt" id="alternatives">
          <summary>
            <b>לפתוח את ההשוואה המלאה</b>
            <span>
              טבלת ההתאמה · השוואת עלויות מלאה · ${vm.alternatives.map((a) => a.nameHe).join(' ו')} · עוד
              ${vm.counts.setAside} אתרים · ${vm.counts.reconciledTotal} הכרעות מול המחקרים החיצוניים
            </span>
          </summary>
          <div class="altbody">
            <div class="partmeta">
              <a class="chip c-ac" href="#fit">טבלת ההתאמה</a>
              <a class="chip c-ac" href="#comparetable">השוואת עלויות</a>
              <a class="chip c-ac" href="#breakdown">פירוט רכיבים</a>
              <a class="chip c-ac" href="#lessons_table">הדרכות</a>
              <a class="chip c-ac" href="#food_table">אוכל</a>
              ${vm.alternatives.map((a) => html`<a class="chip c-ac" href="#r-${a.id}">${a.nameHe}</a>`)}
              <a class="chip c-ac" href="#setaside">עוד ${vm.counts.setAside} אתרים</a>
              <a class="chip c-ac" href="#reconcile">הכרעות המחקרים</a>
            </div>

            <h3 class="altsec" id="fit">למה ${vm.fit.winnerHe} ניצחה — טבלת ההתאמה (${vm.fit.winnerPct}%)</h3>
            <div class="note" style="margin-bottom:14px">
              <b>הנחת המוצא של הדירוג המשפחתי:</b> המשקלים הותאמו להרכב המדויק שלכם — גולש מנוסה אחד (${vm.party.advancedCount}),
              שלוש גולשות מתחילות בקורס (${vm.party.beginnersCount}) ואורית שנהנית מהכפר ללא סקי (${vm.party.nonSkiersCount}).
              תוצאה משוקללת: <b>${vm.fit.winnerHe} מקום ראשון (${vm.fit.winnerPct}%)</b> ·
              ${vm.fit.runnerHe} שנייה (${vm.fit.runnerPct}%) ·
              ${vm.fit.thirdHe} שלישית (${vm.fit.thirdPct}%).
            </div>

            <div class="tablewrap" id="fittable">
              <table>
                <thead>
                  <tr>
                    <th>קריטריון</th>
                    <th>משקל</th>
                    ${vm.byFit.map((r) => html`<th>${r.nameHe}</th>`)}
                  </tr>
                </thead>
                <tbody>
                  ${vm.fit.criteria.map(
                    (c) => html`
                      <tr>
                        <td><b>${c.labelHe}</b><br /><span class="muted">${c.whatHe}</span></td>
                        <td class="d">×${c.weight}</td>
                        ${vm.byFit.map((r) => {
                          const cell = vm.fit.scores[r.id]?.[c.id];
                          return html`
                            <td>
                              <b class="mono">${cell?.n ?? 0}</b>
                              <br /><span class="muted">${cell?.whyHe ?? ''}</span>
                            </td>
                          `;
                        })}
                      </tr>
                    `
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td><b>ציון התאמה משוקלל למשפחה</b></td>
                    <td></td>
                    ${vm.byFit.map((r) => html`<td class="p"><b>${r.fitPct}%</b></td>`)}
                  </tr>
                </tfoot>
              </table>
            </div>

            <h3 class="altsec">שלושת המועמדים — שורה מול שורה</h3>
            <p style="margin:0 0 12px;color:var(--ink-2)">
              ${vm.spread.introHe}, ${vm.spread.pullHe}. פער העלות הכולל בין האתר הזול ביותר (${vm.spread.cheapestHe}, <span class="mono">${vm.spread.cheapestText}</span>)
              ליקר ביותר (${vm.spread.dearestHe}, <span class="mono">${vm.spread.dearestText}</span>) עומד על <span class="mono">${vm.spread.gapText}</span> (${vm.spread.gapPct}%) — <b>${vm.spread.gapVerdictHe}</b>, ולכן ההכרעה התבססה על התאמה למשפחה ולא על חיסכון שולי.
            </p>
            <div class="tablewrap" id="comparetable">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>אתר</th>
                    <th>התאמה</th>
                    <th>חבילה</th>
                    <th>הדרכות</th>
                    <th>אוכל</th>
                    <th>סה״כ (€)</th>
                    <th>בשקלים (חי)</th>
                    <th>טווח דירה</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${vm.byPrice.map(
                    (r) => html`
                      <tr>
                        <td class="d">${r.priceRank}</td>
                        <td><b>${r.nameHe}</b><br /><span class="muted">${r.countryHe} · ${r.pistesKm} ק״מ</span></td>
                        <td class="p">${r.fitPct}%</td>
                        <td class="p">${r.packageText}</td>
                        <td class="p">${r.lessonsText}</td>
                        <td class="p">${r.foodWeekText}</td>
                        <td class="p"><b>${r.totalText}</b></td>
                        <td class="p" data-eur="${r.totalEur}">${r.totalIlsText}</td>
                        <td class="p">${r.totalRangeText}</td>
                        <td style="min-width:95px"><div class="gbar"><i style="width:${Math.max(r.barPct, 5)}%"></i></div></td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            </div>

            <h4 class="sub" id="breakdown">פירוט רכיבי החבילה — סעיף מול סעיף</h4>
            <div class="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>רכיב</th>
                    ${vm.resorts.map((r) => html`<th>${r.nameHe}</th>`)}
                  </tr>
                </thead>
                <tbody>
                  ${lineKeys.map(
                    (lk) => html`
                      <tr>
                        <td><b>${lk.labelHe}</b></td>
                        ${vm.resorts.map((r) => {
                          const item = r.comparisonLines.find((c) => c.key === lk.key);
                          return html`
                            <td>
                              <b class="mono">${item?.eurText ?? '—'}</b>
                              <br /><span class="muted">${item?.whatHe ?? ''}</span>
                            </td>
                          `;
                        })}
                      </tr>
                    `
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td><b>סה״כ חבילה (לפני קורס ואוכל)</b></td>
                    ${vm.resorts.map((r) => html`<td class="p"><b>${r.packageText}</b></td>`)}
                  </tr>
                </tfoot>
              </table>
            </div>

            <h4 class="sub" id="lessons_table">השוואת הדרכות — ${vm.party.beginnersCount} מתחילות (${vm.dates.courseDays} ימים)</h4>
            <div class="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>אתר</th>
                    <th>למתחילה</th>
                    <th>סה״כ ל-${vm.party.beginnersCount}</th>
                    <th>מסגרת הקורס וחלופה</th>
                    <th>מקור</th>
                  </tr>
                </thead>
                <tbody>
                  ${vm.resorts.map(
                    (r) => html`
                      <tr>
                        <td><b>${r.nameHe}</b></td>
                        <td class="p">${r.lessonsUnitText}</td>
                        <td class="p"><b>${r.lessonsText}</b></td>
                        <td>
                          ${r.lessonsWhatHe}
                          ${r.lessonsAltHe ? html`<br /><span class="muted">חלופה: ${r.lessonsAltHe}</span>` : ''}
                        </td>
                        <td><a class="glink" href="${r.lessonsSrc}" target="_blank" rel="noopener">${r.lessonsSrcHe}</a></td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            </div>

            <h4 class="sub" id="food_table">השוואת אוכל ומסעדות — ${vm.party.peopleCount} נפשות × ${vm.dates.foodDays} ימים</h4>
            <div class="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>אתר</th>
                    <th>ליום למשפחה</th>
                    <th>ליום לאדם</th>
                    <th>סה״כ לשבוע</th>
                    <th>הרכב האומדן</th>
                    <th>מקור</th>
                  </tr>
                </thead>
                <tbody>
                  ${vm.resorts.map(
                    (r) => html`
                      <tr>
                        <td><b>${r.nameHe}</b></td>
                        <td class="p">${r.foodPerDayText}</td>
                        <td class="p">${r.foodPerPersonPerDayText}</td>
                        <td class="p"><b>${r.foodWeekText}</b></td>
                        <td>${r.foodBreakdownHe}</td>
                        <td><a class="glink" href="${r.foodSrc}" target="_blank" rel="noopener">${r.foodSrcHe}</a></td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            </div>

            <div class="info" style="margin-top:16px">
              <h4>איפה כל אתר היה הזול ואיפה היקר</h4>
              <ul>
                ${vm.spread.winLoseByResort.map(
                  (row) => html`<li><b>${row.nameHe}</b> — ${row.winHe}; ${row.loseHe}.</li>`
                )}
              </ul>
            </div>

            ${vm.alternatives.map((alt) => renderAlternativeResortBlock(vm, alt))}

            <h3 class="altsec" id="others">עוד ${vm.counts.setAside} אתרים שנבדקו וירדו מהפרק</h3>
            <div class="cards" id="setaside">
              ${vm.setAside.map(
                (s) => html`
                  <div class="card">
                    <div class="top">
                      <h4>${s.nameHe}</h4>
                      <span class="chip ${s.id === 'pila' ? 'c-ok' : 'c-wn'}">${s.verdictHe}</span>
                    </div>
                    <p class="muted" style="margin:2px 0 6px;font-size:13.5px">${s.regionHe} · ${s.transferHe} ממלפנסה · ${s.pistesHe}</p>
                    <p style="margin:0 0 4px;font-size:14.5px"><b>מה טוב:</b> ${s.goodHe}</p>
                    <p style="margin:0;font-size:14.5px"><b>למה לא:</b> ${s.notHe}</p>
                  </div>
                `
              )}
            </div>

            <h3 class="altsec" id="sources">שלושת הניתוחים החיצוניים וטבלת ההכרעות</h3>
            <div class="picks">
              ${vm.sources.map(
                (src) => html`
                  <div class="pick src">
                    <div class="pickhead">
                      <h4>${src.whoHe}</h4>
                      <span class="chip c-ok">${src.status === 'read' ? 'נקרא במלואו' : 'לא נקרא'}</span>
                    </div>
                    <p class="mono muted" style="margin:0;font-size:12.5px">${src.localRef}</p>
                    <p style="margin:4px 0 0;font-size:14.5px">${src.noteHe}</p>
                    ${src.url
                      ? html`<div class="links"><a class="glink" href="${src.url}" target="_blank" rel="noopener">המסמך המקורי</a></div>`
                      : ''}
                  </div>
                `
              )}
            </div>

            <h4 class="sub">טבלת ${vm.counts.reconciledTotal} נקודות המחלוקת (${vm.counts.reconciledMoved} שינו מספר)</h4>
            <div class="tablewrap" id="reconcile">
              <table>
                <thead>
                  <tr>
                    <th>נושא</th>
                    <th>הערכה ראשונית</th>
                    <th>מה אמרו המקורות</th>
                    <th>ההכרעה בדף</th>
                    <th>נימוק</th>
                  </tr>
                </thead>
                <tbody>
                  ${vm.reconciled.map(
                    (row) => html`
                      <tr>
                        <td>
                          <b>${row.topicHe}</b><br />
                          <span class="chip ${row.moved ? 'c-wn' : 'c-ok'}">${row.moved ? 'שונה' : 'נשאר'}</span>
                        </td>
                        <td class="p">${row.historicalWasHe}</td>
                        <td class="p">${row.historicalOthersHe}</td>
                        <td class="p"><b>${row.historicalNowHe}</b></td>
                        <td>${row.historicalWhyHe}</td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </details>
        <!--END_ALTERNATIVES-->
      </div>
    </section>

    <footer>
      <svg class="trees" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <pattern id="treesPattern" width="44" height="52" patternUnits="userSpaceOnUse">
            <polygon class="t1" points="11,40 20,16 29,40"></polygon>
            <polygon class="t2" points="31,22 37,6 43,22"></polygon>
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#treesPattern)"></rect>
      </svg>
      <div class="wrap">
        <p style="margin:0">
          נבנה אוטומטית מתוך <span class="ltr">data/trip.yaml</span> + <span class="ltr">data/rates.yaml</span> עם אימות סכמה
          (<span class="ltr">TypeScript + Zod</span>) ובדיקות מדיניות אוטומטיות. הטיסות, דירת Calanda ו-Casa Noemi אומתו מול אישורי ההזמנה;
          מספרי ההזמנות וקודי ה-PIN מופרדים פיזית בקובץ פרטי מוגן ואינם מופיעים בדף זה. שער היורו מתעדכן אוטומטית מה-ECB.
        </p>
      </div>
    </footer>
  `;
}
