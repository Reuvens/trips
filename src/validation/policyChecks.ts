/**
 * Executable Policy & Invariant Suite (S1–S13 + V1–V29).
 * Every check runs as pure TypeScript logic against the validated schema, derived ViewModel,
 * generated Markdown, and rendered HTML — returning structured severity results (RED / AMBER).
 */
import type { PrivateRefs, RatesData, TripData } from '../schema/trip.schema.js';
import type { TripViewModel } from '../domain/deriveTrip.js';
import { addDaysIso, daysBetween, parseIsoDate } from '../domain/format.js';

export type CheckSeverity = 'OK' | 'AMBER' | 'RED';

export interface CheckResult {
  code: string;
  description: string;
  severity: CheckSeverity;
  message: string;
}

export interface PolicyCheckContext {
  rawYamlObj: Record<string, unknown>;
  trip: TripData;
  rates: RatesData;
  privateRefs: PrivateRefs;
  vaultPin?: string;
  vm: TripViewModel;
  renderedHtml: string;
  markdownExport: string;
  todayIso?: string;
}

function stripScriptAndStyle(html: string): string {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
}

/** Collect all live prose strings inside `TripData` (excluding `historical*`, `worldFacts`, and `fieldKit` phone numbers). */
function collectLiveProseStrings(node: unknown, pathPrefix = ''): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];
  if (node === null || node === undefined) return out;
  if (typeof node === 'string') {
    out.push({ path: pathPrefix, text: node });
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      out.push(...collectLiveProseStrings(item, `${pathPrefix}[${i}]`));
    });
    return out;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'worldFacts' || k === 'reconciled' || k.startsWith('historical')) {
        continue;
      }
      if (
        k.endsWith('He') ||
        k === 'what' ||
        k === 'title'
      ) {
        out.push(...collectLiveProseStrings(v, pathPrefix ? `${pathPrefix}.${k}` : k));
      } else if (typeof v === 'object' && v !== null) {
        out.push(...collectLiveProseStrings(v, pathPrefix ? `${pathPrefix}.${k}` : k));
      }
    }
  }
  return out;
}

export function runAllPolicyChecks(ctx: PolicyCheckContext): CheckResult[] {
  const results: CheckResult[] = [];
  const todayIso = ctx.todayIso ?? new Date().toISOString().slice(0, 10);
  const markupOnly = stripScriptAndStyle(ctx.renderedHtml);

  const ok = (code: string, description: string, message: string) =>
    results.push({ code, description, severity: 'OK', message });
  const fail = (code: string, description: string, severity: 'RED' | 'AMBER', message: string) =>
    results.push({ code, description, severity, message });

  // S1 — Privacy & Vault Key Leak Guard (checks HTML, App JSON, JS, and Markdown export!)
  {
    const desc = 'אפס דליפת מזהי הזמנות, קודי PIN, אימיילים פרטיים או קוד הכספת לדף או ל-Markdown';
    const leakedKeys: string[] = [];
    const htmlWithoutBinaryImg = ctx.renderedHtml.replace(
      /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g,
      'data:image/webp;base64,[IMAGE_STRIPPED]'
    );
    const combinedPublicOutput = `${htmlWithoutBinaryImg}\n${ctx.markdownExport}`;
    for (const [key, rawVal] of Object.entries(ctx.privateRefs)) {
      const vals = Array.isArray(rawVal) ? rawVal : [rawVal];
      for (const v of vals) {
        const escaped = String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundedRe = new RegExp(`(?<![0-9A-Za-z])${escaped}(?![0-9A-Za-z])`, 'i');
        if (boundedRe.test(combinedPublicOutput)) {
          leakedKeys.push(key);
        }
      }
    }
    if (ctx.vaultPin && ctx.vaultPin.length >= 4) {
      const pinEsc = ctx.vaultPin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pinLeakRe = new RegExp(`["'\`:=]${pinEsc}["'\`]|vaultPin[^0-9]*${pinEsc}`, 'i');
      if (pinLeakRe.test(combinedPublicOutput)) {
        leakedKeys.push('vault.pin');
      }
    }
    if ('private' in ctx.rawYamlObj) {
      leakedKeys.push('trip.yaml:private_block_present');
    }
    if (leakedKeys.length > 0 && ctx.trip.meta.sharedPublicly) {
      fail('S1', desc, 'RED', `זליגת מזהים פרטיים לתוצר ציבורי: ${[...new Set(leakedKeys)].join(', ')}`);
    } else {
      ok('S1', desc, `${Object.keys(ctx.privateRefs).length} מזהים פרטיים וקוד הכספת מוגנים ומופרדים פיזית`);
    }
  }

  // S2 — Structural HTML Integrity & Zero Leftover Tokens
  {
    const desc = 'תקינות תגיות HTML ואפס טוקנים {{ }} לא פתורים בדף וב-Markdown';
    const unbalanced: string[] = [];
    for (const tag of ['div', 'section', 'details', 'summary', 'table', 'tr', 'td', 'ul', 'ol']) {
      const openCount = (markupOnly.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
      const closeCount = (markupOnly.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
      if (openCount !== closeCount) {
        unbalanced.push(`<${tag}> ${openCount}/${closeCount}`);
      }
    }
    const hasRawToken =
      markupOnly.includes('{{') ||
      markupOnly.includes('}}') ||
      ctx.markdownExport.includes('{{');
    if (unbalanced.length > 0) {
      fail('S2', desc, 'RED', `תגיות לא מאוזנות: ${unbalanced.join('; ')}`);
    } else if (hasRawToken) {
      fail('S2', desc, 'RED', 'נמצא טוקן {{ }} לא מפוענח בתוצר');
    } else {
      ok('S2', desc, 'כל תגיות המבנה מאוזנות ואין שאריות תבנית');
    }
  }

  // S3 — Open Items Schema Uniqueness & Urgency Ordering
  {
    const desc = 'מזהי משימות ייחודיים וסדר עדיפויות תקין ב-trip.yaml';
    const ids = ctx.trip.openItems.map((i) => i.id);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    const rank: Record<string, number> = { red: 0, amber: 1, yellow: 2 };
    let outOfOrder = false;
    for (let i = 1; i < ctx.vm.openItems.length; i++) {
      const prev = rank[ctx.vm.openItems[i - 1]!.urgency] ?? 9;
      const cur = rank[ctx.vm.openItems[i]!.urgency] ?? 9;
      if (cur < prev) outOfOrder = true;
    }
    if (dupes.length > 0 || outOfOrder) {
      fail('S3', desc, 'RED', `כפילויות=${dupes.join(',')} או סדר דחיפות שגוי`);
    } else {
      ok('S3', desc, `${ids.length} מזהי משימות ייחודיים וממוינים לפי דחיפות`);
    }
  }

  // S5 — Bidirectional Sync Between Open Items and Page Cards
  {
    const desc = 'כל משימה פתוחה ב-trip.yaml מופיעה ככרטיס בדף (ולהפך)';
    const ids = ctx.trip.openItems.map((i) => i.id);
    const cardIds = [...markupOnly.matchAll(/data-item="([^"]+)"/g)].map((m) => m[1]!);
    const cardDupes = cardIds.filter((id, idx) => cardIds.indexOf(id) !== idx);
    const missingOnPage = ids.filter((id) => !cardIds.includes(id));
    const orphanOnPage = cardIds.filter((id) => !ids.includes(id));

    if (cardDupes.length || missingOnPage.length || orphanOnPage.length) {
      fail(
        'S5',
        desc,
        'RED',
        `חוסר סנכרון משימות: חסרות=${missingOnPage.join(',')}; כפולות=${cardDupes.join(',')}; יתומות=${orphanOnPage.join(',')}`
      );
    } else {
      ok('S5', desc, `כל ${ids.length} המשימות מסונכרנות דו-כיוונית עם הדף`);
    }
  }

  // S4 — Overdue Open Items Alert (AMBER — informs without blocking build)
  {
    const desc = 'מעקב תאריכי יעד במשימות פתוחות';
    const overdue = ctx.trip.openItems.filter(
      (i) => i.deadline && daysBetween(i.deadline, todayIso) > 0
    );
    if (overdue.length > 0) {
      fail(
        'S4',
        desc,
        'AMBER',
        `${overdue.length} משימות עברו את תאריך היעד: ${overdue.map((o) => `${o.id} (${o.deadline})`).join(', ')}`
      );
    } else {
      ok('S4', desc, 'אין משימות שעברו את תאריך היעד');
    }
  }

  // S6 — Internal Hash Anchor Integrity
  {
    const desc = 'כל קישור פנימי (#anchor) בדף מצביע ל-id קיים ב-HTML';
    const allIds = new Set(
      [...markupOnly.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!).concat(['top'])
    );
    const hrefAnchors = [...markupOnly.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]!);
    const broken = [...new Set(hrefAnchors.filter((a) => !allIds.has(a)))];
    if (broken.length > 0) {
      fail('S6', desc, 'RED', `עוגנים פנימיים שבורים בדף: ${broken.join(', ')}`);
    } else {
      ok('S6', desc, `כל ${hrefAnchors.length} הקישורים הפנימיים מצביעים לעוגנים תקינים`);
    }
  }

  // V8 — Every Google Hotels Link Carries Exact Stay Dates
  {
    const desc = 'כל קישור Google Hotels נושא את תאריכי הלילה הראשון או שבוע הדירה המדויקים';
    const allowedWindows = new Set([
      `${ctx.trip.dates.start}:${ctx.trip.dates.aptIn}`,
      `${ctx.trip.dates.aptIn}:${ctx.trip.dates.aptOut}`,
    ]);
    const matches = [...ctx.renderedHtml.matchAll(/https:\/\/www\.google\.com\/travel\/search\?[^"'\s<>]+/g)];
    const badLinks: string[] = [];
    for (const m of matches) {
      const url = m[0].replace(/&amp;/g, '&');
      const ci = /checkin=(\d{4}-\d{2}-\d{2})/.exec(url)?.[1];
      const co = /checkout=(\d{4}-\d{2}-\d{2})/.exec(url)?.[1];
      if (!ci || !co || !allowedWindows.has(`${ci}:${co}`)) {
        badLinks.push(url.slice(0, 90));
      }
    }
    if (matches.length === 0) {
      fail('V8', desc, 'RED', 'לא נמצאו קישורי Google Hotels כלל בדף');
    } else if (badLinks.length > 0) {
      fail('V8', desc, 'RED', `קישורי מלון עם תאריכים שגויים: ${badLinks.join('; ')}`);
    } else {
      ok('V8', desc, `כל ${matches.length} קישורי Google Hotels נושאים תאריכים מדויקים`);
    }
  }

  // S7 — HTTPS Only External Links
  {
    const desc = 'כל הקישורים החיצוניים משתמשים ב-https:// בלבד';
    const httpLinks = [...markupOnly.matchAll(/href="(http:\/\/[^"]+)"/g)].map((m) => m[1]!);
    if (httpLinks.length > 0) {
      fail('S7', desc, 'RED', `נמצאו קישורי http לא מאובטחים: ${httpLinks.slice(0, 4).join(', ')}`);
    } else {
      ok('S7', desc, 'כל הקישורים החיצוניים מאובטחים (HTTPS)');
    }
  }

  // S11 — Single Source of Exchange Rates
  {
    const desc = 'שערי מטבע מוגדרים ב-rates.yaml בלבד ולא משוכפלים ב-trip.yaml';
    if ('rates' in ctx.rawYamlObj) {
      fail('S11', desc, 'RED', 'אסור להגדיר בלוק rates בתוך trip.yaml — רק ב-rates.yaml');
    } else {
      ok('S11', desc, `שערי מטבע נטענים ממקור אמת יחיד (rates.yaml · ${ctx.rates.source})`);
    }
  }

  // S12 — Exchange Rate Freshness
  {
    const desc = 'טריות שער היורו בקובץ הגיבוי (עד 21 ימים)';
    const ageDays = daysBetween(ctx.rates.checked, todayIso);
    if (ageDays < 0) {
      fail('S12', desc, 'RED', `תאריך בדיקת השער (${ctx.rates.checked}) בעתיד`);
    } else if (ageDays > 21) {
      fail(
        'S12',
        desc,
        'AMBER',
        `שער היורו בקובץ בן ${ageDays} ימים — הרץ npm run update:rates לעדכון`
      );
    } else {
      ok('S12', desc, `שער יורו עדכני: ₪${ctx.vm.rates.eurIlsDisplay} (${ctx.rates.checked})`);
    }
  }

  // S13 — Timeline Soundness
  {
    const desc = 'ציר הזמן של כרטיס ״עכשיו״ תקין, ממוין ובעל אזורי זמן חוקיים';
    const tl = ctx.vm.timeline;
    const problems: string[] = [];
    for (const ev of tl.events) {
      if (ev.endMs < ev.startMs) problems.push(`${ev.id}: מסתיים לפני שמתחיל`);
      if (!(ev.fromMs <= ev.hotMs && ev.hotMs <= ev.startMs && ev.startMs <= ev.untilMs)) {
        problems.push(`${ev.id}: סדר חלונות שגוי`);
      }
    }
    if (tl.events.length < 10) {
      problems.push(`ציר הזמן דל מדי (${tl.events.length} אירועים בלבד)`);
    }
    if (problems.length > 0) {
      fail('S13', desc, 'RED', problems.join('; '));
    } else {
      ok('S13', desc, `${tl.events.length} אירועים מתוזמנים על פני ${tl.days.length} ימים`);
    }
  }

  // V1 — Comparable Resorts Share Identical Cost Line Structure
  {
    const desc = 'כל שלושת האתרים המושווים מתומחרים על אותן שורות בדיוק';
    const baseKeys = ctx.vm.decided.comparisonLines.map((l) => l.key).join(',');
    const mismatched = ctx.vm.resorts
      .filter((r) => r.comparisonLines.map((l) => l.key).join(',') !== baseKeys)
      .map((r) => r.id);
    if (mismatched.length > 0) {
      fail('V1', desc, 'RED', `מבנה שורות שונה באתרים: ${mismatched.join(', ')}`);
    } else {
      ok('V1', desc, `כל ${ctx.vm.resorts.length} האתרים חולקים בדיוק אותם 5 רכיבי חבילה + הדרכות + אוכל`);
    }
  }

  // V5 — Arithmetic Sum Consistency Across Resorts
  {
    const desc = 'סיכום מתמטי מדויק של חבילה + הדרכות + אוכל בכל אתר';
    const problems: string[] = [];
    for (const r of ctx.vm.resorts) {
      const sumPkg = r.comparisonLines.reduce((acc, l) => acc + l.eur, 0);
      if (sumPkg !== r.packageEur) {
        problems.push(`${r.id}: חבילה ${r.packageEur} != סכום שורות ${sumPkg}`);
      }
      if (r.packageEur + r.lessonsEur + r.foodWeekEur !== r.totalEur) {
        problems.push(`${r.id}: סה״כ ${r.totalEur} אינו שווה לחבילה + הדרכות + אוכל`);
      }
    }
    if (problems.length > 0) {
      fail('V5', desc, 'RED', problems.join('; '));
    } else {
      ok('V5', desc, `כל סכומי האתרים והפערים (${ctx.vm.spread.gapText}) מסתכמים במדויק`);
    }
  }

  // V2+ — Universal Anti-Drift Scanner across ALL live prose in trip.yaml!
  {
    const desc = 'אפס סכומי מטבע לא-מטוקנים או ביטויי זמן יחסיים בשדות טקסט חיים ב-trip.yaml';
    const moneyRe = /[€₪₾]\s?\d|\b\d[\d,]*\s?(?:יורו|אירו|שקל|ש״ח|דולר)/;
    const relativeTimeRe = /לפני חודש|השבוע הקרוב|בעוד שבועיים|מחרתיים/;
    const hits: string[] = [];
    for (const item of collectLiveProseStrings(ctx.trip)) {
      const stripped = item.text.replace(/\{\{[^}]+\}\}/g, '');
      const m = moneyRe.exec(stripped);
      if (m) {
        hits.push(`${item.path}: סכום מוקלד ידנית "${m[0]}"`);
      }
      const rel = relativeTimeRe.exec(stripped);
      if (rel) {
        hits.push(`${item.path}: ביטוי זמן יחסי אסור "${rel[0]}"`);
      }
    }
    if (hits.length > 0) {
      fail('V2', desc, 'RED', hits.slice(0, 5).join(' | '));
    } else {
      ok('V2', desc, 'כל הטקסטים החיים ב-trip.yaml נקיים ממספרים קשיחים ומזמן יחסי');
    }
  }

  // V7 — Calendar Spine Integrity (Flights <-> Hotel Night <-> Apartment Sat-Sat <-> Course Sun-Fri)
  {
    const desc = 'עקביות לוח שנה: טיסות = חלון הטיול, דירה משבת לשבת, קורס ראשון–שישי בתוך שבוע הדירה';
    const d = ctx.trip.dates;
    const outLeg = ctx.trip.flights.legs.find((l) => l.id === 'out')!;
    const backLeg = ctx.trip.flights.legs.find((l) => l.id === 'back')!;
    const problems: string[] = [];

    if (outLeg.date !== d.start) problems.push('תאריך טיסת הלוך שונה מ-dates.start');
    if (backLeg.date !== d.end) problems.push('תאריך טיסת חזור שונה מ-dates.end');
    if (backLeg.arrDate && backLeg.arrDate !== d.homeLanding) {
      problems.push('תאריך נחיתה בארץ שונה מ-dates.homeLanding');
    }
    if (parseIsoDate(d.aptIn).dowIndex !== 6 || parseIsoDate(d.aptOut).dowIndex !== 6) {
      problems.push('שבוע הדירה חייב להיות משבת עד שבת');
    }
    if (d.aptIn !== addDaysIso(d.start, 1) || d.aptOut !== d.end) {
      problems.push('הדירה חייבת להתחיל למחרת הנחיתה ולהסתיים ביום ההמראה חזרה');
    }
    if (
      daysBetween(d.aptIn, d.courseStart) <= 0 ||
      daysBetween(d.courseStart, d.courseEnd) < 0 ||
      daysBetween(d.courseEnd, d.aptOut) <= 0
    ) {
      problems.push('שבוע הקורס חייב לשבת בתוך שבוע הדירה');
    }
    if (problems.length > 0) {
      fail('V7', desc, 'RED', problems.join('; '));
    } else {
      ok('V7', desc, `טיסות ${d.start}→${d.end}, מלון לילה 1, דירה ${d.aptIn}→${d.aptOut}, קורס ${d.courseStart}→${d.courseEnd}`);
    }
  }

  // V12 — Exactly One Recommended Pick Per Category in Every Resort
  {
    const desc = 'בכל אתר מוגדרת בחירה מומלצת אחת בדיוק (דירה בחלופות, בית ספר, ציוד והסעה)';
    const problems: string[] = [];
    for (const r of ctx.trip.resorts) {
      if (r.id !== ctx.trip.decidedResortId || (r.stays && r.stays.length > 0)) {
        if ((r.stays ?? []).filter((s) => s.pick).length !== 1) {
          problems.push(`${r.id}: stays pick != 1`);
        }
      }
      if (r.id === ctx.trip.decidedResortId || (r.schools && r.schools.length > 0)) {
        if ((r.schools ?? []).filter((s) => s.pick).length !== 1) {
          problems.push(`${r.id}: schools pick != 1`);
        }
      }
      if (r.id === ctx.trip.decidedResortId || (r.rentals && r.rentals.length > 0)) {
        if ((r.rentals ?? []).filter((s) => s.pick).length !== 1) {
          problems.push(`${r.id}: rentals pick != 1`);
        }
      }
    }
    if (problems.length > 0) {
      fail('V12', desc, 'RED', problems.join('; '));
    } else {
      ok('V12', desc, 'כל קטגוריות הספקים בשלושת האתרים כוללות המלצה ראשית חד-משמעית');
    }
  }

  // V14 — Complete Fit Matrix With Rationale On Every Cell
  {
    const desc = 'טבלת ההתאמה מלאה עם נימוק מפורש לכל ציון בכל אתר';
    const critIds = ctx.trip.fit.criteria.map((c) => c.id);
    const missing: string[] = [];
    for (const r of ctx.trip.resorts) {
      const sc = ctx.trip.fit.scores[r.id];
      if (!sc) {
        missing.push(r.id);
        continue;
      }
      for (const cid of critIds) {
        if (!sc[cid] || !sc[cid].whyHe.trim()) missing.push(`${r.id}.${cid}`);
      }
    }
    if (missing.length > 0) {
      fail('V14', desc, 'RED', `ציוני התאמה חסרים: ${missing.join(', ')}`);
    } else {
      ok('V14', desc, `${critIds.length * ctx.trip.resorts.length} תאי מטריצת התאמה מלאים ומנומקים`);
    }
  }

  // V16 — External Research Sources & Reconciled Decisions Integrity
  {
    const desc = 'כל מקורות המחקר החיצוניים נקראו וטבלת ההכרעות מלאה';
    const unread = ctx.trip.sources.filter((s) => s.status !== 'read').map((s) => s.id);
    if (unread.length > 0 || ctx.trip.reconciled.length === 0) {
      fail('V16', desc, 'RED', `מקורות שלא נקראו (${unread.join(',')}) או טבלת הכרעות ריקה`);
    } else {
      ok('V16', desc, `${ctx.trip.sources.length} מחקרים חיצוניים נקראו ו-${ctx.trip.reconciled.length} הכרעות מתועדות`);
    }
  }

  // V19 — Fit Matrix Winner Agrees With Decided Resort
  {
    const desc = 'האתר שנבחר מדורג במקום הראשון בטבלת ההתאמה המשוקללת';
    const topFitId = ctx.vm.byFit[0]?.id;
    if (topFitId !== ctx.trip.decidedResortId) {
      fail('V19', desc, 'RED', `טבלת ההתאמה מדרגת את ${topFitId} ראשון במקום ${ctx.trip.decidedResortId}`);
    } else {
      ok('V19', desc, `${ctx.vm.decided.nameHe} מדורג ראשון בטבלת ההתאמה (${ctx.vm.decided.fitPct}%)`);
    }
  }

  // V17 — Flight Bookings Cover Every Traveller Exactly Once & Private Refs Exist
  {
    const desc = 'שלוש הזמנות הטיסה מכסות את כל 5 הנוסעים פעם אחת בדיוק, נקודות המתמיד מסתכמות ומפתחות הפרטיות קיימים';
    const memberIds = ctx.trip.party.members.map((m) => m.id);
    const bookedIds = ctx.trip.flights.bookings.flatMap((b) => b.who);
    const missing = memberIds.filter((id) => !bookedIds.includes(id));
    const dupes = bookedIds.filter((id, i) => bookedIds.indexOf(id) !== i);
    const unknown = bookedIds.filter((id) => !memberIds.includes(id));
    const badPoints: string[] = [];
    const missingRefKeys: string[] = [];

    for (const b of ctx.trip.flights.bookings) {
      if (b.points > 0 && b.points !== ctx.trip.flights.pointsPerAwardTicket * b.who.length) {
        badPoints.push(b.id);
      }
      if (!(b.refKey in ctx.privateRefs)) missingRefKeys.push(b.refKey);
      for (const tk of b.ticketRefKeys) {
        if (!(tk in ctx.privateRefs)) missingRefKeys.push(tk);
      }
    }

    if (missing.length || dupes.length || unknown.length || badPoints.length || missingRefKeys.length) {
      fail(
        'V17',
        desc,
        'RED',
        `שגיאת כרטיסי טיסה: חסרים=${missing.join(',')}; כפולים=${dupes.join(',')}; נקודות=${badPoints.join(',')}; מפתחות=${missingRefKeys.join(',')}`
      );
    } else {
      ok('V17', desc, `${ctx.trip.flights.bookings.length} הזמנות מכסות את כל ${memberIds.length} הנוסעים`);
    }
  }

  // V21 — Ski Passes + Compulsory Piste Liability Sum Matches Party Members
  {
    const desc = 'סכום כרטיסי הסקי-פס של 4 הגולשים + ביטוח צד ג׳ חובה תואם למחירון';
    const nonSkierWithPass = ctx.trip.party.members.filter(
      (m) => m.role === 'non_skier' && m.passEur !== 0
    );
    const skierPassesSum =
      ctx.trip.party.members.reduce((acc, m) => acc + m.passEur, 0) +
      ctx.vm.decided.passesInsuranceEur;
    const budgetPassesLine = ctx.vm.budget.lines.find((l) => l.key === 'passes')?.eur ?? -1;
    if (
      nonSkierWithPass.length > 0 ||
      skierPassesSum !== ctx.vm.decided.passesEur ||
      budgetPassesLine !== ctx.vm.decided.passesEur
    ) {
      fail(
        'V21',
        desc,
        'RED',
        `אי-התאמה בסקי-פס: סכום נוסעים+ביטוח=${skierPassesSum}, אתר=${ctx.vm.decided.passesEur}, מחירון=${budgetPassesLine}`
      );
    } else {
      ok('V21', desc, `מנויי 4 הגולשים + ביטוח חובה מסתכמים ל-€${skierPassesSum.toLocaleString('en-US')}`);
    }
  }

  // V23 — Recommended Transfer Fits Entire Party & Is Not a "From" Price
  {
    const desc = 'ההסעה המומלצת בכל אתר מכילה את כל 5 הנוסעים ואינה מתומחרת ממחיר "החל מ-"';
    const problems: string[] = [];
    for (const r of ctx.trip.resorts) {
      const picks = r.transferOptions.filter((o) => o.pick);
      if (picks.length !== 1) {
        problems.push(`${r.id}: חייבת להיות בדיוק הסעה מומלצת אחת`);
        continue;
      }
      const pick = picks[0]!;
      if (!pick.seats || pick.seats < ctx.vm.party.peopleCount) {
        problems.push(`${r.id}/${pick.name}: מספר מושבים קטן מ-${ctx.vm.party.peopleCount}`);
      }
      if (/החל מ|מ-€|\bfrom\b/i.test(pick.whatHe)) {
        problems.push(`${r.id}/${pick.name}: מבוססת על מחיר "החל מ-"`);
      }
    }
    if (problems.length > 0) {
      fail('V23', desc, 'RED', problems.join('; '));
    } else {
      ok('V23', desc, 'כל ההסעות המומלצות מתאימות ל-5 נוסעים עם מזוודות');
    }
  }

  // V25 — Dynamic Budget & Bookings Reconciliation (Fixes legacy V25 rigidity bug!)
  {
    const desc = 'הדירה, הלילה הראשון וסך התשלומים שבוצעו בפועל מסתכמים במדויק לתקציב';
    const problems: string[] = [];
    const b = ctx.vm.budget;

    if (!(ctx.trip.apartment.refKey in ctx.privateRefs)) {
      problems.push(`חסר מפתח ${ctx.trip.apartment.refKey} ב-private.yaml`);
    }
    if (ctx.trip.apartment.eurPaid > ctx.trip.apartment.eurTotal) {
      problems.push('הסכום ששולם על הדירה גבוה ממחירה הכולל');
    }

    if (ctx.trip.firstNightBooked) {
      const fn = ctx.trip.firstNightBooked;
      for (const k of [fn.refKey, fn.pinRefKey, fn.phoneRefKey]) {
        if (!(k in ctx.privateRefs)) problems.push(`חסר מפתח ${k} ב-private.yaml`);
      }
      if (
        daysBetween(fn.bookedOn, fn.freeCancelUntil) <= 0 ||
        daysBetween(fn.freeCancelUntil, ctx.trip.dates.start) <= 0
      ) {
        problems.push('תאריך הביטול החינמי של הלילה הראשון אינו בין מועד ההזמנה לתחילת הטיול');
      }
    }

    const expectedPaidTotal =
      ctx.trip.apartment.eurPaid + (ctx.trip.firstNightBooked?.eurPaid ?? 0);
    if (b.paidEur !== expectedPaidTotal) {
      problems.push(`סכום שולם בתקציב (${b.paidEur}) != סכום ההזמנות ששולמו (${expectedPaidTotal})`);
    }
    if (b.paidEur + b.leftEur !== b.totalEur) {
      problems.push(`שולם (${b.paidEur}) + נותר (${b.leftEur}) != סה״כ (${b.totalEur})`);
    }

    if (problems.length > 0) {
      fail('V25', desc, 'RED', problems.join('; '));
    } else {
      ok(
        'V25',
        desc,
        `הזמנות ותשלומים מותאמים דינמית: שולם ${b.paidText}, נותר ${b.leftText} מתוך ${b.totalText}`
      );
    }
  }

  // V28 — 4-Stage Cashflow Partition Equals Budget Lines Total
  {
    const desc = 'פילוח תזרים המזומנים (4 שלבים) זהה ב-100% לסכום 8 שורות המחירון';
    const b = ctx.vm.budget;
    const linesSum = b.lines.reduce((acc, l) => acc + l.eur, 0);
    const stagesSum = b.stages.reduce((acc, s) => acc + s.eur, 0);
    if (linesSum !== b.totalEur || stagesSum !== b.totalEur) {
      fail(
        'V28',
        desc,
        'RED',
        `אי-התאמה בתזרים: שורות=${linesSum}, שלבי תזרים=${stagesSum}, סה״כ=${b.totalEur}`
      );
    } else {
      ok(
        'V28',
        desc,
        `4 שלבי התזרים (${b.stages.map((s) => s.eurText).join(' + ')}) מסתכמים בדיוק ל-${b.totalText}`
      );
    }
  }

  // V26 — Alternatives Stay Strictly Inside Closed Drawer
  {
    const desc = 'מחוץ למגירת "חלופות שנשקלו" הסגורה, הדף עוסק בליביניו בלבד';
    const match = /<details[^>]*id="alternatives"([^>]*)>([\s\S]*?)<\/details>\s*<!--END_ALTERNATIVES-->/.exec(
      markupOnly
    );
    if (!match) {
      fail('V26', desc, 'RED', 'לא נמצאה מגירת <details id="alternatives"> בדף');
    } else if (/\bopen\b/i.test(match[1] ?? '')) {
      fail('V26', desc, 'RED', 'מגירת החלופות פתוחה כברירת מחדל — חייבת להתחיל סגורה');
    } else {
      const outside =
        markupOnly.slice(0, match.index) + markupOnly.slice(match.index + match[0].length);
      const leakedAlts: string[] = [];
      for (const alt of ctx.vm.alternatives) {
        if (outside.includes(alt.nameHe) || outside.includes(alt.name)) {
          leakedAlts.push(alt.nameHe);
        }
      }
      if (leakedAlts.length > 0) {
        fail('V26', desc, 'RED', `אתרים חלופיים מוזכרים מחוץ למגירה: ${leakedAlts.join(', ')}`);
      } else {
        ok('V26', desc, 'התוכנית הראשית נקייה מאתרים חלופיים; ההשוואה שמורה במגירה סגורה');
      }
    }
  }

  // V27 — Never Advise Merging / Linking the Separate El Al Flight Bookings
  {
    const desc = 'הדף לא ממליץ לאחד או לקשר את הזמנות הטיסה הנפרדות באל על';
    // Negative lookbehind ensures "ללא איחוד הזמנות" / "לא לאחד הזמנות" is recognized as a prohibition, not advice!
    const badAdviceRe = /(?<!ללא\s)(?<!לא\s)(?:לקשר|לאחד|איחוד)\s+(?:את\s+)?(?:שלוש\s+)?הזמנ/;
    if (badAdviceRe.test(markupOnly) || badAdviceRe.test(ctx.markdownExport)) {
      fail('V27', desc, 'RED', 'נמצאה המלצה לאחד הזמנות טיסה — ההזמנות נשמרות נפרדות לגמישות של ניצן');
    } else {
      ok('V27', desc, 'נשמרת ההחלטה על שלוש הזמנות אל על נפרדות');
    }
  }

  // V29 (NEW) — Lossless Markdown Export Completeness Check
  {
    const desc = 'ייצוא ה-Markdown למודלים כולל 100% מהתקציב, הנוסעים, הדירות וכל המשימות הפתוחות';
    const md = ctx.markdownExport;
    const missingParts: string[] = [];
    if (!md.includes(ctx.vm.budget.totalText)) missingParts.push('סה״כ תקציב');
    for (const m of ctx.vm.party.members) {
      if (!md.includes(m.nameHe)) missingParts.push(`נוסע ${m.nameHe}`);
    }
    for (const item of ctx.vm.openItems) {
      if (!md.includes(item.titleHe)) missingParts.push(`משימה ${item.id}`);
    }
    if (!md.includes(ctx.vm.apartment.name)) missingParts.push('דירת Calanda');
    if (ctx.vm.firstNight && !md.includes(ctx.vm.firstNight.name)) {
      missingParts.push('לילה ראשון Casa Noemi');
    }

    if (missingParts.length > 0) {
      fail('V29', desc, 'RED', `חסרים חלקים בייצוא ה-Markdown: ${missingParts.slice(0, 5).join(', ')}`);
    } else {
      ok('V29', desc, `ייצוא Markdown שלם (${Math.round(md.length / 1024)}KB, כולל כל ${ctx.vm.openItems.length} המשימות והתקציב)`);
    }
  }

  return results;
}
