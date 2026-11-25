/**
 * Timezone-accurate timeline engine for the Live "Now" Card and Time-Travel Simulator.
 * Every clock, duration, flight code, and day count is derived purely from TripData (zero hardcoded trip literals).
 */
import type { TripData } from '../schema/trip.schema.js';
import {
  addDaysIso,
  daysBetween,
  formatDowFullDm,
  formatDurationHours,
  minutesToClock,
  parseClockMinutes,
} from './format.js';
import {
  buildFlightAwareUrl,
  buildGoogleMapsRouteUrl,
  buildGoogleMapsSearchUrl,
} from './links.js';

export type TimelineEventKind =
  | 'flight'
  | 'transfer'
  | 'checkin'
  | 'checkout'
  | 'ski'
  | 'lesson'
  | 'village';

export interface TimelineEvent {
  id: string;
  dayIndex: number;
  dateIso: string;
  kind: TimelineEventKind;
  titleHe: string;
  subHe: string;
  tz: string;
  endTz?: string;
  startMs: number;
  endMs: number;
  fromMs: number;
  hotMs: number;
  untilMs: number;
  approx: boolean;
  whereHe?: string;
  mapUrl?: string;
  facts: Array<[string, string]>;
  notesHe: string[];
  links: Array<[string, string]>;
  forWho: string[];
}

export interface TimelineDay {
  n: number;
  dateIso: string;
  labelHe: string;
  titleHe: string;
  tz: string;
}

export interface TimelinePreset {
  id: string;
  labelHe: string;
  isoParam: string;
  descriptionHe: string;
}

export interface TimelinePayload {
  events: TimelineEvent[];
  days: TimelineDay[];
  tzLabelsHe: Record<string, string>;
  presets: TimelinePreset[];
}

const TZ_LABELS_HE: Record<string, string> = {
  'Asia/Jerusalem': 'שעון ישראל',
  'Europe/Rome': 'שעון איטליה',
};

export function wallTimeToEpochMs(dateIso: string, clock: string, timeZone: string): {
  ms: number;
  approx: boolean;
} {
  const { minutes, approx } = parseClockMinutes(clock);
  const [yStr, mStr, dStr] = dateIso.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const offsetAt = (guessMs: number): number => {
    const parts: Record<string, string> = {};
    for (const p of fmt.formatToParts(new Date(guessMs))) {
      parts[p.type] = p.value;
    }
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second)
    );
    return localAsUtc - Math.floor(guessMs / 1000) * 1000;
  };

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstPass = utcGuess - offsetAt(utcGuess);
  const exactMs = utcGuess - offsetAt(firstPass);
  return { ms: exactMs, approx };
}

function computeWindows(
  kind: TimelineEventKind,
  startMs: number,
  endMs: number
): { fromMs: number; hotMs: number; untilMs: number } {
  const H = 3_600_000;
  switch (kind) {
    case 'flight':
      return {
        fromMs: startMs - 24 * H,
        hotMs: startMs - 4 * H,
        untilMs: Math.max(endMs, startMs + H),
      };
    case 'transfer':
      return {
        fromMs: startMs - 12 * H,
        hotMs: startMs - 2 * H,
        untilMs: Math.max(endMs, startMs + H),
      };
    case 'checkin':
      return {
        fromMs: startMs - 8 * H,
        hotMs: startMs - 2 * H,
        untilMs: Math.max(endMs, startMs + 4 * H),
      };
    case 'checkout':
      return {
        fromMs: startMs - 12 * H,
        hotMs: startMs - 3 * H,
        untilMs: Math.max(endMs, startMs + 30 * 60_000),
      };
    case 'lesson':
      return {
        fromMs: startMs - 6 * H,
        hotMs: startMs - 1.5 * H,
        untilMs: endMs,
      };
    case 'ski':
    case 'village':
      return {
        fromMs: startMs - 6 * H,
        hotMs: startMs - H,
        untilMs: endMs,
      };
  }
}

export function buildSkiTimeline(
  raw: TripData,
  derived: {
    arriveLivignoClock: string;
    leaveLivignoClock: string;
    outAirportByClock: string;
    backAirportByClock: string;
    calandaBalanceEur: number;
    firstNightTotalEur: number;
    skiDays: number;
    courseDays: number;
    transferDurationHe: string;
  }
): TimelinePayload {
  const totalDays = daysBetween(raw.dates.start, raw.dates.homeLanding) + 1;
  const fnName = raw.firstNightBooked?.name ?? 'ליל שישי';
  const dayTitles: Record<number, string> = {
    0: `טיסת בוקר למילאנו, נסיעה לליביניו ולילה ב-${fnName}`,
    1: 'מעבר ל-Calanda, איסוף ציוד ב-Sport4U ויום סקי ראשון',
    2: `פתיחת קורס הסקי (יום 1/${derived.courseDays}) + גלישה וספא`,
    3: `יום קורס 2/${derived.courseDays} · כחולים רחבים ומפגש צהריים בהר`,
    4: `יום קורס 3/${derived.courseDays} · אמצע השבוע בליביניו`,
    5: `יום קורס 4/${derived.courseDays} · התקדמות במסלולים ומדרחוב הערב`,
    6: `יום קורס 5/${derived.courseDays} · שני צדי העמק`,
    7: `סיום קורס הסקי (יום ${derived.courseDays}/${derived.courseDays}) · יום גלישה מלא אחרון במנוי`,
    8: 'צ׳ק-אאוט מ-Calanda, בוקר חופשי/סקי אחרון וטיסת לילה הביתה',
    9: 'נחיתה בנתב״ג לפנות בוקר',
  };

  const days: TimelineDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const dateIso = addDaysIso(raw.dates.start, i);
    const tz = i === totalDays - 1 ? 'Asia/Jerusalem' : 'Europe/Rome';
    days.push({
      n: i,
      dateIso,
      labelHe: formatDowFullDm(dateIso),
      titleHe: dayTitles[i] ?? 'שבוע סקי בליביניו',
      tz,
    });
  }

  const dayIndexByDate = new Map(days.map((d) => [d.dateIso, d.n]));
  const allMemberIds = raw.party.members.map((m) => m.id);
  const skierIds = raw.party.members.filter((m) => m.role !== 'non_skier').map((m) => m.id);
  const beginnerIds = raw.party.members.filter((m) => m.role === 'beginner').map((m) => m.id);

  const memberNameById = new Map(raw.party.members.map((m) => [m.id, m.nameHe]));
  const seatsSummary = raw.flights.bookings
    .map(
      (b) =>
        `${b.who.map((id) => memberNameById.get(id) ?? id).join(', ')}: ${b.seatsHe}`
    )
    .join(' · ');

  const outLeg = raw.flights.legs.find((l) => l.id === 'out')!;
  const backLeg = raw.flights.legs.find((l) => l.id === 'back')!;
  const exitAirportClock = `~${minutesToClock(
    parseClockMinutes(outLeg.arr).minutes + raw.dates.airportExitMin,
    5
  )}`;
  const decidedResort = raw.resorts.find((r) => r.id === raw.decidedResortId)!;
  const transferDurText = formatDurationHours(decidedResort.transferMin);
  const afterLessonLunchClock = `~${minutesToClock(
    parseClockMinutes(raw.dates.courseHours.end).minutes + 15,
    5
  )}`;

  const rawEvents: Omit<TimelineEvent, 'fromMs' | 'hotMs' | 'untilMs'>[] = [];

  const pushEvent = (e: {
    id: string;
    dateIso: string;
    startClock: string;
    endDateIso?: string;
    endClock: string;
    tz: string;
    endTz?: string;
    kind: TimelineEventKind;
    titleHe: string;
    subHe: string;
    whereHe?: string;
    mapUrl?: string;
    facts?: Array<[string, string]>;
    notesHe?: string[];
    links?: Array<[string, string]>;
    forWho?: string[];
  }) => {
    const s = wallTimeToEpochMs(e.dateIso, e.startClock, e.tz);
    const endZone = e.endTz ?? e.tz;
    const end = wallTimeToEpochMs(e.endDateIso ?? e.dateIso, e.endClock, endZone);
    rawEvents.push({
      id: e.id,
      dayIndex: dayIndexByDate.get(e.dateIso) ?? 0,
      dateIso: e.dateIso,
      kind: e.kind,
      titleHe: e.titleHe,
      subHe: e.subHe,
      tz: e.tz,
      endTz: e.endTz,
      startMs: s.ms,
      endMs: Math.max(end.ms, s.ms + 15 * 60_000),
      approx: s.approx || end.approx,
      whereHe: e.whereHe,
      mapUrl: e.mapUrl,
      facts: e.facts ?? [],
      notesHe: e.notesHe ?? [],
      links: e.links ?? [],
      forWho: e.forWho ?? allMemberIds,
    });
  };

  // 1. Outbound Flight
  pushEvent({
    id: 'flight-out',
    dateIso: outLeg.date,
    startClock: outLeg.dep,
    endClock: outLeg.arr,
    tz: outLeg.fromTz,
    endTz: outLeg.toTz,
    kind: 'flight',
    titleHe: `טיסה ${outLeg.flight} · למילאנו מלפנסה`,
    subHe: `${outLeg.fromHe} ← ${outLeg.toHe}`,
    whereHe: outLeg.fromHe,
    mapUrl: buildGoogleMapsSearchUrl(outLeg.mapQuery),
    facts: [
      ['להיות בנתב״ג עד', derived.outAirportByClock],
      ['המראה', `${outLeg.dep} (שעון ישראל)`],
      ['נחיתה', `${outLeg.arr} (שעון איטליה)`],
      ['כבודה', raw.flights.baggageHe],
      ['מושבים', seatsSummary],
    ],
    notesHe: ['לבצע צ׳ק-אין של שלוש ההזמנות יחד בדלפק אחד בנתב״ג'],
    links: [['סטטוס טיסה חי ↗', buildFlightAwareUrl(outLeg.flight)]],
  });

  // 2. Arrival border EES + Transfer MXP -> Livigno
  const destMapQuery = raw.firstNightBooked?.mapQuery ?? raw.apartment.mapQuery;
  pushEvent({
    id: 'transfer-arrival',
    dateIso: outLeg.date,
    startClock: exitAirportClock,
    endClock: `~${derived.arriveLivignoClock}`,
    tz: 'Europe/Rome',
    kind: 'transfer',
    titleHe: 'יציאה ממלפנסה (אחרי EES) ונסיעה לליביניו',
    subHe: `דרך אגם קומו, הוולטלינה ומעבר Foscagno עד ${fnName}`,
    whereHe: `${outLeg.mapQuery} → ${destMapQuery}`,
    mapUrl: buildGoogleMapsRouteUrl(outLeg.mapQuery, destMapQuery, 'driving'),
    facts: [
      ['יציאה משוערת מהשדה', `${exitAirportClock} (כולל ${raw.dates.airportExitMin} דק׳ לרישום EES וכבודה)`],
      ['משך נסיעה ממוצע', `${transferDurText} שעות`],
      ['הגעה משוערת לליביניו', `~${derived.arriveLivignoClock}`],
    ],
    notesHe: [`לוודא שלנהג יש את מספר הטיסה ${outLeg.flight} למעקב נחיתה והמתנה`],
  });

  // 3. First Night Check-in & Morning Transition
  if (raw.firstNightBooked) {
    const fn = raw.firstNightBooked;
    const fnCheckinEnd = minutesToClock(parseClockMinutes(fn.checkIn).minutes + 60);
    pushEvent({
      id: 'first-night-in',
      dateIso: raw.dates.start,
      startClock: fn.checkIn,
      endClock: fnCheckinEnd,
      tz: 'Europe/Rome',
      kind: 'checkin',
      titleHe: `צ׳ק-אין לילה ראשון · ${fn.name}`,
      subHe: `${fn.unitHe} · ${fn.whereHe}`,
      whereHe: fn.address,
      mapUrl: buildGoogleMapsSearchUrl(fn.mapQuery),
      facts: [
        ['חלון צ׳ק-אין', `${fn.checkIn}–${fn.checkInUntil}`],
        ['צ׳ק-אאוט בשבת', `${fn.checkOutFrom}–${fn.checkOut}`],
        ['תשלום', `€${derived.firstNightTotalEur} (מתוכם €${fn.eurThereTax} מס עירוני במקום)`],
      ],
      notesHe: ['ארוחת ערב קלה בדירה ושינה מוקדמת לקראת יום הסקי הראשון בשבת'],
    });

    pushEvent({
      id: 'first-night-out',
      dateIso: raw.dates.aptIn,
      startClock: fn.checkOutFrom,
      endClock: fn.checkOut,
      tz: 'Europe/Rome',
      kind: 'checkout',
      titleHe: `יציאה מ-${fn.name} ומעבר ל-Calanda`,
      subHe: `השארת מזוודות ב-${raw.apartment.address} ואיסוף ציוד ב-Sport4U הצמודה`,
      whereHe: raw.apartment.address,
      mapUrl: buildGoogleMapsRouteUrl(fn.mapQuery, raw.apartment.mapQuery, 'driving'),
      facts: [
        ['צ׳ק-אאוט עד', fn.checkOut],
        ['יעד שמירת מזוודות', raw.apartment.address],
        ['השכרת ציוד', 'Sport4U · באותו רחוב כמו Calanda'],
      ],
      notesHe: [`המנוי ל-${derived.skiDays} ימים מתחיל הבוקר! יום חימום רגוע לפני תחילת הקורס מחר`],
    });
  }

  // 5. Saturday Day 1 Skiing
  pushEvent({
    id: 'ski-day-1',
    dateIso: raw.dates.aptIn,
    startClock: '~10:30',
    endClock: raw.apartment.checkInApprox,
    tz: 'Europe/Rome',
    kind: 'ski',
    titleHe: `יום סקי 1 מתוך ${derived.skiDays} — חימום והיכרות עם השלג`,
    subHe: 'שעות ראשונות על מסלול הלימוד לבנות לפני פתיחת הקורס ביום ראשון',
    whereHe: 'Campo Scuola 23 · Livigno',
    mapUrl: buildGoogleMapsSearchUrl('Campo Scuola 23 Livigno'),
    forWho: skierIds,
    facts: [
      ['משתתפים', 'ראובן, מיקה, ניצן וגלי (אורית במדרחוב ובבתי הקפה)'],
      ['מטרה', 'התאקלמות לציוד ועמידה ראשונית נינוחה על המגלשיים'],
    ],
  });

  // 6. Saturday Afternoon Check-in at Appartamenti Calanda
  const calandaEnd = `~${minutesToClock(
    parseClockMinutes(raw.apartment.checkInApprox).minutes + 90
  )}`;
  pushEvent({
    id: 'calanda-checkin',
    dateIso: raw.dates.aptIn,
    startClock: raw.apartment.checkInApprox,
    endClock: calandaEnd,
    tz: 'Europe/Rome',
    kind: 'checkin',
    titleHe: `צ׳ק-אין לדירת השבוע · ${raw.apartment.name}`,
    subHe: raw.apartment.unitHe,
    whereHe: raw.apartment.address,
    mapUrl: buildGoogleMapsSearchUrl(raw.apartment.mapQuery),
    facts: [
      ['כתובת', raw.apartment.address],
      ['מארח וטלפון', `${raw.apartment.hostName} · ${raw.apartment.phone}`],
      [
        'יתרה לתשלום',
        `€${derived.calandaBalanceEur.toLocaleString('en-US')} + ~€${raw.apartment.taxEur} מס תיירות`,
      ],
    ],
    notesHe: ['קנייה מרוכזת בסופרמרקט הקרוב לארוחות הבוקר והנשנושים של כל השבוע'],
    links: [['אתר הדירה ↗', raw.apartment.url]],
  });

  // 7. Sunday to Friday Ski School + Mountain Lunch
  for (let c = 0; c < derived.courseDays; c++) {
    const cDate = addDaysIso(raw.dates.courseStart, c);
    pushEvent({
      id: `course-day-${c + 1}`,
      dateIso: cDate,
      startClock: raw.dates.courseHours.start,
      endClock: raw.dates.courseHours.end,
      tz: 'Europe/Rome',
      kind: 'lesson',
      titleHe: `קורס סקי ב-Scuola Sci Centrale (יום ${c + 1} מתוך ${derived.courseDays})`,
      subHe: 'מיקה, ניצן וגלי בקורס · ראובן במסלולי העמק · אורית ב-Aquagranda / במדרחוב',
      whereHe: 'Campo Scuola 23, Via Plan 273',
      mapUrl: buildGoogleMapsSearchUrl('Scuola Sci Centrale Via Plan 273 Livigno'),
      forWho: beginnerIds,
      facts: [
        ['שעות הקורס', `${raw.dates.courseHours.start}–${raw.dates.courseHours.end}`],
        ['נקודת מפגש', 'Campo Scuola 23 (ליד Calanda)'],
        ['יום מנוי סקי', `יום ${c + 2} מתוך ${derived.skiDays}`],
      ],
      notesHe: [`להגיע לנקודת המפגש רבע שעה לפני ${raw.dates.courseHours.start}`],
    });

    pushEvent({
      id: `family-lunch-${c + 1}`,
      dateIso: cDate,
      startClock: afterLessonLunchClock,
      endClock: '~14:30',
      tz: 'Europe/Rome',
      kind: 'village',
      titleHe: 'מפגש צהריים משפחתי בבקתה או בכפר',
      subHe: `אחרי סיום השיעור ב-${raw.dates.courseHours.end} — כולל אפשרות לאורית לעלות בגונדולה לבקתת שמש`,
      whereHe: c % 2 === 0 ? 'Carosello 3000 / מרכז הכפר' : 'Mottolino / מרכז הכפר',
      mapUrl: buildGoogleMapsSearchUrl(
        c % 2 === 0 ? 'Carosello 3000 Livigno' : 'Mottolino Livigno'
      ),
      facts: [['אחרי הצהריים', 'תרגול משותף על מסלולים כחולים רחבים עד סגירת המעליות']],
    });
  }

  // 8. Final Saturday Checkout + Departure Transfer + Flight Home
  const checkoutEnd = `~${minutesToClock(
    parseClockMinutes(raw.apartment.checkOutApprox).minutes + 30
  )}`;
  pushEvent({
    id: 'calanda-checkout',
    dateIso: raw.dates.aptOut,
    startClock: raw.apartment.checkOutApprox,
    endClock: checkoutEnd,
    tz: 'Europe/Rome',
    kind: 'checkout',
    titleHe: `צ׳ק-אאוט מ-${raw.apartment.name}`,
    subHe: 'אריזת מזוודות ותוכנית בוקר אחרון (סקי + מקלחת ב-Aquagranda או יציאה לאגם קומו)',
    whereHe: raw.apartment.address,
    mapUrl: buildGoogleMapsSearchUrl(raw.apartment.mapQuery),
    facts: [
      ['יציאה מליביניו עד', derived.leaveLivignoClock],
      ['טיסה חזרה', `${backLeg.flight} ב-${backLeg.dep}`],
    ],
  });

  pushEvent({
    id: 'transfer-departure',
    dateIso: raw.dates.end,
    startClock: derived.leaveLivignoClock,
    endClock: derived.backAirportByClock,
    tz: 'Europe/Rome',
    kind: 'transfer',
    titleHe: 'נסיעה מליביניו לנמל התעופה מלפנסה (MXP)',
    subHe: `כולל מרווח ביטחון של ${raw.dates.roadBufferMin} דקות לתנועת שבת ולתנאי שלג במעבר Foscagno`,
    whereHe: `${raw.apartment.address} → ${backLeg.mapQuery}`,
    mapUrl: buildGoogleMapsRouteUrl(raw.apartment.mapQuery, backLeg.mapQuery, 'driving'),
    facts: [
      ['יציאה מליביניו', derived.leaveLivignoClock],
      ['הגעת יעד למלפנסה T1', derived.backAirportByClock],
      ['המראה', backLeg.dep],
    ],
  });

  pushEvent({
    id: 'flight-back',
    dateIso: backLeg.date,
    startClock: backLeg.dep,
    endDateIso: backLeg.arrDate ?? backLeg.date,
    endClock: backLeg.arr,
    tz: backLeg.fromTz,
    endTz: backLeg.toTz,
    kind: 'flight',
    titleHe: `טיסה ${backLeg.flight} · חזרה הביתה לנתב״ג`,
    subHe: `${backLeg.fromHe} ← ${backLeg.toHe}`,
    whereHe: backLeg.fromHe,
    mapUrl: buildGoogleMapsSearchUrl(backLeg.mapQuery),
    facts: [
      ['להיות בשדה עד', derived.backAirportByClock],
      ['המראה ממלפנסה', `${backLeg.dep} (שעון איטליה)`],
      ['נחיתה בנתב״ג', `${backLeg.arr} (שעון ישראל)`],
    ],
    links: [['סטטוס טיסה חי ↗', buildFlightAwareUrl(backLeg.flight)]],
  });

  const events: TimelineEvent[] = rawEvents
    .map((e) => ({
      ...e,
      ...computeWindows(e.kind, e.startMs, e.endMs),
    }))
    .sort((a, b) => a.startMs - b.startMs);

  const midCourseDate = addDaysIso(raw.dates.courseStart, 2);
  const presets: TimelinePreset[] = [
    {
      id: 'live',
      labelHe: 'זמן אמת (השעון שלך)',
      isoParam: '',
      descriptionHe: 'מצב רגיל — לפי התאריך והשעה האמיתיים כרגע',
    },
    {
      id: 'tlv-night',
      labelHe: 'ליל ההמראה בנתב״ג',
      isoParam: `${outLeg.date}T02:30+02:00`,
      descriptionHe: `בטרמינל 3 לפני טיסה ${outLeg.flight}`,
    },
    {
      id: 'mxp-arrival',
      labelHe: 'נחיתה והסעה לליביניו',
      isoParam: `${outLeg.date}T10:15+01:00`,
      descriptionHe: `יציאה ממלפנסה בדרך ל-${fnName}`,
    },
    {
      id: 'sat-transition',
      labelHe: 'שבת בבוקר · מעבר וסקי ראשון',
      isoParam: `${raw.dates.aptIn}T09:35+01:00`,
      descriptionHe: 'מעבר ל-Calanda, ציוד ב-Sport4U ועלייה ראשונה לשלג',
    },
    {
      id: 'midweek-course',
      labelHe: 'אמצע שבוע · לפני הקורס',
      isoParam: `${midCourseDate}T10:45+01:00`,
      descriptionHe: 'אמצע השבוע בליביניו — לקראת השיעור ב-Campo Scuola 23',
    },
    {
      id: 'last-sat',
      labelHe: 'שבת אחרונה · חזרה למלפנסה',
      isoParam: `${raw.dates.end}T14:15+01:00`,
      descriptionHe: `לקראת היציאה ב-${derived.leaveLivignoClock} מליביניו לטיסת הלילה ${backLeg.flight}`,
    },
  ];

  return {
    events,
    days,
    tzLabelsHe: TZ_LABELS_HE,
    presets,
  };
}
