import type { TripViewModel } from '../domain/deriveTrip.js';
import { html, type SafeHtml } from '../domain/format.js';

export function renderStaySection(vm: TripViewModel): SafeHtml {
  const a = vm.apartment;
  const fn = vm.firstNight;

  return html`
    <section id="stay">
      <div class="wrap">
        <h2 class="t">איפה ישנים — שתי הדירות שהוזמנו</h2>
        <p class="sub">
          ${vm.dates.nightsSplitHe}: הדירה המרכזית ב-Calanda הוזמנה משבת עד שבת, והלילה הראשון של
          ${vm.dates.startLongHe} הוזמן ב-${fn?.name ?? 'ליביניו'} בתוך הכפר עצמו (ל-Calanda לא הייתה זמינות ב-${vm.dates.startDm}).
        </p>

        <div class="chalets">
          ${fn
            ? html`
                <div class="chalet" id="fridaycard">
                  <div class="roof" id="friday">
                    <span class="ch-when">לילה ראשון · ${vm.dates.startLongHe} · הוזמן ב-${fn.bookedDm}</span>
                    <h4>${fn.name}</h4>
                    <p>${fn.unitShortHe}, ${fn.whereHe}. כניסה ${fn.checkIn}–${fn.checkInUntil}, יציאה עד ${fn.checkOut}.</p>
                    <div class="ch-foot">
                      <span>ביטול חינם עד ${fn.freeCancelDm}</span>
                      <span class="mono">${fn.totalText}</span>
                    </div>
                  </div>
                  <div class="ch-body">
                    <dl class="kv">
                      <dt>כתובת</dt><dd>${fn.address} (${fn.whereHe})</dd>
                      <dt>הרכב</dt><dd>${fn.unitHe}</dd>
                      <dt>צ׳ק-אין</dt><dd>${vm.dates.startDow}, <span class="mono">${fn.checkIn}–${fn.checkInUntil}</span></dd>
                      <dt>צ׳ק-אאוט</dt><dd>${vm.dates.aptInDow}, <span class="mono">${fn.checkOutFrom}–${fn.checkOut}</span></dd>
                      <dt>תמחור</dt><dd><span class="mono">${fn.bookingText}</span> דרך Booking (כולל מע״מ וניקיון <span class="mono">${fn.cleaningText}</span>) + <span class="mono">${fn.thereTaxText}</span> מס עירוני במקום</dd>
                      <dt>סטטוס חיוב</dt><dd>טרם נגבה — Booking יחייב את הכרטיס אוטומטית סמוך למועד</dd>
                      <dt>תנאי ביטול</dt><dd><b>${fn.cancelSummaryHe}</b></dd>
                      <dt>מס׳ אישור ו-PIN</dt><dd>שמורים במייל של Booking (מוגנים ולא מודפסים בדף הציבורי)</dd>
                    </dl>
                    <div class="grid2" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line-soft)">
                      <div>
                        <h5>יתרונות מרכזיים</h5>
                        <ul>
                          ${fn.goodHe.map((x) => html`<li>${x}</li>`)}
                        </ul>
                      </div>
                      <div>
                        <h5>לשאול את המארח מראש</h5>
                        <ul>
                          ${fn.askHe.map((x) => html`<li>${x}</li>`)}
                        </ul>
                      </div>
                    </div>
                    <div class="links">
                      <a class="glink" href="${fn.mapUrl}" target="_blank" rel="noopener">מיקום ב-Google Maps</a>
                      <a class="glink" href="${fn.googleHotelsUrl}" target="_blank" rel="noopener">Google Hotels · ${vm.dates.startDm}</a>
                    </div>
                  </div>
                </div>
              `
            : ''}

          <div class="chalet" id="aptcard">
            <div class="roof">
              <span class="ch-when">${vm.dates.aptNights} לילות · ${vm.dates.aptSpanHe} · הוזמנה ב-${a.bookedDm}</span>
              <h4>${a.name}</h4>
              <p>${a.address}, במרכז ליביניו. כ-<span class="mono">${a.perNightText}</span> ללילה.</p>
              <div class="ch-foot">
                <span>שולם ${a.paidText} · יתרה ${a.balanceText}</span>
                <span class="mono">${a.totalText}</span>
              </div>
            </div>
            <div class="ch-body">
              <dl class="kv">
                <dt>היחידה</dt><dd>${a.unitHe}</dd>
                <dt>כתובת</dt><dd><span class="ltr">${a.address}</span></dd>
                <dt>מארח</dt><dd>${a.hostHe}</dd>
                <dt>טלפון / WhatsApp</dt><dd><span class="ltr">${a.phone}</span></dd>
                <dt>אופן הזמנה</dt><dd>${a.bookedDm} · ${a.bookedViaHe}</dd>
                <dt>שולם עד כה</dt><dd><b><span class="mono">${a.paidText}</span></b> מקדמה ב-${a.paidOnDm} (${a.paidHowHe}) · <b>${a.refundHe}</b></dd>
                <dt>נותר לתשלום</dt><dd><b><span class="mono">${a.balanceText}</span></b> יתרה + ~<span class="mono">${a.taxText}</span> מס עירוני = ~<span class="mono">${a.dueOnSiteOrBalanceText}</span></dd>
                <dt>קוד אסמכתא</dt><dd>שמור במייל האישור (מוגן ולא מודפס בדף הציבורי)</dd>
              </dl>
              <div class="grid2" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line-soft)">
                <div>
                  <h5>מה מצוין בה</h5>
                  <ul>
                    ${a.factsHe.map((x) => html`<li>${x}</li>`)}
                  </ul>
                </div>
                <div>
                  <h5>4 שאלות פתוחות ל-Omar</h5>
                  <ul>
                    ${a.askHe.map((x) => html`<li>${x}</li>`)}
                  </ul>
                </div>
              </div>
              <div class="links">
                <a class="glink" href="${a.url}" target="_blank" rel="noopener">האתר הרשמי של Calanda</a>
                <a class="glink" href="${a.bookingPage}" target="_blank" rel="noopener">עמוד הנכס והביקורות ב-Booking</a>
                <a class="glink" href="${a.googleHotelsUrl}" target="_blank" rel="noopener">Google Hotels · ${vm.dates.aptSpanHe}</a>
              </div>
            </div>
          </div>
        </div>

        <div class="note" style="margin-top:16px">
          <b>סטטוס מקדמת Calanda וביטוח BeSafe Plus:</b> ${a.besafeNoteHe}
        </div>

        <!-- Ready-to-Send Host Message Studio -->
        <div class="msg-studio" id="hostMessageStudio">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px">
            <div>
              <h4 style="font-size:18px;font-weight:800">הודעות מוכנות לשליחה למארחים (לסגירת השאלות הפתוחות בדקה)</h4>
              <p class="muted" style="margin:2px 0 0;font-size:14.5px">
                הטקסטים כבר כוללים את התאריכים, הרכב המשפחה, שעת הנחיתה וכל השאלות החסרות — באנגלית או באיטלקית.
              </p>
            </div>
            <div style="display:flex;gap:6px" role="group" aria-label="בחירת שפת ההודעה למארחים">
              <button type="button" class="tf-filter is-active" data-msg-lang="en" aria-pressed="true">English</button>
              <button type="button" class="tf-filter" data-msg-lang="it" aria-pressed="false">Italiano</button>
            </div>
          </div>

          <div class="msg-grid">
            ${vm.hostMessages.map(
              (m) => html`
                <div class="msg-card" data-msg-card="${m.id}">
                  <div>
                    <b style="font-size:16px;display:block">${m.recipientTitleHe}</b>
                    <span class="muted" style="font-size:13px">${m.channelHe} · ${m.bookingHelperHe}</span>
                  </div>
                  <pre
                    class="msg-pre"
                    data-body-en="${m.bodyEn}"
                    data-body-it="${m.bodyIt}"
                  >${m.bodyEn}</pre>
                  <div class="msg-actions">
                    <button type="button" class="btn-action secondary copy-msg-btn" data-copy-target="${m.id}">
                      העתקת נוסח ההודעה
                    </button>
                    ${m.whatsappUrl
                      ? html`
                          <a
                            class="btn-action"
                            href="${m.whatsappUrl}"
                            target="_blank"
                            rel="noopener"
                            data-wa-link="${m.id}"
                          >
                            שליחה ישירה ב-WhatsApp ↗
                          </a>
                        `
                      : ''}
                    <span class="muted copy-feedback" data-feedback="${m.id}" style="font-size:13px;font-weight:700"></span>
                  </div>
                </div>
              `
            )}
          </div>
        </div>

        <details class="q" id="friday-alts">
          <summary>להשוואה: אפשרויות לילה ראשון נוספות שנבדקו ב-${vm.fridayComparison.checkedDateText}</summary>
          <div class="qb">
            <p style="margin:0 0 12px;color:var(--ink-2)">
              נבדקו ${vm.fridayComparison.count} אפשרויות לחמישה עם ביטול חינם בטווח
              <span class="mono">${vm.fridayComparison.minText}–${vm.fridayComparison.maxText}</span>.
              בתוך ליביניו עצמה אף אפשרות לא הייתה זולה מ-${fn?.name ?? 'Casa Noemi'} (<span class="mono">${fn?.totalText ?? ''}</span>);
              הזולות יותר (<span class="mono">${vm.fridayComparison.cheaperRangeText}</span>) ממוקמות בוולדידנטרו ובבורמיו מעבר למעבר ההרים
              (${vm.fridayComparison.cheaperMinutesHe} נסיעה בשבת בבוקר).
            </p>
            <div class="tablewrap" id="fridaytable">
              <table>
                <thead>
                  <tr>
                    <th>מלון</th>
                    <th>אזור</th>
                    <th>לחמישה</th>
                    <th>דירוג</th>
                    <th>ל-Calanda בשבת</th>
                    <th>דגשים</th>
                    <th>קישורים</th>
                  </tr>
                </thead>
                <tbody>
                  ${vm.decided.firstNightOptions.map(
                    (h) => html`
                      <tr>
                        <td>
                          <b>${h.name}</b>
                          ${h.pick ? html` <span class="chip c-wn">ההמלצה הקודמת</span>` : ''}
                          ${h.stars ? html`<br /><span class="muted">${h.stars}★</span>` : ''}
                        </td>
                        <td>${h.areaHe ?? ''}</td>
                        <td class="p">
                          <b>${h.eurText ?? ''}</b>
                          ${h.freeCancel ? html`<br /><span class="chip c-ok">ביטול חינם</span>` : ''}
                        </td>
                        <td class="p">
                          ${h.score !== undefined ? h.score.toFixed(1) : '—'}
                          ${h.reviews ? html`<br /><span class="muted">${h.reviews.toLocaleString('en-US')} ביקורות</span>` : ''}
                        </td>
                        <td>${h.toLivignoHe ?? ''}</td>
                        <td>${h.whatHe}</td>
                        <td>
                          ${h.bookingDatedUrl
                            ? html`<a class="glink" href="${h.bookingDatedUrl}" target="_blank" rel="noopener">Booking · ${vm.dates.startDm}</a><br />`
                            : ''}
                          <a class="glink" href="${h.googleHotelsUrl}" target="_blank" rel="noopener">Google Hotels</a>
                        </td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </div>
    </section>
  `;
}

export function renderGettingSection(vm: TripViewModel): SafeHtml {
  const car = vm.decided.carOption;
  const cr = vm.carRental;
  const tb = vm.transferBooked;

  return html`
    <section id="getting">
      <div class="wrap">
        <h2 class="t">משדה התעופה מלפנסה ובחזרה${tb ? ' — ההסעה הוזמנה' : ''}</h2>
        <p class="sub">
          <span class="mono">${vm.decided.transferHe}</span> לכיוון ממילאנו מלפנסה (MXP) דרך Lecco, עמק הוולטלינה ומעבר Foscagno.
          ${tb
            ? html`ההסעה הפרטית הלוך-חזור אושרה מול <b>${tb.provider}</b> (${tb.contactName}) ב-<span class="mono">${tb.returnText}</span> (<span class="mono">${tb.wayText}</span> לכיוון ל-5 נוסעים / <span class="mono">${tb.wayFor4Text}</span> ל-4) — חוסכת <span class="mono">${tb.savedVsPickText}</span> לעומת ההצעה הקודמת.`
            : html`ההעדפה שלך היא הסעה פרטית עם נהג וביטול חינם — ולצדה מוצג תחשיב מלא של השכרת וואן 7 מקומות להשוואה.`}
        </p>

        ${tb
          ? html`
              <div class="chalet" id="transfercard" style="margin-bottom:20px">
                <div class="roof">
                  <span class="ch-when">הלוך וחזור · אושר ב-${tb.bookedDm} · ביטול חינם</span>
                  <h4>${tb.provider} — ${tb.contactName}</h4>
                  <p>${tb.vehicleHe}. ${tb.luggageHe}.</p>
                  <div class="ch-foot">
                    <span>תשלום ישיר לנהג במזומן או אשראי · ללא מקדמה</span>
                    <span class="mono">${tb.returnText} (${tb.wayText} לכיוון)</span>
                  </div>
                </div>
                <div class="ch-body">
                  <dl class="kv">
                    <dt>ספק ואיש קשר</dt><dd><b>${tb.provider}</b> · ${tb.contactName} (<span class="ltr">${tb.email}</span>)</dd>
                    <dt>סטטוס הזמנה</dt><dd>${tb.bookedViaHe}</dd>
                    <dt>רכב וכבודה</dt><dd>${tb.vehicleHe} — ${tb.luggageHe}</dd>
                    <dt>הלוך (${vm.dates.startDm})</dt><dd>${tb.outboundPickupHe}</dd>
                    <dt>חזור (${vm.dates.endDm})</dt><dd>איסוף מ-${vm.apartment.name} בשעה <b class="mono">${tb.returnPickupClock}</b> — ${tb.returnPickupNoteHe}</dd>
                    <dt>תמחור מאושר</dt><dd><b><span class="mono">${tb.wayText}</span> לכיוון (<span class="mono">${tb.returnText}</span> הלוך-חזור)</b> ל-5 נוסעים · ל-4 נוסעים: <span class="mono">${tb.wayFor4Text}</span> לכיוון (<span class="mono">${tb.returnFor4Text}</span> הלוך-חזור, תוספת <span class="mono">${tb.extraPaxWayText}</span> לכיוון לכל נוסע נוסף)</dd>
                    <dt>תשלום וביטול</dt><dd>${tb.payMethodHe} · <b>${tb.freeCancelHe}</b></dd>
                    <dt>מפגש ופרטי נהג</dt><dd>${tb.meetingPointHe}. ${tb.driverDetailsNoteHe}.</dd>
                  </dl>
                  <div class="grid2" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line-soft)">
                    <div>
                      <h5>נשאר לסגור מול ${tb.contactName}</h5>
                      <ul>
                        ${tb.pendingItemsHe.map((x) => html`<li>${x}</li>`)}
                      </ul>
                    </div>
                    <div>
                      <h5>דגשי הטיסות והכתובות</h5>
                      <ul>
                        <li><b>טיסת הגעה:</b> <span class="mono">${vm.flights.out.flight}</span> נוחתת ב-<span class="mono">${vm.flights.out.arr}</span> בטרמינל 1 (לשמור מרווח לרישום EES).</li>
                        <li><b>יעד ההורדה בשישי:</b> ${vm.firstNight?.name ?? 'ליל שישי'} (<span class="ltr">${vm.firstNight?.address ?? 'Livigno'}</span>).</li>
                        <li><b>איסוף בשבת האחרונה:</b> מ-${vm.apartment.name} (<span class="ltr">${vm.apartment.address}</span>) ב-<span class="mono">${tb.returnPickupClock}</span>, הגעה למלפנסה עד <span class="mono">${vm.flights.back.airportByClock}</span>.</li>
                      </ul>
                    </div>
                  </div>
                  <div class="links">
                    <a class="glink" href="${tb.url}" target="_blank" rel="noopener">אתר ${tb.provider}</a>
                    <a class="glink" href="#hostMessageStudio">נוסח מייל מוכן לשליחת פרטי הטיסה ↗</a>
                  </div>
                </div>
              </div>
            `
          : ''}

        ${tb
          ? html`
              <details class="q" id="transfer-alts">
                <summary>להשוואה: הצעות הסעה נוספות והשכרת וואן שנבדקו לפני ההזמנה</summary>
                <div class="qb">
                  <div class="tablewrap" id="transferstable">
                    <table>
                      <thead>
                        <tr>
                          <th>אפשרות</th>
                          <th>הלוך וחזור (5)</th>
                          <th>לכיוון</th>
                          <th>פירוט ותנאי ביטול</th>
                          <th>קישור</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr class="pickrow">
                          <td>
                            <b>${tb.provider} — מיניוואן מרצדס</b> <span class="chip c-ok">הוזמן</span>
                            <br />
                            <span class="chip c-ok">מאושר במייל</span>
                          </td>
                          <td class="p"><b>${tb.returnText}</b></td>
                          <td class="p">${tb.wayText}</td>
                          <td>
                            ${tb.vehicleHe} · ${tb.luggageHe}
                            <br /><b>תשלום:</b> ${tb.payMethodHe}
                            <br /><b>ביטול:</b> ${tb.freeCancelHe}
                          </td>
                          <td><a class="glink" href="${tb.url}" target="_blank" rel="noopener">אתר הספק</a></td>
                        </tr>
                        ${vm.decided.transferOptions.map(
                          (o) => html`
                            <tr>
                              <td>
                                <b>${o.name}</b>
                                ${o.pick ? html` <span class="chip c-wn">ההמלצה הקודמת</span>` : ''}
                                <br />
                                <span class="chip ${o.conf === 'quoted' ? 'c-ok' : 'c-wn'}">
                                  ${o.conf === 'quoted' ? 'מחיר מפורסם' : 'חישוב שלנו'}
                                </span>
                              </td>
                              <td class="p"><b>~${o.eurText}</b></td>
                              <td class="p">~${o.wayText}</td>
                              <td>
                                ${o.whatHe}
                                ${o.watchHe ? html`<br /><span class="muted">${o.watchHe}</span>` : ''}
                                ${o.freeCancelHe ? html`<br /><b>ביטול:</b> ${o.freeCancelHe}` : ''}
                              </td>
                              <td><a class="glink" href="${o.url}" target="_blank" rel="noopener">לעמוד ההזמנה</a></td>
                            </tr>
                          `
                        )}
                        <tr class="car">
                          <td>
                            <b>${car.nameHe}</b> <span class="chip c-ac">חלופה בסימולטור</span>
                            <br />
                            <span class="chip c-wn">חישוב שלנו</span>
                          </td>
                          <td class="p"><b>~${car.eurText}</b></td>
                          <td class="p">—</td>
                          <td>
                            ${car.whatHe}
                            <br />
                            <span class="muted">${car.watchHe}</span>
                            <br />
                            <b>ביטול:</b> ${cr.freeCancelHe}
                          </td>
                          <td>
                            <a class="glink" href="${car.url}" target="_blank" rel="noopener">DiscoverCars</a><br />
                            <a class="glink" href="${car.compareUrl}" target="_blank" rel="noopener">Kayak</a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            `
          : html`
              <h3 class="t">
                הסעות לחמישה עם מזוודות — הלוך וחזור
                <span class="chip c-wn">להזמין מראש</span>
              </h3>
              <div class="tablewrap" id="transferstable">
                <table>
                  <thead>
                    <tr>
                      <th>אפשרות</th>
                      <th>הלוך וחזור (5)</th>
                      <th>לכיוון</th>
                      <th>פירוט ותנאי ביטול</th>
                      <th>להזמנה</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vm.decided.transferOptions.map(
                      (o) => html`
                        <tr class="${o.pick ? 'pickrow' : ''}">
                          <td>
                            <b>${o.name}</b>
                            ${o.pick ? html` <span class="chip c-ok">המומלצת</span>` : ''}
                            <br />
                            <span class="chip ${o.conf === 'quoted' ? 'c-ok' : 'c-wn'}">
                              ${o.conf === 'quoted' ? 'מחיר מפורסם' : 'חישוב שלנו'}
                            </span>
                          </td>
                          <td class="p"><b>~${o.eurText}</b></td>
                          <td class="p">~${o.wayText}</td>
                          <td>
                            ${o.whatHe}
                            ${o.watchHe ? html`<br /><span class="muted">${o.watchHe}</span>` : ''}
                            ${o.freeCancelHe ? html`<br /><b>ביטול:</b> ${o.freeCancelHe}` : ''}
                          </td>
                          <td><a class="glink" href="${o.url}" target="_blank" rel="noopener">לעמוד ההזמנה</a></td>
                        </tr>
                      `
                    )}
                    <tr class="car">
                      <td>
                        <b>${car.nameHe}</b> <span class="chip c-ac">חלופה בסימולטור</span>
                        <br />
                        <span class="chip c-wn">חישוב שלנו</span>
                      </td>
                      <td class="p"><b>~${car.eurText}</b></td>
                      <td class="p">—</td>
                      <td>
                        ${car.whatHe}
                        <br />
                        <span class="muted">${car.watchHe} · <b>${car.vsPickHe}</b></span>
                        <br />
                        <b>ביטול:</b> ${cr.freeCancelHe}
                      </td>
                      <td>
                        <a class="glink" href="${car.url}" target="_blank" rel="noopener">DiscoverCars</a><br />
                        <a class="glink" href="${car.compareUrl}" target="_blank" rel="noopener">Kayak</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="grid2" style="margin-top:18px">
                <div class="info">
                  <h4>4 פרטים שחובה לציין בהזמנת ההסעה</h4>
                  <ul>
                    <li><b>מספר טיסה (${vm.flights.out.flight}) וזמן המתנה בנחיתה</b> — רישום ה-EES החדש בגבול יכול להוסיף עיכוב.</li>
                    <li><b>5 מזוודות גדולות + 5 תיקי יד</b> — כדי שיגיע מיניוואן מרווח ולא רכב סטיישן צפוף.</li>
                    <li><b>יעד ההורדה בשישי:</b> ${vm.firstNight?.name ?? 'ליל שישי'} (<span class="ltr">${vm.firstNight?.address ?? 'Livigno'}</span>).</li>
                    <li><b>שעת האיסוף בשבת האחרונה:</b> מ-${vm.apartment.name} ב-<span class="mono">${vm.decided.leaveByHe}</span> כדי להגיע למלפנסה עד <span class="mono">${vm.flights.back.airportByClock}</span>.</li>
                  </ul>
                </div>
                <div class="info">
                  <h4>ואם בכל זאת שוכרים רכב? (${cr.nameHe} · ${cr.days} ימים)</h4>
                  <p style="margin:0 0 8px;font-size:14.5px;color:var(--ink-2)">
                    בסיס השכרה ל-<span class="mono">${cr.days}</span> ימים: ~<span class="mono">${cr.eurPerDayText}</span> ליום + ביטוח מלא ~<span class="mono">${cr.coverPerDayText}</span> ליום + ציוד חורף ~<span class="mono">${cr.winterPerDayText}</span> ליום = <b><span class="mono">${cr.baseText}</span></b> לפני דלק ואגרות (<b>ביטול:</b> ${cr.freeCancelHe}).
                  </p>
                  <ul>
                    ${cr.watchHe.map((item) => html`<li>${item}</li>`)}
                  </ul>
                </div>
              </div>
            `}
      </div>
    </section>
  `;
}
