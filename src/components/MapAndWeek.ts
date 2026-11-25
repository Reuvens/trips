import type { TripViewModel } from '../domain/deriveTrip.js';
import { html, rawHtml, type SafeHtml } from '../domain/format.js';

export function renderLivignoMapSection(vm: TripViewModel): SafeHtml {
  const firstPin = vm.villageMapPins[0]!;

  const pinColor = (cat: string): string => {
    if (cat === 'stay') return '#1B4B3A';
    if (cat === 'ski') return '#1B62C6';
    if (cat === 'pass') return '#C8102E';
    return '#F4B61A';
  };

  const pinInk = (cat: string): string => (cat === 'village' ? '#0F2338' : '#FFFFFF');

  return html`
    <section id="map">
      <div class="wrap">
        <h2 class="t">מפת העמק והכפר — איפה כל דבר יושב</h2>
        <p class="sub">
          ליביניו בנויה כעמק שטוח וארוך בגובה <span class="mono">${vm.decided.baseM.toLocaleString('en-US')}m</span> בין שני רכסי סקי:
          <span class="ltr">Carosello 3000</span> ממערב ו-<span class="ltr">Mottolino</span> ממזרח, עם אוטובוס סקי חינמי לאורך כל הכפר.
          לחצו על כל סיכה כדי לראות מרחק הליכה מ-Calanda וניווט ישיר.
        </p>

        <div class="map-card" id="livignoMapCard">
          <div class="map-toolbar">
            <div class="map-legend">
              <span><i class="legend-dot" style="background:#1B4B3A"></i>לינה מוזמנת</span>
              <span><i class="legend-dot" style="background:#1B62C6"></i>סקי, ציוד וקורס</span>
              <span><i class="legend-dot" style="background:#F4B61A"></i>ספא והכפר (אורית/ערב)</span>
              <span><i class="legend-dot" style="background:#C8102E"></i>מעבר ההרים</span>
            </div>
            <span class="muted" style="font-size:13px;font-weight:700">לחיצה על נקודה מציגה פרטים וניווט</span>
          </div>

          <div class="map-stage">
            <div class="valley-svg-wrap">
              <svg
                class="valley-svg"
                viewBox="0 0 800 400"
                role="img"
                aria-label="מפה סכמטית של עמק ליביניו, שני רכסי הגלישה והמיקומים המרכזיים בכפר"
              >
                <!-- Sky & Distant Alpine Peaks -->
                <rect x="0" y="0" width="800" height="400" fill="var(--m-sky)" />
                <polygon
                  points="0,155 90,85 195,48 295,120 390,148 485,112 585,58 690,95 800,145 800,400 0,400"
                  fill="var(--m-far)"
                />
                <!-- West Ridge: Carosello 3000 -->
                <polygon
                  points="0,240 60,150 185,68 310,185 350,245 0,245"
                  fill="var(--m-snow)"
                  stroke="var(--navy)"
                  stroke-width="2"
                />
                <!-- East Ridge: Mottolino & Passo Foscagno -->
                <polygon
                  points="430,250 495,165 585,82 695,148 800,190 800,265 430,265"
                  fill="var(--m-snow)"
                  stroke="var(--navy)"
                  stroke-width="2"
                />
                <!-- Valley Floor -->
                <polygon points="0,225 800,240 800,400 0,400" fill="var(--m-valley)" />
                <!-- Spoel River & Free Bus / Pedestrian Spine -->
                <path
                  d="M 80 355 Q 250 265 415 245 T 765 215"
                  fill="none"
                  stroke="var(--m-river)"
                  stroke-width="8"
                  stroke-linecap="round"
                  opacity="0.65"
                />
                <path
                  d="M 110 335 Q 275 255 425 238 T 745 208"
                  fill="none"
                  stroke="var(--navy)"
                  stroke-width="3"
                  stroke-dasharray="7 6"
                />
                <!-- Ski Pistes & Gondola Lines -->
                <line x1="210" y1="120" x2="295" y2="232" stroke="var(--navy)" stroke-width="1.8" />
                <path d="M 198 122 Q 245 178 335 218" fill="none" stroke="var(--p-blue)" stroke-width="4" stroke-linecap="round" />
                <line x1="565" y1="138" x2="465" y2="244" stroke="var(--navy)" stroke-width="1.8" />
                <path d="M 565 142 Q 520 195 452 246" fill="none" stroke="var(--p-red)" stroke-width="4" stroke-linecap="round" />
                <path d="M 580 135 Q 565 190 520 252" fill="none" stroke="var(--p-black)" stroke-width="3.5" stroke-linecap="round" />

                <!-- Ridge Labels -->
                <text x="185" y="54" text-anchor="middle" font-family="var(--mono)" font-size="13" font-weight="700" fill="var(--ink)">
                  CAROSELLO 3000 · 2,900m
                </text>
                <text x="585" y="68" text-anchor="middle" font-family="var(--mono)" font-size="13" font-weight="700" fill="var(--ink)">
                  MOTTOLINO · 2,785m
                </text>
                <text x="410" y="368" text-anchor="middle" font-family="var(--sans)" font-size="13.5" font-weight="800" fill="var(--ink-2)">
                  מדרחוב החנויות הפטור ממכס + קו אוטובוס סקי חינמי לאורך העמק
                </text>

                <!-- Interactive Numbered Pins -->
                ${vm.villageMapPins.map(
                  (pin, idx) => html`
                    <g
                      class="map-pin-group${idx === 0 ? ' is-selected' : ''}"
                      data-pin-id="${pin.id}"
                      data-who="${pin.forWho.join(',')}"
                      tabindex="0"
                      role="button"
                      aria-label="${pin.labelHe}"
                    >
                      <circle
                        class="pin-ring"
                        cx="${pin.x}"
                        cy="${pin.y}"
                        r="22"
                        fill="none"
                        stroke="var(--accent)"
                        stroke-width="3"
                      />
                      <circle
                        cx="${pin.x}"
                        cy="${pin.y}"
                        r="15"
                        fill="${pinColor(pin.category)}"
                        stroke="#0F2338"
                        stroke-width="2.2"
                      />
                      <text
                        x="${pin.x}"
                        y="${pin.y + 5}"
                        text-anchor="middle"
                        font-family="var(--mono)"
                        font-size="13"
                        font-weight="700"
                        fill="${pinInk(pin.category)}"
                      >
                        ${idx + 1}
                      </text>
                    </g>
                  `
                )}
              </svg>
            </div>

            <div class="map-inspector" id="mapInspector">
              <div>
                <span class="chip c-ac" id="mapPinDistance">${firstPin.walkFromCalandaHe}</span>
                <h3 style="font-size:22px;font-weight:800;margin-top:8px" id="mapPinTitle">${firstPin.labelHe}</h3>
                <p class="mono muted" style="margin:2px 0 8px;font-size:13px" id="mapPinEn">${firstPin.labelEn}</p>
                <p style="margin:0 0 10px;font-size:15.5px;color:var(--ink-2)" id="mapPinSummary">
                  ${firstPin.summaryHe}
                </p>
                <p style="margin:0;font-size:13.5px;font-weight:700" id="mapPinWho">
                  רלוונטי ל: ${firstPin.forWhoNamesHe}
                </p>
              </div>
              <div>
                <a
                  class="btn-action"
                  id="mapPinLink"
                  href="${firstPin.mapUrl}"
                  target="_blank"
                  rel="noopener"
                >
                  פתיחה ב-Google Maps ↗
                </a>
              </div>
            </div>
          </div>

          <div class="pin-pills">
            ${vm.villageMapPins.map(
              (pin, idx) => html`
                <button
                  type="button"
                  class="pin-pill${idx === 0 ? ' is-selected' : ''}"
                  data-pin-btn="${pin.id}"
                  aria-pressed="${idx === 0 ? 'true' : 'false'}"
                >
                  <span class="mono">${idx + 1}.</span> ${pin.labelHe}
                </button>
              `
            )}
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderWeekSection(vm: TripViewModel): SafeHtml {
  const pickSchool = vm.decided.schools.find((s) => s.pick)?.name ?? 'Scuola Sci Centrale';
  const pickRental = vm.decided.rentals.find((r) => r.pick)?.name ?? 'Sport4U';
  const dots = rawHtml('<i></i>'.repeat(vm.dates.skiDays));
  const airportBeforeHours = vm.dates.airportBeforeMin / 60;
  const courseStartClock = vm.dates.courseHoursText.split('–')[0] ?? '11:00';
  const altSpanText = `${vm.decided.baseM.toLocaleString('en-US')}–${vm.decided.topM.toLocaleString('en-US')}`;

  return html`
    <section id="week">
      <div class="wrap narrow">
        <h2 class="t">השבוע, תחנה אחרי תחנה</h2>
        <p class="sub">
          כל השעות נגזרות אוטומטית מהטיסות ומזמן הנסיעה: נחיתה + <span class="mono">${vm.dates.airportExitMin}</span> דקות לביקורת גבולות EES וכבודה +
          <span class="mono">${vm.decided.transferHe}</span> נסיעה. בחזרה — התייצבות במלפנסה <span class="mono">${airportBeforeHours}</span> שעות לפני ההמראה ועוד מרווח ביטחון לדרך.
        </p>

        <ol class="cable" id="weektable">
          <li class="station top">
            <div class="st-when"><span>ליל ${vm.dates.startDow}</span><span class="mono">${vm.dates.startDm}</span></div>
            <div class="st-pole" aria-hidden="true"><i></i></div>
            <div class="st-what">
              <b>בנתב״ג עד <span class="mono">${vm.flights.out.airportByClock}</span></b>
              <span>טיסה <b class="mono">${vm.flights.out.flight}</b> ממריאה ב-<b class="mono">${vm.flights.out.dep}</b>. ${vm.flights.baggageHe}.</span>
            </div>
          </li>

          <li class="station">
            <div class="st-when"><span>${vm.dates.startDow}</span><span class="mono">${vm.dates.startDm}</span></div>
            <div class="st-pole" aria-hidden="true"><i></i></div>
            <div class="st-what">
              <b>נוחתים במלפנסה ב-<span class="mono">${vm.flights.out.arr}</span></b>
              <span>
                ביקורת גבולות EES ומזוודות, ואז נסיעה של <b class="mono">${vm.decided.transferHe}</b> דרך הוולטלינה ומעבר Foscagno — בליביניו בסביבות
                <b class="mono">${vm.decided.arriveHe}</b>.
                ${vm.firstNight
                  ? html`<b>לילה ראשון ב-${vm.firstNight.name}</b> (${vm.firstNight.whereHe}, צ׳ק-אין מ-<b class="mono">${vm.firstNight.checkIn}</b>). מנוחה ושינה מוקדמת.`
                  : ''}
              </span>
            </div>
          </li>

          <li class="station">
            <div class="st-when"><span>${vm.dates.aptInDow}</span><span class="mono">${vm.dates.aptInDm}</span></div>
            <div class="st-pole" aria-hidden="true"><i></i></div>
            <div class="st-what">
              <b>עוברים ל-Calanda — ויום סקי ראשון</b>
              <span>
                יוצאים מ-${vm.firstNight?.name ?? 'המלון'} עד <b class="mono">${vm.firstNight?.checkOut ?? '10:00'}</b>, משאירים מזוודות ב-${vm.apartment.name},
                אוספים ציוד ב-<b>${pickRental}</b> באותו רחוב ועולים לשלג עוד לפני פתיחת הקורס מחר. אחר הצהריים כניסה לדירה וקנייה בסופר.
              </span>
            </div>
          </li>

          <li class="station">
            <div class="st-when">
              <span>א׳ עד ו׳</span>
              <span class="mono">${vm.dates.courseStartDm}–${vm.dates.courseEndDm}</span>
            </div>
            <div class="st-pole" aria-hidden="true"><i></i></div>
            <div class="st-what">
              <b>${vm.dates.courseDays} ימי קורס וגלישה מלאים</b>
              <span>
                הבנות בקורס ב-<b>${pickSchool}</b> (<span class="mono">${vm.dates.courseHoursText}</span> ב-Campo Scuola 23 ליד הדירה),
                ראובן בשני צדי העמק, אורית ב-Aquagranda ובמדרחוב, ומפגש צהריים משפחתי בהר או בכפר.
                <span class="skidays">${dots}<b>${vm.dates.skiDays} ימי סקי בסך הכול במנוי</b></span>
              </span>
            </div>
          </li>

          <li class="station">
            <div class="st-when"><span>${vm.dates.endDow}</span><span class="mono">${vm.dates.endDm}</span></div>
            <div class="st-pole" aria-hidden="true"><i></i></div>
            <div class="st-what">
              <b>הביתה: <span class="mono">${vm.flights.back.flight}</span> ב-<span class="mono">${vm.flights.back.dep}</span></b>
              <span>
                צ׳ק-אאוט בבוקר. אופציה לבוקר סקי אחרון עד ~<b class="mono">${vm.decided.lastSkiHe}</b> ומקלחת ב-Aquagranda, או עצירה על אגם קומו בדרך.
                יוצאים מליביניו עד <b class="mono">${vm.decided.leaveByHe}</b>, במלפנסה עד <b class="mono">${vm.flights.back.airportByClock}</b>.
              </span>
            </div>
          </li>

          <li class="station end">
            <div class="st-when"><span>${vm.dates.homeLandingDow}</span><span class="mono">${vm.dates.homeLandingDm}</span></div>
            <div class="st-pole" aria-hidden="true"><i></i></div>
            <div class="st-what">
              <b>נחיתה בנתב״ג ב-<span class="mono">${vm.flights.back.arr}</span> לפנות בוקר</b>
            </div>
          </li>
        </ol>

        <div class="grid2" style="margin-top:22px">
          <div class="info">
            <h4>שבת הראשונה — יום סקי, לא יום פקקים</h4>
            <ul>
              <li><b>שבת היא יום ההחלפה באלפים</b> והכבישים לעמקים עמוסים. לינה בשישי כבר בתוך ליביניו חוסכת לכם את כל הפקק.</li>
              <li>מעבר קצר מ-${vm.firstNight?.name ?? 'ליל שישי'} ל-Calanda, השארת מזוודות (לאשר מול Omar), איסוף ציוד ב-${pickRental} הצמודה — והמנוי ל-${vm.dates.skiDays} ימים מתחיל לעבוד.</li>
              <li>שעתיים רגועות לבנות על מסלול הלימוד בשבת נותנות ביטחון עצום לקראת תחילת הקורס ביום ראשון ב-<span class="mono">${courseStartClock}</span>.</li>
            </ul>
          </div>
          <div class="info">
            <h4>השבת האחרונה (${vm.dates.endLongHe}) — שתי אפשרויות</h4>
            <ul>
              <li><b>אפשרות א׳ — בוקר סקי אחרון:</b> גלישה עד ~<span class="mono">${vm.decided.lastSkiHe}</span> (כרטיס בוקר יומי בקופה), מקלחת והתארגנות במתחם Aquagranda ויציאה ב-<span class="mono">${vm.decided.leaveByHe}</span>.</li>
              <li><b>אפשרות ב׳ — אגם קומו בדרך לשדה:</b> יציאה רגועה בבוקר ועצירה של שעתיים בורנה (Varenna) או בלאג׳ו לארוחת צהריים על שפת האגם.</li>
            </ul>
          </div>
        </div>

        <details class="q">
          <summary>מה אומרים התאריכים — שלג, עומס, מחיר, מזג אוויר ולימודים</summary>
          <div class="qb">
            <div class="tablewrap">
              <table>
                <thead><tr><th>נושא</th><th>מה זה אומר בפועל</th></tr></thead>
                <tbody>
                  <tr>
                    <td><b>שלג</b></td>
                    <td>סוף פברואר ותחילת מרץ הם שיא בסיס השלג של כל החורף, והטמפרטורות בגובה <span class="mono">${altSpanText}</span> מ׳ שומרות על שלג איכותי ויבש.</td>
                  </tr>
                  <tr>
                    <td><b>עומס</b></td>
                    <td>שבוע הקרנבל האיטלקי (יום רביעי של האפר ב-10.2.2027) כבר מאחור. שיא עונה מסודר ונעים יותר משבועות החופשה של מרכז אירופה באוסטריה/צרפת.</td>
                  </tr>
                  <tr>
                    <td><b>מחיר ועונה</b></td>
                    <td>תעריפי שיא עונה (<span class="ltr">Alta Stagione</span>) בליביניו נמשכים עד סוף מרץ — מבצע <span class="ltr">Skipass Free</span> מתחיל רק באמצע אפריל ולכן אינו חל בתאריכים שלכם; התמחור במחירון כבר מבוסס על מחירי שיא עונה מלאים.</td>
                  </tr>
                  <tr>
                    <td><b>מזג אוויר</b></td>
                    <td>בכפר סביב −5° עד 0° בצהריים, בפסגות −11° עד −4° (עם רוח קר יותר). ביום שלג סוער שבו רכבלים עליונים נסגרים — Aquagranda והמדרחוב של ליביניו מצילים את היום.</td>
                  </tr>
                  <tr>
                    <td><b>בית ספר (גלי)</b></td>
                    <td>גלי מפספסת את ימי ראשון–חמישי של השבוע, ובעקבות הנחיתה ב-${vm.flights.back.arr} בלילה שבין שבת לראשון — סביר שגם את יום ראשון שאחרי.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </div>
    </section>
  `;
}

export function renderPartySection(vm: TripViewModel): SafeHtml {
  return html`
    <section id="who">
      <div class="wrap">
        <h2 class="t">${vm.party.peopleHe} כרטיסים — והשבוע של כל אחד</h2>
        <p class="sub">
          פס שחור — גולש מנוסה, כחול — מתחילה בקורס, צהוב — ללא סקי. לחצו על כל בן משפחה כדי להדגיש
          את הפרטים האישיים שלו (הזמנת טיסה ומושבים, מדרגת גיל, ציוד ומיקומים במפת הכפר).
        </p>

        <div class="member-filter-bar" id="memberFilterBar" role="group" aria-label="סינון לפי בן משפחה">
          <button type="button" class="member-btn is-active" data-member-filter="all" aria-pressed="true">
            כל המשפחה (${vm.party.peopleCount})
          </button>
          ${vm.party.members.map(
            (m) => html`
              <button type="button" class="member-btn" data-member-filter="${m.id}" aria-pressed="false">
                ${m.nameHe}
              </button>
            `
          )}
        </div>

        <div class="tickets" id="tickets">
          ${vm.party.members.map(
            (m) => html`
              <div
                class="ticket g-${m.grade}"
                data-member-card="${m.id}"
                tabindex="0"
                role="button"
                aria-label="כרטיס נוסע: ${m.nameHe}"
              >
                <div class="tk-top">
                  <div class="tk-main">
                    <b>${m.nameHe}</b>
                    <span>${m.age ? `בת ${m.age} · ` : ''}${m.roleHe}</span>
                  </div>
                  <div class="tk-stub">
                    <span>${m.skis ? m.bandHe : 'ללא מנוי'}</span>
                    <span class="mono">${m.passText}</span>
                  </div>
                </div>
                <div class="tk-detail">
                  <div><b>טיסה ומושבים:</b> ${m.bookingGroupLabelHe} · ${m.seatsStatusHe}</div>
                  <div><b>מנוי וגיל:</b> ${m.birthYearRuleHe}</div>
                  <div><b>ציוד:</b> ${m.gearTierHe}</div>
                  <div><b>במהלך היום:</b> ${m.scheduleFocusHe}</div>
                </div>
              </div>
            `
          )}
        </div>

        <div class="note" style="margin-top:16px">
          <b>מדרגות הגיל בליביניו חוסכות מאות יורו:</b> ${vm.party.bandsSummaryHe}. הזכאות נקבעת לפי
          <b>שנת הלידה בדרכון</b> ולא לפי תאריך יום ההולדת — לאמת במחירון הרשמי לפני רכישת המנויים.
        </div>
      </div>
    </section>
  `;
}
