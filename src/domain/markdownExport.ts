/**
 * Deterministic, lossless Markdown exporter built directly from TripViewModel.
 * Fixes the critical bug in legacy `tripkitMarkdown()` which scraped DOM selectors
 * and silently dropped the entire Tariff Board, Lift Tickets, Week Cable, Chalet details, and Open Tasks!
 */
import type { TripViewModel } from './deriveTrip.js';

export function generateCanonicalMarkdown(vm: TripViewModel): string {
  const lines: string[] = [];

  lines.push(`# שבוע סקי בליביניו · ${vm.dates.windowHe}`);
  lines.push('');
  lines.push(
    `**הרכב:** ${vm.party.peopleCount} נפשות (${vm.party.skiersCount} גולשים + אורית ללא סקי) · **לילות:** ${vm.dates.nights} (${vm.dates.nightsSplitHe}) · **ימי סקי:** ${vm.dates.skiDays} · **ימי קורס:** ${vm.dates.courseDays}`
  );
  lines.push('');

  // 1. Travellers
  lines.push('## 1. מי נוסע (5 כרטיסים)');
  lines.push('');
  lines.push('| שם | פרופיל | מדרגת סקי-פס | עלות מנוי משוערת | ציוד | הזמנת טיסה ומושבים |');
  lines.push('|---|---|---|---|---|---|');
  for (const m of vm.party.members) {
    lines.push(
      `| **${m.nameHe}**${m.age ? ` (בת ${m.age})` : ''} | ${m.roleHe} | ${m.bandHe} | ${m.passText} | ${m.gearTierHe} | ${m.bookingGroupLabelHe} · מושבים: ${m.seatsStatusHe} |`
    );
  }
  lines.push('');

  // 2. Flights
  lines.push('## 2. טיסות אל על (הוזמנו — 3 הזמנות נפרדות)');
  lines.push('');
  lines.push('| כיוון | טיסה | תאריך | המראה | נחיתה | משך | בשדה עד |');
  lines.push('|---|---|---|---|---|---|---|');
  lines.push(
    `| הלוך | **${vm.flights.out.flight}** | ${vm.flights.out.dateLongHe} | ${vm.flights.out.dep} (${vm.flights.out.fromHe}) | ${vm.flights.out.arr} (${vm.flights.out.toHe}) | ${vm.flights.out.duration} | ${vm.flights.out.airportByClock} |`
  );
  lines.push(
    `| חזור | **${vm.flights.back.flight}** | ${vm.flights.back.dateLongHe} | ${vm.flights.back.dep} (${vm.flights.back.fromHe}) | ${vm.flights.back.arr} (${vm.flights.back.arrDateLongHe}, ${vm.flights.back.toHe}) | ${vm.flights.back.duration} | ${vm.flights.back.airportByClock} |`
  );
  lines.push('');
  lines.push(
    `- **כבודה:** ${vm.flights.baggageHe}\n- **תשלום טיסות:** ${vm.flights.pointsTotalText} נקודות מתמיד + ${vm.flights.usdTotalText} מסים (${vm.flights.bookingCount} הזמנות נפרדות — לא לאחד את ההזמנה של ניצן).`
  );
  lines.push('');

  // 3. Stays
  lines.push('## 3. לינה בליביניו (שני המקומות הוזמנו)');
  lines.push('');
  if (vm.firstNight) {
    lines.push(`### לילה ראשון (${vm.dates.startLongHe} → ${vm.dates.aptInLongHe}): ${vm.firstNight.name}`);
    lines.push(`- **כתובת:** ${vm.firstNight.address} (${vm.firstNight.whereHe})`);
    lines.push(`- **יחידה:** ${vm.firstNight.unitHe}`);
    lines.push(
      `- **צ׳ק-אין / צ׳ק-אאוט:** כניסה ${vm.firstNight.checkIn}–${vm.firstNight.checkInUntil}, יציאה ${vm.firstNight.checkOutFrom}–${vm.firstNight.checkOut}`
    );
    lines.push(
      `- **עלות ותנאי ביטול:** ${vm.firstNight.totalText} (${vm.firstNight.bookingText} ב-Booking + ${vm.firstNight.thereTaxText} מס עירוני במקום) · ${vm.firstNight.cancelSummaryHe}`
    );
    lines.push('');
  }
  lines.push(`### דירת השבוע (${vm.dates.aptSpanHe}, ${vm.dates.aptNights} לילות): ${vm.apartment.name}`);
  lines.push(`- **כתובת ומארח:** ${vm.apartment.address} · ${vm.apartment.hostHe} (${vm.apartment.phone})`);
  lines.push(`- **יחידה:** ${vm.apartment.unitHe}`);
  lines.push(
    `- **תשלום:** סה״כ ${vm.apartment.totalText} + ~${vm.apartment.taxText} מס עירוני · שולמה מקדמה ${vm.apartment.paidText} (${vm.apartment.refundHe}) · יתרה לתשלום: ${vm.apartment.balanceText}`
  );
  lines.push(`- **לברר מול המארח:** ${vm.apartment.askHe.join(' | ')}`);
  lines.push('');

  if (vm.transferBooked) {
    const tb = vm.transferBooked;
    lines.push(`### הסעה פרטית הלוך-חזור (אושרה ב-${tb.bookedDm}): ${tb.provider} (${tb.contactName})`);
    lines.push(`- **רכב וכבודה:** ${tb.vehicleHe} · ${tb.luggageHe}`);
    lines.push(`- **הלוך:** ${tb.outboundPickupHe}`);
    lines.push(`- **חזור:** יציאה ב-${tb.returnPickupClock} מ-${vm.apartment.name} למלפנסה (${tb.returnPickupNoteHe})`);
    lines.push(
      `- **עלות ותשלום:** ${tb.returnText} (${tb.wayText} לכיוון ל-5 נוסעים / ${tb.returnFor4Text} ל-4) · ${tb.payMethodHe} · ${tb.freeCancelHe}`
    );
    lines.push(`- **קשר ופרטי נהג:** ${tb.email} · ${tb.driverDetailsNoteHe}`);
    lines.push('');
  }

  // 4. Week Schedule
  lines.push('## 4. מבנה השבוע');
  lines.push('');
  lines.push(
    `1. **ליל ${vm.dates.startDow} (${vm.dates.startDm}):** התייצבות בנתב״ג עד ${vm.flights.out.airportByClock}, המראה ב-${vm.flights.out.dep} (${vm.flights.out.flight}).`
  );
  lines.push(
    `2. **${vm.dates.startLongHe}:** נחיתה במלפנסה ב-${vm.flights.out.arr}, ביקורת גבולות EES (~${vm.dates.airportExitMin} דק׳), הסעה של ${vm.decided.transferHe} לליביניו (הגעה ~${vm.decided.arriveHe}), לינה ב-${vm.firstNight?.name ?? 'מלון שישי'}.`
  );
  lines.push(
    `3. **${vm.dates.aptInLongHe} (יום סקי 1/${vm.dates.skiDays}):** יציאה עד ${vm.firstNight?.checkOut ?? '10:00'}, השארת מזוודות ב-Calanda, איסוף ציוד ב-Sport4U הצמודה ויום גלישה ראשון לפני הקורס.`
  );
  lines.push(
    `4. **ראשון–שישי (${vm.dates.courseStartDm}–${vm.dates.courseEndDm}, ימי סקי 2–7):** קורס מתחילות ב-Scuola Sci Centrale (${vm.dates.courseHoursText} ב-Campo Scuola 23), ראובן במסלולי Mottolino ו-Carosello 3000, אורית ב-Aquagranda ובמדרחוב ה-Duty Free, ומפגש צהריים משפחתי.`
  );
  lines.push(
    `5. **${vm.dates.endLongHe}:** צ׳ק-אאוט מ-Calanda בבוקר, בוקר סקי אחרון עד ~${vm.decided.lastSkiHe} (ומקלחת ב-Aquagranda) או עצירה באגם קומו, יציאה מליביניו עד ${vm.decided.leaveByHe}, במלפנסה עד ${vm.flights.back.airportByClock}, טיסה ${vm.flights.back.flight} ב-${vm.flights.back.dep} (נחיתה בנתב״ג ב-${vm.flights.back.arr}).`
  );
  lines.push('');

  // 5. Budget Table (Complete!)
  lines.push(`## 5. תקציב ותזרים (${vm.budget.totalText} · ${vm.budget.totalIlsText} לפי ₪${vm.rates.eurIlsDisplay}/€ מ-${vm.rates.checkedDm})`);
  lines.push('');
  lines.push('| סעיף | עלות (€) | עלות משוערת (₪) | סטטוס | פירוט |');
  lines.push('|---|---|---|---|---|');
  for (const l of vm.budget.lines) {
    lines.push(`| **${l.labelHe}** | ${l.eurText} | ${l.ilsText} | ${l.statusHe} | ${l.whatHe} |`);
  }
  lines.push(
    `| **סה״כ למשפחה** | **${vm.budget.totalText}** | **${vm.budget.totalIlsText}** | שולם: ${vm.budget.paidText} · נותר: ${vm.budget.leftText} | ${vm.budget.perPersonText} לאדם (ללא טיסות וביטוח נסיעות) |`
  );
  lines.push('');

  // 6. Open Tasks (All 13!)
  lines.push(`## 6. משימות פתוחות (${vm.openItems.length} פריטים)`);
  lines.push('');
  for (const item of vm.openItems) {
    const urgHe =
      item.urgency === 'red' ? '[דחוף]' : item.urgency === 'amber' ? '[בקרוב]' : '[אחר כך]';
    const dl = item.deadline ? ` (יעד: ${item.deadlineDm})` : '';
    lines.push(`- ${urgHe} **${item.titleHe}**${dl}: ${item.whatHe}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('*הופק אוטומטית משכבת הדומיין (ללא מזהי הזמנות פרטיים).*');

  return lines.join('\n');
}
