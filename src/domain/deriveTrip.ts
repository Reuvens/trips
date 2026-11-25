/**
 * Pure domain derivation engine: transforms validated `TripData` + `RatesData`
 * into an immutable, strictly typed `TripViewModel` with zero redundant inputs.
 */
import type {
  OpenItem,
  PartyMember,
  RatesData,
  ResortData,
  TripData,
  VillagePin,
} from '../schema/trip.schema.js';
import {
  addDaysIso,
  daysBetween,
  EN_MONTHS,
  formatDm,
  formatDmy,
  formatDowFull,
  formatDowFullDm,
  formatDurationHours,
  formatEur,
  formatIls,
  formatSpanDm,
  formatSpanEn,
  formatSpanWindowHe,
  formatUsd,
  heCountMasc,
  interpolateTokens,
  minutesToClock,
  parseClockMinutes,
  parseIsoDate,
} from './format.js';
import {
  buildAirbnbSearchUrl,
  buildBookingPropertyUrl,
  buildBookingSearchUrl,
  buildFlightAwareUrl,
  buildGoogleHotelsUrl,
  buildGoogleMapsSearchUrl,
  buildWhatsAppUrl,
} from './links.js';
import { buildSkiTimeline, wallTimeToEpochMs, type TimelinePayload } from './timeline.js';

export type CashflowStageKey = 'paid' | 'bookedPending' | 'toBookOnline' | 'onSite';

export interface BudgetLineVM {
  key: string;
  labelHe: string;
  eur: number;
  eurText: string;
  ils: number;
  ilsText: string;
  conf: 'quoted' | 'modelled';
  stage: CashflowStageKey;
  paidEur: number;
  bookedPendingEur: number;
  toBookOnlineEur: number;
  onSiteEur: number;
  statusHe: string;
  whatHe: string;
  srcUrl?: string;
  srcLabelHe?: string;
  isBooked: boolean;
}

export interface CashflowStageVM {
  key: CashflowStageKey;
  labelHe: string;
  subHe: string;
  eur: number;
  eurText: string;
  ilsText: string;
  pct: number;
}

export interface DerivedCarOptionVM {
  nameHe: string;
  conf: 'quoted' | 'modelled';
  days: number;
  baseEur: number;
  fuelEur: number;
  tollsEur: number;
  kmRoundTrip: number;
  eurReturn: number;
  eurText: string;
  vsPickEur: number;
  vsPickHe: string;
  whatHe: string;
  watchHe: string;
  url: string;
  compareUrl: string;
}

export interface DerivedResortVM {
  id: string;
  name: string;
  nameHe: string;
  countryHe: string;
  order: number;
  airportHe: string;
  transferMin: number;
  transferKm: number;
  transferHe: string;
  pistesKm: number;
  baseM: number;
  villageM: number;
  topM: number;
  verdictHe: string;
  liftPassLink: string;
  schoolLink: string;
  hotelsLink: string;
  bookingSearchUrl: string;
  airbnbSearchUrl: string;
  arriveHe: string;
  leaveByHe: string;
  lastSkiHe: string;
  fridaySkiPossible: boolean;
  stays: Array<{
    name: string;
    pick: boolean;
    conf: 'quoted' | 'modelled';
    checkedDm: string;
    eurLow: number;
    eurWeek: number;
    eurHigh: number;
    rangeText: string;
    perNightRangeText: string;
    historicalBasisHe: string;
    kindHe: string;
    bedsHe: string;
    liftHe: string;
    centreHe: string;
    perksHe: string;
    watchHe?: string;
    url: string;
    bookingDatedUrl?: string;
    googleHotelsUrl: string;
  }>;
  rentals: Array<{
    name: string;
    pick: boolean;
    whereHe: string;
    whatHe: string;
    url: string;
  }>;
  schools: Array<{
    name: string;
    pick: boolean;
    whereHe: string;
    whatHe: string;
    url: string;
  }>;
  firstNightOptions: Array<{
    name: string;
    pick: boolean;
    areaHe?: string;
    eur?: number;
    eurText?: string;
    score?: number;
    reviews?: number;
    stars?: number;
    toLivignoMin?: number;
    toLivignoHe?: string;
    freeCancel: boolean;
    whatHe: string;
    url: string;
    bookingDatedUrl?: string;
    googleHotelsUrl: string;
  }>;
  transferOptions: Array<{
    id: string;
    name: string;
    pick: boolean;
    isShared: boolean;
    seats?: number;
    eurReturn: number;
    eurText: string;
    wayText: string;
    conf: 'quoted' | 'modelled';
    whatHe: string;
    freeCancelHe?: string;
    watchHe?: string;
    url: string;
  }>;
  pickTransfer: {
    id: string;
    name: string;
    eurReturn: number;
    eurText: string;
    wayText: string;
    conf: 'quoted' | 'modelled';
    whatHe: string;
    url: string;
  };
  carOption: DerivedCarOptionVM;
  comparisonLines: Array<{
    key: string;
    labelHe: string;
    eur: number;
    eurText: string;
    conf: 'quoted' | 'modelled';
    whatHe: string;
    src: string;
    srcHe: string;
    lo?: number;
    hi?: number;
  }>;
  passesEur: number;
  passesInsuranceEur: number;
  passesInsuranceText: string;
  gearEur: number;
  lessonsEur: number;
  lessonsText: string;
  lessonsUnitEur: number;
  lessonsUnitText: string;
  lessonsWhatHe: string;
  lessonsAltHe?: string;
  lessonsSrc: string;
  lessonsSrcHe: string;
  foodPerDayEur: number;
  foodPerDayText: string;
  foodWeekEur: number;
  foodWeekText: string;
  foodPerPersonPerDayText: string;
  foodBreakdownHe: string;
  foodSrc: string;
  foodSrcHe: string;
  packageEur: number;
  packageText: string;
  packageRangeText: string;
  totalEur: number;
  totalText: string;
  totalRangeText: string;
  totalIlsText: string;
  perPersonText: string;
  priceRank: number;
  vsCheapestEur: number;
  vsCheapestText: string;
  barPct: number;
  fitPoints: number;
  fitMax: number;
  fitPct: number;
  fitRank: number;
  flags: Array<{ kind: 'green' | 'red'; textHe: string }>;
}

export interface HostMessageTemplateVM {
  id: string;
  recipientTitleHe: string;
  channelHe: string;
  whatsappUrl?: string;
  bookingHelperHe: string;
  subjectEn: string;
  bodyEn: string;
  bodyIt: string;
}

export interface OpenItemVM extends Omit<OpenItem, 'whatHe' | 'titleHe'> {
  titleHe: string;
  whatHe: string;
  deadlineDm?: string;
  deadlineShortHe?: string;
}

export interface TrailSignVM {
  id: string;
  labelHe: string;
  statusHe: string;
  done: boolean;
  href: string;
  linkedTaskIds: string[];
}

export interface TripViewModel {
  meta: TripData['meta'];
  rates: {
    eurIls: number;
    eurIlsDisplay: string;
    eurUsd: number;
    usdIls: number;
    checkedIso: string;
    checkedDm: string;
    source: string;
  };
  dates: {
    startIso: string;
    endIso: string;
    homeLandingIso: string;
    aptInIso: string;
    aptOutIso: string;
    courseStartIso: string;
    courseEndIso: string;
    startDm: string;
    endDm: string;
    homeLandingDm: string;
    aptInDm: string;
    aptOutDm: string;
    courseStartDm: string;
    courseEndDm: string;
    startDow: string;
    endDow: string;
    aptInDow: string;
    homeLandingDow: string;
    startLongHe: string;
    endLongHe: string;
    aptInLongHe: string;
    courseEndLongHe: string;
    windowHe: string;
    spanDmYear: string;
    spanEn: string;
    aptSpanHe: string;
    courseSpanHe: string;
    courseHoursText: string;
    nights: number;
    aptNights: number;
    skiDays: number;
    courseDays: number;
    foodDays: number;
    nightsSplitHe: string;
    airportExitMin: number;
    airportBeforeMin: number;
    roadBufferMin: number;
    departureEpochMs: number;
  };
  party: {
    peopleCount: number;
    peopleHe: string;
    skiersCount: number;
    beginnersCount: number;
    advancedCount: number;
    nonSkiersCount: number;
    juniorMaxAge: number;
    bandsSummaryHe: string;
    members: Array<
      PartyMember & {
        skis: boolean;
        grade: 'black' | 'blue' | 'none';
        passText: string;
        bookingGroupLabelHe: string;
        seatsStatusHe: string;
      }
    >;
  };
  oritGuide: Array<{
    titleHe: string;
    whenHe: string;
    detailHe: string;
    mapUrl: string;
    url?: string;
  }>;
  flights: {
    out: TripData['flights']['legs'][number] & {
      dateDm: string;
      dateLongHe: string;
      airportByClock: string;
      statusUrl: string;
    };
    back: TripData['flights']['legs'][number] & {
      dateDm: string;
      dateLongHe: string;
      arrDateLongHe: string;
      airportByClock: string;
      statusUrl: string;
    };
    baggageHe: string;
    bookings: Array<{
      id: string;
      namesHe: string;
      memberIds: string[];
      paxCount: number;
      classHe: string;
      points: number;
      pointsText: string;
      usd: number;
      usdText: string;
      paidSummaryHe: string;
      seatsAssigned: boolean;
      seatsHe: string;
      noteHe?: string;
    }>;
    bookingCount: number;
    totalTickets: number;
    awardTicketsCount: number;
    pointsPerAwardTicket: number;
    pointsTotal: number;
    pointsTotalText: string;
    usdTotal: number;
    usdTotalText: string;
  };
  apartment: {
    name: string;
    unitHe: string;
    hostName: string;
    hostHe: string;
    address: string;
    phone: string;
    whatsappUrl: string;
    url: string;
    bookingPage: string;
    googleHotelsUrl: string;
    mapUrl: string;
    bookedDm: string;
    bookedViaHe: string;
    eurTotal: number;
    totalText: string;
    eurPaid: number;
    paidText: string;
    paidOnDm: string;
    paidHowHe: string;
    paidPct: number;
    balanceEur: number;
    balanceText: string;
    taxEur: number;
    taxText: string;
    dueOnSiteOrBalanceEur: number;
    dueOnSiteOrBalanceText: string;
    perNightText: string;
    refundable: boolean;
    refundHe: string;
    besafeNoteHe: string;
    checkInApprox: string;
    checkOutApprox: string;
    factsHe: string[];
    askHe: string[];
  };
  carRental: {
    nameHe: string;
    days: number;
    eurPerDayText: string;
    coverPerDayText: string;
    winterPerDayText: string;
    baseText: string;
    freeCancelHe: string;
    watchHe: string[];
    url: string;
    compareUrl: string;
  };
  firstNight: {
    name: string;
    unitHe: string;
    unitShortHe: string;
    address: string;
    whereHe: string;
    mapUrl: string;
    googleHotelsUrl: string;
    bookedDm: string;
    bookedViaHe: string;
    eurBooking: number;
    bookingText: string;
    cleaningText: string;
    eurThereTax: number;
    thereTaxText: string;
    eurTotal: number;
    totalText: string;
    eurPaid: number;
    checkIn: string;
    checkInUntil: string;
    checkOutFrom: string;
    checkOut: string;
    freeCancelIso: string;
    freeCancelDm: string;
    cancelNextDm: string;
    cancelFeeEur: number;
    cancelFeeText: string;
    cancelSummaryHe: string;
    replacedName: string;
    replacedText: string;
    savedEur: number;
    savedText: string;
    goodHe: string[];
    askHe: string[];
  } | null;
  transferBooked: {
    provider: string;
    contactName: string;
    email: string;
    url: string;
    bookedOnIso: string;
    bookedDm: string;
    bookedViaHe: string;
    vehicleHe: string;
    luggageHe: string;
    eurWayFor4: number;
    eurReturnFor4: number;
    wayFor4Text: string;
    returnFor4Text: string;
    extraPaxEurWay: number;
    extraPaxWayText: string;
    eurWay: number;
    eurReturn: number;
    eurPaid: number;
    wayText: string;
    returnText: string;
    ilsText: string;
    savedVsPickEur: number;
    savedVsPickText: string;
    payMethodHe: string;
    freeCancelHe: string;
    outboundPickupHe: string;
    returnPickupClock: string;
    returnPickupNoteHe: string;
    meetingPointHe: string;
    driverDetailsNoteHe: string;
    pendingItemsHe: string[];
  } | null;
  fridayComparison: {
    checkedDateText: string;
    count: number;
    minText: string;
    maxText: string;
    cheaperRangeText: string;
    cheaperMinutesHe: string;
  };
  resorts: DerivedResortVM[];
  resortsById: Record<string, DerivedResortVM>;
  decided: DerivedResortVM;
  alternatives: DerivedResortVM[];
  byPrice: DerivedResortVM[];
  byFit: DerivedResortVM[];
  spread: {
    cheapestHe: string;
    cheapestText: string;
    dearestHe: string;
    dearestText: string;
    gapEur: number;
    gapText: string;
    gapPct: number;
    gapVerdictHe: string;
    introHe: string;
    pullHe: string;
    winLoseByResort: Array<{ nameHe: string; winHe: string; loseHe: string }>;
  };
  budget: {
    lines: BudgetLineVM[];
    stages: CashflowStageVM[];
    totalEur: number;
    totalText: string;
    totalIls: number;
    totalIlsText: string;
    paidEur: number;
    paidText: string;
    leftEur: number;
    leftText: string;
    perPersonExactEur: number;
    perPersonEur: number;
    perPersonText: string;
    perPersonIlsText: string;
    vsComparisonDiffEur: number;
    vsComparisonHe: string;
    excludedHe: string[];
  };
  simulator: {
    canonicalTotalEur: number;
    transferPrivateEur: number;
    transferCarEur: number;
    transferSharedEur: number;
    gearPlusSchoolSeparateEur: number;
    gearPlusSchoolCentraleBundleEur: number;
    centraleBundleSavingsEur: number;
    centraleBundlePerBeginnerText: string;
    insuranceFamilyEur: number;
    insurancePerPersonText: string;
    lastSatSkiTotalEur: number;
    lastSatSkiPerSkierText: string;
  };
  villageMapPins: Array<
    VillagePin & {
      mapUrl: string;
      forWhoNamesHe: string;
    }
  >;
  hostMessages: HostMessageTemplateVM[];
  signs: TrailSignVM[];
  heroLedeHe: string;
  fit: {
    criteria: TripData['fit']['criteria'];
    scores: TripData['fit']['scores'];
    winnerHe: string;
    winnerPct: number;
    runnerHe: string;
    runnerPct: number;
    thirdHe: string;
    thirdPct: number;
  };
  setAside: TripData['setAside'];
  sources: TripData['sources'];
  reconciled: TripData['reconciled'];
  counts: {
    setAside: number;
    sourcesRead: number;
    reconciledTotal: number;
    reconciledMoved: number;
    openTotal: number;
    openRed: number;
  };
  worldFacts: TripData['worldFacts'];
  openItems: OpenItemVM[];
  timeline: TimelinePayload;
  vaultAuth: {
    allowedEmails: string[];
    googleClientId: string;
    driveVaultFileId: string;
  };
  liveMountain: TripData['liveMountain'];
  lunchMeetups: Array<
    TripData['lunchMeetups'][number] & {
      mapUrl: string;
    }
  >;
  culinaryAndShopping: Array<
    TripData['culinaryAndShopping'][number] & {
      mapUrl: string;
      categoryLabelHe: string;
    }
  >;
  packingList: Array<
    TripData['packingList'][number] & {
      groupLabelHe: string;
      forWhoNamesHe: string;
    }
  >;
  fieldKit: TripData['fieldKit'];
  dailyPlanCards: TripData['dailyPlanCards'];
}

export function deriveTripViewModel(raw: TripData, rates: RatesData): TripViewModel {
  const eurRate = rates.eur_ils_exact ?? rates.eur_ils;
  const nights = daysBetween(raw.dates.start, raw.dates.end);
  const aptNights = daysBetween(raw.dates.aptIn, raw.dates.aptOut);
  const courseDays = daysBetween(raw.dates.courseStart, raw.dates.courseEnd) + 1;
  const skiDays = daysBetween(raw.dates.aptIn, raw.dates.courseEnd) + 1;
  const foodDays = nights + 1;
  const carDays = nights + 1;

  const peopleCount = raw.party.members.length;
  const skiers = raw.party.members.filter((m) => m.role !== 'non_skier');
  const beginners = raw.party.members.filter((m) => m.role === 'beginner');
  const advanced = raw.party.members.filter((m) => m.role === 'advanced');
  const skiersCount = skiers.length;
  const beginnersCount = beginners.length;
  const advancedCount = advanced.length;
  const nonSkiersCount = peopleCount - skiersCount;

  const memberNameById = new Map(raw.party.members.map((m) => [m.id, m.nameHe]));

  // Flights
  const outLegRaw = raw.flights.legs.find((l) => l.id === 'out');
  const backLegRaw = raw.flights.legs.find((l) => l.id === 'back');
  if (!outLegRaw || !backLegRaw) {
    throw new Error('Both outbound (out) and return (back) flight legs are required');
  }

  const outDepMins = parseClockMinutes(outLegRaw.dep).minutes;
  const outArrMins = parseClockMinutes(outLegRaw.arr).minutes;
  const backDepMins = parseClockMinutes(backLegRaw.dep).minutes;

  const outAirportBy = minutesToClock(outDepMins - raw.dates.airportBeforeMin, 15, true);
  const backAirportBy = minutesToClock(backDepMins - raw.dates.airportBeforeMin, 15, true);

  const bookingByMemberId = new Map<string, { labelHe: string; seatsHe: string }>();
  const bookingsVM = raw.flights.bookings.map((b, idx) => {
    const namesHe = b.who.map((id) => memberNameById.get(id) ?? id).join(' · ');
    const pointsText = b.points > 0 ? b.points.toLocaleString('en-US') : '—';
    const usdText = formatUsd(b.usd);
    const paidSummaryHe =
      b.points > 0 ? `${pointsText} נקודות + ${usdText}` : `${usdText} מסים בלבד`;
    for (const mId of b.who) {
      bookingByMemberId.set(mId, {
        labelHe: `הזמנה #${idx + 1} (${b.classHe})`,
        seatsHe: b.seatsHe,
      });
    }
    return {
      id: b.id,
      namesHe,
      memberIds: b.who,
      paxCount: b.who.length,
      classHe: b.classHe,
      points: b.points,
      pointsText,
      usd: b.usd,
      usdText,
      paidSummaryHe,
      seatsAssigned: b.seatsAssigned,
      seatsHe: b.seatsHe,
      noteHe: b.noteHe,
    };
  });

  const pointsTotal = bookingsVM.reduce((acc, b) => acc + b.points, 0);
  const usdTotal = bookingsVM.reduce((acc, b) => acc + b.usd, 0);
  const totalTickets = bookingsVM.reduce((acc, b) => acc + b.paxCount, 0);
  const awardTicketsCount = bookingsVM
    .filter((b) => b.points > 0)
    .reduce((acc, b) => acc + b.paxCount, 0);

  const departureEpochMs = wallTimeToEpochMs(
    outLegRaw.date,
    outLegRaw.dep,
    outLegRaw.fromTz
  ).ms;

  // Party members VM
  const membersVM = raw.party.members.map((m) => {
    const skis = m.role !== 'non_skier';
    const grade: 'black' | 'blue' | 'none' =
      m.role === 'advanced' ? 'black' : m.role === 'beginner' ? 'blue' : 'none';
    const bInfo = bookingByMemberId.get(m.id);
    return {
      ...m,
      skis,
      grade,
      passText: skis ? `~${formatEur(m.passEur)}` : formatEur(0),
      bookingGroupLabelHe: bInfo?.labelHe ?? '',
      seatsStatusHe: bInfo?.seatsHe ?? '',
    };
  });

  const decidedRaw = raw.resorts.find((r) => r.id === raw.decidedResortId);
  if (!decidedRaw) {
    throw new Error(`decidedResortId "${raw.decidedResortId}" does not match any resort`);
  }

  const tbRaw = raw.transferBooked ?? null;
  const landExitMins = outArrMins + raw.dates.airportExitMin;
  const atMxpReturnMins = backDepMins - raw.dates.airportBeforeMin;
  const decidedArriveClock = minutesToClock(landExitMins + decidedRaw.transferMin);
  const computedLeaveMins = atMxpReturnMins - decidedRaw.transferMin - raw.dates.roadBufferMin;
  const decidedLeaveMins = tbRaw
    ? parseClockMinutes(tbRaw.returnPickupClock).minutes
    : computedLeaveMins;
  const decidedLeaveClock = tbRaw
    ? tbRaw.returnPickupClock
    : minutesToClock(computedLeaveMins, 15, true);
  const decidedLastSkiClock = minutesToClock(decidedLeaveMins - 90, 15, true);

  // Apartment & First Night pre-calculations (so tokens can reference them)
  const aptBalanceEur = raw.apartment.eurTotal - raw.apartment.eurPaid;
  const aptDueOnSiteOrBalanceEur = aptBalanceEur + raw.apartment.taxEur;
  const aptPaidPct = Math.round((100 * raw.apartment.eurPaid) / raw.apartment.eurTotal);

  const fnRaw = raw.firstNightBooked;
  const fnTotalEur = fnRaw ? fnRaw.eurBooking + fnRaw.eurThereTax : 0;
  const fnCancelNextIso = fnRaw ? addDaysIso(fnRaw.freeCancelUntil, 1) : '';
  const fnSavedEur = fnRaw ? fnRaw.replacedEur - fnTotalEur : 0;

  // Build Token Dictionary for safe prose interpolation across all YAML strings
  const partyTokenMap: Record<string, { passText: string }> = {};
  for (const m of membersVM) {
    partyTokenMap[m.id] = { passText: formatEur(m.passEur) };
  }

  const decidedPassesEur =
    skiers.reduce((acc, m) => acc + m.passEur, 0) + decidedRaw.cost.passes.insuranceEur;

  const tokenDict: Record<string, unknown> = {
    dates: {
      startDm: formatDm(raw.dates.start),
      endDm: formatDm(raw.dates.end),
      aptSpanHe: formatSpanDm(raw.dates.aptIn, raw.dates.aptOut),
      courseSpanHe: `ראשון–שישי, ${formatSpanDm(raw.dates.courseStart, raw.dates.courseEnd)}`,
      courseHoursText: `${raw.dates.courseHours.start}–${raw.dates.courseHours.end}`,
      nights,
      aptNights,
      skiDays,
      courseDays,
      foodDays,
    },
    party: {
      people: peopleCount,
      skiers: skiersCount,
      beginners: beginnersCount,
      ...partyTokenMap,
    },
    flights: {
      out: {
        flight: outLegRaw.flight,
        dep: outLegRaw.dep,
        arr: outLegRaw.arr,
        airportByClock: outAirportBy,
      },
      back: {
        flight: backLegRaw.flight,
        dep: backLegRaw.dep,
        arr: backLegRaw.arr,
        airportByClock: backAirportBy,
      },
      pointsTotalText: pointsTotal.toLocaleString('en-US'),
      usdTotalText: formatUsd(usdTotal),
      reuvenSeatsHe: bookingsVM.find((b) => b.id === 'reuven')?.seatsHe ?? '',
    },
    apartment: {
      totalText: formatEur(raw.apartment.eurTotal),
      paidText: formatEur(raw.apartment.eurPaid),
      balanceText: formatEur(aptBalanceEur),
      taxText: formatEur(raw.apartment.taxEur),
    },
    firstNight: fnRaw
      ? {
          name: fnRaw.name,
          totalText: formatEur(fnTotalEur),
          checkIn: fnRaw.checkIn,
          freeCancelDm: formatDmy(fnRaw.freeCancelUntil),
        }
      : {
          name: '',
          totalText: '',
          checkIn: '',
          freeCancelDm: '',
        },
    transferBooked: tbRaw
      ? {
          provider: tbRaw.provider,
          contactName: tbRaw.contactName,
          wayText: formatEur(tbRaw.eurWay),
          returnText: formatEur(tbRaw.eurReturn),
          for4WayText: formatEur(tbRaw.eurWayFor4),
          for4ReturnText: formatEur(tbRaw.eurWayFor4 * 2),
          returnPickupClock: tbRaw.returnPickupClock,
        }
      : {
          provider: '',
          contactName: '',
          wayText: '',
          returnText: '',
          for4WayText: '',
          for4ReturnText: '',
          returnPickupClock: '',
        },
    decided: {
      baseM: decidedRaw.baseM.toLocaleString('en-US'),
      topM: decidedRaw.topM.toLocaleString('en-US'),
      transferHe: formatDurationHours(decidedRaw.transferMin),
      arriveHe: decidedArriveClock,
      leaveByHe: decidedLeaveClock,
      lastSkiHe: decidedLastSkiClock,
      passes: {
        eurText: formatEur(decidedPassesEur),
        insuranceText: formatEur(decidedRaw.cost.passes.insuranceEur),
      },
      lessons: {
        unitText: formatEur(decidedRaw.lessons.unitEur),
        totalText: formatEur(decidedRaw.lessons.unitEur * beginnersCount),
      },
    },
    sim: {
      centraleBundlePerBeginnerText: formatEur(
        raw.simulator.centraleCourseAndGearPerBeginnerEur
      ),
      insurancePerPersonText: formatEur(raw.simulator.travelSkiInsurancePerPersonEur),
    },
    world: {
      pisteLawHe: raw.worldFacts.italyPisteInsurance.lawHe,
      pisteDayPriceText: formatEur(raw.worldFacts.italyPisteInsurance.dayPriceEur),
      etiasFeeText: formatEur(raw.worldFacts.etias.feeEur),
      mountainDishText: formatEur(raw.worldFacts.livignoFoodUnitNotes.mountainDishEur),
      trattoriaDinnerText: formatEur(raw.worldFacts.livignoFoodUnitNotes.trattoriaDinnerEur),
      groceriesDayText: formatEur(raw.worldFacts.livignoFoodUnitNotes.breakfastGroceriesDayEur),
      cerviniaAdultPassText: formatEur(raw.worldFacts.cerviniaAdult7dPassEur),
      sestriereAdultPassText: formatEur(raw.worldFacts.sestriereAdult7dPassEur),
      sestriereJuniorPassText: formatEur(raw.worldFacts.sestriereJunior7dPassEur),
    },
  };

  const interp = (s: string): string => interpolateTokens(s, tokenDict);

  // Car base cost
  const carBaseEur =
    carDays *
    (raw.carRental.eurPerDay + raw.carRental.coverEurPerDay + raw.carRental.winterEurPerDay);

  // Fit scoring
  const totalFitWeight = raw.fit.criteria.reduce((acc, c) => acc + c.weight, 0);
  const fitMax = totalFitWeight * 5;

  // Derive each resort
  const sortedRawResorts = [...raw.resorts].sort((a, b) => a.order - b.order);
  const resortsVM: DerivedResortVM[] = sortedRawResorts.map((r: ResortData) => {
    const isDecided = r.id === raw.decidedResortId;
    const staysVM = (r.stays ?? []).map((st) => ({
      name: st.name,
      pick: Boolean(st.pick),
      conf: st.conf,
      checkedDm: formatDm(st.checked),
      eurLow: st.eurLow,
      eurWeek: st.eurWeek,
      eurHigh: st.eurHigh,
      rangeText: `${formatEur(st.eurLow)}–${st.eurHigh.toLocaleString('en-US')}`,
      perNightRangeText: `${formatEur(Math.round(st.eurLow / aptNights))}–${Math.round(
        st.eurHigh / aptNights
      ).toLocaleString('en-US')}`,
      historicalBasisHe: st.historicalBasisHe,
      kindHe: interp(st.kindHe),
      bedsHe: interp(st.bedsHe),
      liftHe: interp(st.liftHe),
      centreHe: interp(st.centreHe),
      perksHe: interp(st.perksHe),
      watchHe: st.watchHe ? interp(st.watchHe) : undefined,
      url: st.url,
      bookingDatedUrl: st.bookingUrl
        ? buildBookingPropertyUrl(st.bookingUrl, raw.dates.aptIn, raw.dates.aptOut, peopleCount)
        : undefined,
      googleHotelsUrl: buildGoogleHotelsUrl(st.hotelsQuery, raw.dates.aptIn, raw.dates.aptOut),
    }));

    const pickStay =
      staysVM.find((s) => s.pick) ??
      (isDecided
        ? {
            name: raw.apartment.name,
            eurLow: raw.apartment.eurTotal,
            url: raw.apartment.url,
          }
        : staysVM[0]!);

    const firstNightOptsVM = r.firstNightOptions.map((fn) => ({
      name: fn.name,
      pick: Boolean(fn.pick),
      areaHe: fn.areaHe,
      eur: fn.eur,
      eurText: fn.eur !== undefined ? formatEur(fn.eur) : undefined,
      score: fn.score,
      reviews: fn.reviews,
      stars: fn.stars,
      toLivignoMin: fn.toLivignoMin,
      toLivignoHe: fn.toLivignoMin !== undefined ? `~${fn.toLivignoMin} דק׳` : undefined,
      freeCancel: Boolean(fn.freeCancel),
      whatHe: interp(fn.whatHe),
      url: fn.url,
      bookingDatedUrl:
        fn.eur !== undefined
          ? buildBookingPropertyUrl(
              fn.url,
              raw.dates.start,
              raw.dates.aptIn,
              peopleCount - 1,
              raw.party.juniorMaxAge
            )
          : undefined,
      googleHotelsUrl: buildGoogleHotelsUrl(fn.hotelsQuery, raw.dates.start, raw.dates.aptIn),
    }));

    const transferOptsVM = r.transferOptions.map((o) => ({
      id: o.id,
      name: o.name,
      pick: Boolean(o.pick),
      isShared: Boolean(o.isShared),
      seats: o.seats,
      eurReturn: o.eurReturn,
      eurText: formatEur(o.eurReturn),
      wayText: formatEur(Math.round(o.eurReturn / 2)),
      conf: o.conf,
      whatHe: interp(o.whatHe),
      freeCancelHe: o.freeCancelHe ? interp(o.freeCancelHe) : undefined,
      watchHe: o.watchHe ? interp(o.watchHe) : undefined,
      url: o.url,
    }));

    const pickTransfer = transferOptsVM.find((o) => o.pick) ?? transferOptsVM[0]!;

    const kmRoundTrip = 2 * r.transferKm;
    const fuelEur = Math.round(
      ((kmRoundTrip * raw.carRental.litersPer100Km) / 100) * raw.carRental.eurPerLiter
    );
    const tollsEur = 2 * r.car.tollEurWay;
    const carTotalEur = carBaseEur + fuelEur + tollsEur;
    const carGap = carTotalEur - pickTransfer.eurReturn;
    const carOption: DerivedCarOptionVM = {
      nameHe: raw.carRental.nameHe,
      conf: raw.carRental.conf,
      days: carDays,
      baseEur: carBaseEur,
      fuelEur,
      tollsEur,
      kmRoundTrip,
      eurReturn: carTotalEur,
      eurText: formatEur(carTotalEur),
      vsPickEur: carGap,
      vsPickHe:
        carGap < 0
          ? `זול ב-${formatEur(-carGap)} מההסעה המומלצת`
          : carGap > 0
            ? `יקר ב-${formatEur(carGap)} מההסעה המומלצת`
            : 'זהה במחיר להסעה המומלצת',
      whatHe: `${carDays} ימי השכרה: ${formatEur(carBaseEur)} (${formatEur(
        raw.carRental.eurPerDay
      )} ליום + ביטול השתתפות עצמית + צמיגי חורף) + דלק ~${formatEur(
        fuelEur
      )} ל-${kmRoundTrip.toLocaleString('en-US')} ק״מ + אגרות ~${formatEur(tollsEur)}`,
      watchHe: interp(r.car.noteHe),
      url: raw.carRental.url,
      compareUrl: raw.carRental.compareUrl,
    };

    // Comparison lines (frozen comparison model across all 3 resorts)
    const lodgingMid = Math.floor(
      (raw.lodgingComparisonAssumption.eurLow + raw.lodgingComparisonAssumption.eurHigh) / 2
    );
    const resortPassesEur = isDecided
      ? decidedPassesEur
      : (r.cost.passes.eur ?? decidedPassesEur);

    const comparisonLines = [
      {
        key: 'lodging',
        labelHe: 'דירה',
        eur: lodgingMid,
        eurText: formatEur(lodgingMid),
        conf: 'modelled' as const,
        lo: raw.lodgingComparisonAssumption.eurLow,
        hi: raw.lodgingComparisonAssumption.eurHigh,
        whatHe: `הנחת בסיס אחידה להשוואה: ${formatEur(
          raw.lodgingComparisonAssumption.eurLow
        )}–${raw.lodgingComparisonAssumption.eurHigh.toLocaleString(
          'en-US'
        )} לשבוע לדירה מרווחת לחמישה (הזולה שנמצאה כאן: ${pickStay.name} ב-${formatEur(
          pickStay.eurLow
        )})`,
        src: pickStay.url,
        srcHe: pickStay.name,
      },
      {
        key: 'firstNight',
        labelHe: 'מלון · הלילה הראשון',
        eur: r.cost.firstNight.eur,
        eurText: formatEur(r.cost.firstNight.eur),
        conf: r.cost.firstNight.conf,
        whatHe: interp(r.cost.firstNight.whatHe),
        src: r.cost.firstNight.src,
        srcHe: r.cost.firstNight.srcHe,
      },
      {
        key: 'transfers',
        labelHe: 'הסעות משדה התעופה',
        eur: pickTransfer.eurReturn,
        eurText: pickTransfer.eurText,
        conf: pickTransfer.conf,
        whatHe: `${pickTransfer.name} — הלוך וחזור לחמישה`,
        src: pickTransfer.url,
        srcHe: pickTransfer.name,
      },
      {
        key: 'passes',
        labelHe: 'סקי-פס',
        eur: resortPassesEur,
        eurText: formatEur(resortPassesEur),
        conf: r.cost.passes.conf,
        whatHe: interp(r.cost.passes.whatHe),
        src: r.cost.passes.src,
        srcHe: r.cost.passes.srcHe,
      },
      {
        key: 'gear',
        labelHe: 'ציוד',
        eur: r.cost.gear.eur,
        eurText: formatEur(r.cost.gear.eur),
        conf: r.cost.gear.conf,
        whatHe: interp(r.cost.gear.whatHe),
        src: r.cost.gear.src,
        srcHe: r.cost.gear.srcHe,
      },
    ];

    const packageEur = comparisonLines.reduce((acc, l) => acc + l.eur, 0);
    const lessonsEur = r.lessons.unitEur * beginnersCount;
    const foodWeekEur = r.food.perDayEur * foodDays;
    const totalEur = packageEur + lessonsEur + foodWeekEur;

    const loDelta = raw.lodgingComparisonAssumption.eurLow - lodgingMid;
    const hiDelta = raw.lodgingComparisonAssumption.eurHigh - lodgingMid;

    // Timings
    const arriveMins = landExitMins + r.transferMin;
    const leaveMins = atMxpReturnMins - r.transferMin - raw.dates.roadBufferMin;

    // Fit score
    const resortScores = raw.fit.scores[r.id] ?? {};
    const fitPoints = raw.fit.criteria.reduce((acc, c) => {
      const cell = resortScores[c.id];
      return acc + (cell ? c.weight * cell.n : 0);
    }, 0);
    const fitPct = fitMax > 0 ? Math.round((100 * fitPoints) / fitMax) : 0;

    return {
      id: r.id,
      name: r.name,
      nameHe: r.nameHe,
      countryHe: r.countryHe,
      order: r.order,
      airportHe: r.airportHe,
      transferMin: r.transferMin,
      transferKm: r.transferKm,
      transferHe: formatDurationHours(r.transferMin),
      pistesKm: r.pistesKm,
      baseM: r.baseM,
      villageM: r.villageM,
      topM: r.topM,
      verdictHe: r.verdictHe,
      liftPassLink: r.liftPassLink,
      schoolLink: r.schoolLink,
      hotelsLink: buildGoogleHotelsUrl(r.hotelsQuery, raw.dates.aptIn, raw.dates.aptOut),
      bookingSearchUrl: buildBookingSearchUrl(
        r.searchQuery,
        raw.dates.aptIn,
        raw.dates.aptOut,
        peopleCount
      ),
      airbnbSearchUrl: buildAirbnbSearchUrl(
        r.searchQuery,
        raw.dates.aptIn,
        raw.dates.aptOut,
        peopleCount
      ),
      arriveHe: minutesToClock(arriveMins),
      leaveByHe: isDecided && tbRaw ? decidedLeaveClock : minutesToClock(leaveMins, 15, true),
      lastSkiHe: isDecided && tbRaw ? decidedLastSkiClock : minutesToClock(leaveMins - 90, 15, true),
      fridaySkiPossible: arriveMins + 90 <= 14 * 60,
      stays: staysVM,
      rentals: (r.rentals ?? []).map((v) => ({
        name: v.name,
        pick: Boolean(v.pick),
        whereHe: interp(v.whereHe),
        whatHe: interp(v.whatHe),
        url: v.url,
      })),
      schools: (r.schools ?? []).map((v) => ({
        name: v.name,
        pick: Boolean(v.pick),
        whereHe: interp(v.whereHe),
        whatHe: interp(v.whatHe),
        url: v.url,
      })),
      firstNightOptions: firstNightOptsVM,
      transferOptions: transferOptsVM,
      pickTransfer,
      carOption,
      comparisonLines,
      passesEur: resortPassesEur,
      passesInsuranceEur: r.cost.passes.insuranceEur,
      passesInsuranceText: formatEur(r.cost.passes.insuranceEur),
      gearEur: r.cost.gear.eur,
      lessonsEur,
      lessonsText: formatEur(lessonsEur),
      lessonsUnitEur: r.lessons.unitEur,
      lessonsUnitText: formatEur(r.lessons.unitEur),
      lessonsWhatHe: interp(r.lessons.whatHe),
      lessonsAltHe: r.lessons.altHe ? interp(r.lessons.altHe) : undefined,
      lessonsSrc: r.lessons.src,
      lessonsSrcHe: r.lessons.srcHe,
      foodPerDayEur: r.food.perDayEur,
      foodPerDayText: formatEur(r.food.perDayEur),
      foodWeekEur,
      foodWeekText: formatEur(foodWeekEur),
      foodPerPersonPerDayText: formatEur(Math.round(r.food.perDayEur / peopleCount)),
      foodBreakdownHe: interp(r.food.breakdownHe),
      foodSrc: r.food.src,
      foodSrcHe: r.food.srcHe,
      packageEur,
      packageText: formatEur(packageEur),
      packageRangeText: `${formatEur(packageEur + loDelta)}–${(packageEur + hiDelta).toLocaleString(
        'en-US'
      )}`,
      totalEur,
      totalText: formatEur(totalEur),
      totalRangeText: `${formatEur(totalEur + loDelta)}–${(totalEur + hiDelta).toLocaleString(
        'en-US'
      )}`,
      totalIlsText: formatIls(totalEur * eurRate),
      perPersonText: formatEur(Math.round(totalEur / peopleCount)),
      priceRank: 0,
      vsCheapestEur: 0,
      vsCheapestText: formatEur(0),
      barPct: 100,
      fitPoints,
      fitMax,
      fitPct,
      fitRank: 0,
      flags: raw.flags
        .filter((f) => f.resort === r.id)
        .map((f) => ({ kind: f.kind, textHe: interp(f.textHe) })),
    };
  });

  const byPrice = [...resortsVM].sort((a, b) => a.totalEur - b.totalEur);
  const cheapest = byPrice[0]!;
  const dearest = byPrice[byPrice.length - 1]!;
  byPrice.forEach((r, idx) => {
    r.priceRank = idx + 1;
    r.vsCheapestEur = r.totalEur - cheapest.totalEur;
    r.vsCheapestText = formatEur(r.vsCheapestEur);
    r.barPct = Math.round((100 * r.totalEur) / dearest.totalEur);
  });

  const byFit = [...resortsVM].sort((a, b) => b.fitPoints - a.fitPoints);
  byFit.forEach((r, idx) => {
    r.fitRank = idx + 1;
  });

  const resortsById = Object.fromEntries(resortsVM.map((r) => [r.id, r]));
  const decided = resortsById[raw.decidedResortId]!;
  const alternatives = byFit.filter((r) => r.id !== decided.id);

  // Win / lose line comparison
  const compMetricDefs: Array<{ labelHe: string; getVal: (r: DerivedResortVM) => number }> = [
    {
      labelHe: 'מלון הלילה הראשון',
      getVal: (r) => r.comparisonLines.find((l) => l.key === 'firstNight')!.eur,
    },
    { labelHe: 'הסעות', getVal: (r) => r.pickTransfer.eurReturn },
    { labelHe: 'סקי-פס', getVal: (r) => r.passesEur },
    { labelHe: 'ציוד', getVal: (r) => r.gearEur },
    { labelHe: 'הדרכות', getVal: (r) => r.lessonsEur },
    { labelHe: 'אוכל', getVal: (r) => r.foodWeekEur },
  ];
  const winLoseByResort = byFit.map((r) => {
    const wins: string[] = [];
    const loses: string[] = [];
    for (const m of compMetricDefs) {
      const vals = resortsVM.map(m.getVal);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      if (minV === maxV) continue;
      const cur = m.getVal(r);
      if (cur === minV) wins.push(m.labelHe);
      else if (cur === maxV) loses.push(m.labelHe);
    }
    return {
      nameHe: r.nameHe,
      winHe: wins.length > 0 ? `הזול ב${wins.join(', ')}` : 'לא הזול באף שורה',
      loseHe: loses.length > 0 ? `היקר ב${loses.join(', ')}` : 'לא היקר באף שורה',
    };
  });

  const gapEur = dearest.totalEur - cheapest.totalEur;
  const gapPct = Math.round((100 * gapEur) / cheapest.totalEur);
  const winner = byFit[0]!;
  const spread = {
    cheapestHe: cheapest.nameHe,
    cheapestText: cheapest.totalText,
    dearestHe: dearest.nameHe,
    dearestText: dearest.totalText,
    gapEur,
    gapText: formatEur(gapEur),
    gapPct,
    gapVerdictHe:
      gapPct < 10
        ? `לשבוע של חמישה זה פער קטן (${gapPct}%), ולכן ההחלטה היא עניינית`
        : `פער של ${gapPct}% — המחיר הוא שיקול לצד ההתאמה`,
    introHe: `כשהדירה מתומחרת זהה בכל האתרים, ההפרש הוא ${formatEur(gapEur)} בין הזול ליקר מהשלושה`,
    pullHe:
      winner.id === cheapest.id
        ? 'והאתר שמתאים לכם ביותר הוא גם הזול בהשוואה — כך שהמחיר לא מושך לכיוון אחר'
        : `והאתר שמתאים לכם ביותר יקר מהזול ב-${winner.vsCheapestText}`,
    winLoseByResort,
  };

  // Canonical Live Budget & 4-Stage Cashflow
  const makeBudgetLine = (spec: {
    key: string;
    labelHe: string;
    eur: number;
    conf: 'quoted' | 'modelled';
    stage: CashflowStageKey;
    paidEur?: number;
    bookedPendingEur?: number;
    toBookOnlineEur?: number;
    onSiteEur?: number;
    statusHe: string;
    whatHe: string;
    srcUrl?: string;
    srcLabelHe?: string;
    isBooked: boolean;
  }): BudgetLineVM => ({
    key: spec.key,
    labelHe: spec.labelHe,
    eur: spec.eur,
    eurText: formatEur(spec.eur),
    ils: Math.round(spec.eur * eurRate),
    ilsText: formatIls(spec.eur * eurRate),
    conf: spec.conf,
    stage: spec.stage,
    paidEur: spec.paidEur ?? 0,
    bookedPendingEur: spec.bookedPendingEur ?? 0,
    toBookOnlineEur: spec.toBookOnlineEur ?? 0,
    onSiteEur: spec.onSiteEur ?? 0,
    statusHe: spec.statusHe,
    whatHe: spec.whatHe,
    srcUrl: spec.srcUrl,
    srcLabelHe: spec.srcLabelHe,
    isBooked: spec.isBooked,
  });

  const budgetLines: BudgetLineVM[] = [
    makeBudgetLine({
      key: 'lodging',
      labelHe: `דירה · ${aptNights} לילות`,
      eur: raw.apartment.eurTotal,
      conf: 'quoted',
      stage: aptBalanceEur > 0 ? 'bookedPending' : 'paid',
      paidEur: raw.apartment.eurPaid,
      bookedPendingEur: aptBalanceEur,
      statusHe:
        aptBalanceEur > 0
          ? `שולם ${formatEur(raw.apartment.eurPaid)} · יתרה ${formatEur(aptBalanceEur)}`
          : 'שולם במלואו',
      whatHe: `${raw.apartment.name} · ${raw.apartment.bookedViaHe}`,
      srcUrl: raw.apartment.url,
      srcLabelHe: 'Appartamenti Calanda',
      isBooked: true,
    }),
    makeBudgetLine({
      key: 'tax',
      labelHe: 'מס עירוני (דירה)',
      eur: raw.apartment.taxEur,
      conf: raw.apartment.confTax,
      stage: 'onSite',
      onSiteEur: raw.apartment.taxEur,
      statusHe: 'משלמים במקום',
      whatHe: 'imposta di soggiorno — אומדן לתשלום בדירה בסיום השהות',
      isBooked: false,
    }),
  ];

  if (fnRaw) {
    const fnBookingPending = Math.max(0, fnRaw.eurBooking - fnRaw.eurPaid);
    budgetLines.push(
      makeBudgetLine({
        key: 'firstNight',
        labelHe: `הלילה הראשון · ${fnRaw.name}`,
        eur: fnTotalEur,
        conf: 'quoted',
        stage: fnBookingPending > 0 ? 'bookedPending' : 'paid',
        paidEur: fnRaw.eurPaid,
        bookedPendingEur: fnBookingPending,
        onSiteEur: fnRaw.eurThereTax,
        statusHe:
          fnBookingPending > 0
            ? `הוזמן · ${formatEur(fnBookingPending)} יחויבו ב-Booking · ${formatEur(fnRaw.eurThereTax)} במקום`
            : `שולם ב-Booking · ${formatEur(fnRaw.eurThereTax)} מס במקום`,
        whatHe: `${fnRaw.unitHe.split(' · ')[0]}, ${fnRaw.whereHe} · ביטול חינם עד ${formatDmy(
          fnRaw.freeCancelUntil
        )}`,
        srcUrl: buildGoogleMapsSearchUrl(fnRaw.mapQuery),
        srcLabelHe: 'מיקום במפה',
        isBooked: true,
      })
    );
  } else {
    const fallbackFn = decided.firstNightOptions.find((x) => x.pick) ?? decided.firstNightOptions[0]!;
    const fnCost = decidedRaw.cost.firstNight.eur;
    budgetLines.push(
      makeBudgetLine({
        key: 'firstNight',
        labelHe: 'מלון · הלילה הראשון',
        eur: fnCost,
        conf: decidedRaw.cost.firstNight.conf,
        stage: 'toBookOnline',
        toBookOnlineEur: fnCost,
        statusHe: 'להזמין',
        whatHe: interp(decidedRaw.cost.firstNight.whatHe),
        srcUrl: fallbackFn.bookingDatedUrl ?? fallbackFn.url,
        srcLabelHe: 'Booking',
        isBooked: false,
      })
    );
  }

  if (tbRaw) {
    const tbPending = Math.max(0, tbRaw.eurReturn - tbRaw.eurPaid);
    budgetLines.push(
      makeBudgetLine({
        key: 'transfers',
        labelHe: `הסעות · ${tbRaw.provider}`,
        eur: tbRaw.eurReturn,
        conf: 'quoted',
        stage: tbPending > 0 ? 'bookedPending' : 'paid',
        paidEur: tbRaw.eurPaid,
        bookedPendingEur: tbPending,
        statusHe:
          tbPending > 0
            ? `הוזמן · תשלום ישיר לנהג (${formatEur(tbRaw.eurWay)} לכיוון במזומן/אשראי)`
            : 'שולם במלואו',
        whatHe: `${tbRaw.vehicleHe} · ${formatEur(tbRaw.eurWay)} לכיוון ל-${peopleCount} (${formatEur(
          tbRaw.eurWayFor4
        )} ל-4) · ביטול חינם`,
        srcUrl: tbRaw.url,
        srcLabelHe: tbRaw.provider,
        isBooked: true,
      })
    );
  } else {
    budgetLines.push(
      makeBudgetLine({
        key: 'transfers',
        labelHe: 'הסעות · הלוך וחזור',
        eur: decided.pickTransfer.eurReturn,
        conf: decided.pickTransfer.conf,
        stage: 'toBookOnline',
        toBookOnlineEur: decided.pickTransfer.eurReturn,
        statusHe: 'להזמין מראש',
        whatHe: `${decided.pickTransfer.name} · ${decided.pickTransfer.whatHe}`,
        srcUrl: decided.pickTransfer.url,
        srcLabelHe: decided.pickTransfer.name.split(' — ')[0],
        isBooked: false,
      })
    );
  }

  budgetLines.push(
    makeBudgetLine({
      key: 'passes',
      labelHe: `סקי-פס · ${skiDays} ימים (${skiersCount} גולשים)`,
      eur: decided.passesEur,
      conf: decidedRaw.cost.passes.conf,
      stage: 'toBookOnline',
      toBookOnlineEur: decided.passesEur,
      statusHe: 'לקנות אונליין',
      whatHe: interp(decidedRaw.cost.passes.whatHe),
      srcUrl: decidedRaw.cost.passes.src,
      srcLabelHe: decidedRaw.cost.passes.srcHe,
      isBooked: false,
    }),
    makeBudgetLine({
      key: 'gear',
      labelHe: `ציוד · ${skiersCount} סטים`,
      eur: decided.gearEur,
      conf: decidedRaw.cost.gear.conf,
      stage: 'toBookOnline',
      toBookOnlineEur: decided.gearEur,
      statusHe: 'להזמין אונליין',
      whatHe: interp(decidedRaw.cost.gear.whatHe),
      srcUrl: decidedRaw.cost.gear.src,
      srcLabelHe: decidedRaw.cost.gear.srcHe,
      isBooked: false,
    }),
    makeBudgetLine({
      key: 'lessons',
      labelHe: `בית ספר · ${beginnersCount} מתחילות`,
      eur: decided.lessonsEur,
      conf: decidedRaw.lessons.conf,
      stage: 'toBookOnline',
      toBookOnlineEur: decided.lessonsEur,
      statusHe: 'להירשם מראש',
      whatHe: decided.lessonsWhatHe,
      srcUrl: decided.lessonsSrc,
      srcLabelHe: decided.lessonsSrcHe,
      isBooked: false,
    }),
    makeBudgetLine({
      key: 'food',
      labelHe: `אוכל · ${foodDays} ימים`,
      eur: decided.foodWeekEur,
      conf: decidedRaw.food.conf,
      stage: 'onSite',
      onSiteEur: decided.foodWeekEur,
      statusHe: 'הוצאה שוטפת במקום',
      whatHe: decided.foodBreakdownHe,
      srcUrl: decided.foodSrc,
      srcLabelHe: decided.foodSrcHe,
      isBooked: false,
    })
  );

  const budgetTotalEur = budgetLines.reduce((acc, l) => acc + l.eur, 0);
  const stagePaidEur = budgetLines.reduce((acc, l) => acc + l.paidEur, 0);
  const stageBookedPendingEur = budgetLines.reduce((acc, l) => acc + l.bookedPendingEur, 0);
  const stageToBookOnlineEur = budgetLines.reduce((acc, l) => acc + l.toBookOnlineEur, 0);
  const stageOnSiteEur = budgetLines.reduce((acc, l) => acc + l.onSiteEur, 0);

  const makeStage = (
    key: CashflowStageKey,
    labelHe: string,
    subHe: string,
    eur: number
  ): CashflowStageVM => ({
    key,
    labelHe,
    subHe,
    eur,
    eurText: formatEur(eur),
    ilsText: formatIls(eur * eurRate),
    pct: budgetTotalEur > 0 ? Math.round((100 * eur) / budgetTotalEur) : 0,
  });

  const cashflowStages: CashflowStageVM[] = [
    makeStage('paid', 'שולם כבר', 'מקדמת Calanda בכרטיס אשראי (ללא הטיסות)', stagePaidEur),
    makeStage(
      'bookedPending',
      'הוזמן — יתרה לתשלום',
      tbRaw
        ? `יתרת Calanda + Casa Noemi (Booking) + הסעת ${tbRaw.provider} ישירות לנהג`
        : 'יתרת Calanda + חיוב אוטומטי ב-Booking ל-Casa Noemi',
      stageBookedPendingEur
    ),
    makeStage(
      'toBookOnline',
      'להזמין מראש אונליין',
      tbRaw
        ? 'סקי-פס, קורס מתחילות והשכרת ציוד'
        : 'הסעה, סקי-פס, קורס מתחילות והשכרת ציוד',
      stageToBookOnlineEur
    ),
    makeStage('onSite', 'הוצאה שוטפת במקום', 'אוכל במסעדות/סופר ומסי תיירות בעיירה', stageOnSiteEur),
  ];

  const vsCompDiff = decided.totalEur - budgetTotalEur;
  const vsComparisonHe =
    vsCompDiff > 0
      ? `נמוך ב-${formatEur(vsCompDiff)} מאומדן ההשוואה שלפיו בחרנו`
      : vsCompDiff < 0
        ? `גבוה ב-${formatEur(-vsCompDiff)} מאומדן ההשוואה שלפיו בחרנו`
        : 'בדיוק כמו אומדן ההשוואה שלפיו בחרנו';

  // Friday options comparison stats
  const pricedFri = decided.firstNightOptions.filter((h) => h.eur !== undefined);
  const friPrices = pricedFri.map((h) => h.eur!);
  const cheaperFri = fnRaw ? pricedFri.filter((h) => h.eur! < fnTotalEur) : [];
  const cheaperPrices = cheaperFri.map((h) => h.eur!);
  const cheaperMins = cheaperFri.map((h) => h.toLivignoMin ?? 0);

  const fridayComparison = {
    checkedDateText: formatDmy(decidedRaw.firstNightChecked ?? raw.meta.lastDataReview),
    count: pricedFri.length,
    minText: formatEur(Math.min(...friPrices)),
    maxText: formatEur(Math.max(...friPrices)),
    cheaperRangeText:
      cheaperPrices.length > 0
        ? `${formatEur(Math.min(...cheaperPrices))}–${Math.max(...cheaperPrices).toLocaleString('en-US')}`
        : formatEur(0),
    cheaperMinutesHe:
      cheaperMins.length > 0
        ? `${Math.min(...cheaperMins)}–${Math.max(...cheaperMins)} דקות`
        : '—',
  };

  // Simulator VM
  const gearPlusSchoolSeparateEur = decided.gearEur + decided.lessonsEur;
  const gearPlusSchoolCentraleBundleEur =
    beginnersCount * raw.simulator.centraleCourseAndGearPerBeginnerEur +
    raw.simulator.reuvenStandaloneGoldGearEur;
  const sharedTransferOpt = decided.transferOptions.find((o) => o.isShared);
  const activePrivateTransferEur = tbRaw ? tbRaw.eurReturn : decided.pickTransfer.eurReturn;

  const simulator = {
    canonicalTotalEur: budgetTotalEur,
    transferPrivateEur: activePrivateTransferEur,
    transferCarEur: decided.carOption.eurReturn,
    transferSharedEur: sharedTransferOpt?.eurReturn ?? activePrivateTransferEur,
    gearPlusSchoolSeparateEur,
    gearPlusSchoolCentraleBundleEur,
    centraleBundleSavingsEur: gearPlusSchoolSeparateEur - gearPlusSchoolCentraleBundleEur,
    centraleBundlePerBeginnerText: formatEur(
      raw.simulator.centraleCourseAndGearPerBeginnerEur
    ),
    insuranceFamilyEur: peopleCount * raw.simulator.travelSkiInsurancePerPersonEur,
    insurancePerPersonText: formatEur(raw.simulator.travelSkiInsurancePerPersonEur),
    lastSatSkiTotalEur: skiersCount * raw.simulator.lastSaturdayMorningPerSkierEur,
    lastSatSkiPerSkierText: formatEur(raw.simulator.lastSaturdayMorningPerSkierEur),
  };

  // Open items (sorted by urgency -> deadline)
  const urgencyRank: Record<string, number> = { red: 0, amber: 1, yellow: 2 };
  const openItemsVM: OpenItemVM[] = [...raw.openItems]
    .sort((a, b) => {
      const u = (urgencyRank[a.urgency] ?? 9) - (urgencyRank[b.urgency] ?? 9);
      if (u !== 0) return u;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    })
    .map((item) => ({
      ...item,
      titleHe: interp(item.titleHe),
      whatHe: interp(item.whatHe),
      deadlineDm: item.deadline ? formatDm(item.deadline) : undefined,
      deadlineShortHe: item.deadline ? `עד ${formatDowFullDm(item.deadline)}` : undefined,
    }));

  // Trail Signs (synchronized with openItem IDs so ticking tasks updates live status!)
  const signs: TrailSignVM[] = [
    {
      id: 'flights',
      labelHe: `טיסות · ${totalTickets} כרטיסים`,
      statusHe: 'סגור',
      done: true,
      href: '#trip',
      linkedTaskIds: [],
    },
    {
      id: 'apartment',
      labelHe: 'הדירה · Calanda SOLE',
      statusHe: 'סגור',
      done: true,
      href: '#stay',
      linkedTaskIds: [],
    },
    fnRaw
      ? {
          id: 'first-night',
          labelHe: `הלילה הראשון · ${fnRaw.name}`,
          statusHe: 'סגור',
          done: true,
          href: '#friday',
          linkedTaskIds: [],
        }
      : {
          id: 'first-night',
          labelHe: 'הלילה הראשון',
          statusHe: 'להזמין',
          done: false,
          href: '#friday-alts',
          linkedTaskIds: ['friday-cheaper'],
        },
    tbRaw
      ? {
          id: 'transfer',
          labelHe: `הסעה · ${tbRaw.provider}`,
          statusHe: 'סגור',
          done: true,
          href: '#getting',
          linkedTaskIds: [],
        }
      : {
          id: 'transfer',
          labelHe: 'הסעה ממלפנסה',
          statusHe: 'להזמין',
          done: false,
          href: '#getting',
          linkedTaskIds: ['transfer-book'],
        },
    {
      id: 'passes',
      labelHe: `סקי-פס · ${skiDays} ימים`,
      statusHe: 'לקנות',
      done: false,
      href: '#passes',
      linkedTaskIds: ['pass-age-bands', 'pass-presale', 'piste-insurance'],
    },
    {
      id: 'school',
      labelHe: `בית ספר · ${beginnersCount} מתחילות`,
      statusHe: 'להירשם',
      done: false,
      href: '#school',
      linkedTaskIds: ['ski-school-book'],
    },
    {
      id: 'gear',
      labelHe: `ציוד · ${skiersCount} סטים`,
      statusHe: 'להזמין',
      done: false,
      href: '#school',
      linkedTaskIds: ['gear-quote'],
    },
  ];

  const openSignNames = signs
    .filter((s) => !s.done)
    .map((s) => s.labelHe.split(' · ')[0]!);
  const doneIntroHe =
    fnRaw && tbRaw
      ? 'הטיסות, הדירה, הלילה הראשון וההסעה סגורים'
      : fnRaw
        ? 'הטיסות, הדירה והלילה הראשון סגורים'
        : 'הטיסות והדירה סגורות';
  const leftJoinedHe =
    openSignNames.length > 1
      ? `${openSignNames.slice(0, -1).join(', ')} ו${openSignNames[openSignNames.length - 1]}`
      : (openSignNames[0] ?? '');
  const heroLedeHe = `${doneIntroHe}. נשאר להזמין ${leftJoinedHe} — ו-${decided.pistesKm} ק״מ של פיסטות מחכים בעמק.`;

  // Ready-to-send Host Messages (English & Italian — all dates derived from TripData)
  const aptInParsed = parseIsoDate(raw.dates.aptIn);
  const startParsed = parseIsoDate(raw.dates.start);
  const aptInEnShort = `${aptInParsed.day} ${EN_MONTHS[aptInParsed.month - 1]}`;
  const aptInItShort = `${String(aptInParsed.day).padStart(2, '0')}/${String(
    aptInParsed.month
  ).padStart(2, '0')}`;
  const startEnMonthYear = `${startParsed.day} ${EN_MONTHS[startParsed.month - 1]} ${startParsed.year}`;
  const adultsCount = peopleCount - 1;

  const calandaBodyEn = [
    `Hello ${raw.apartment.hostName},`,
    `Thank you again for confirming our reservation for Apartment SOLE (${formatSpanEn(
      raw.dates.aptIn,
      raw.dates.aptOut
    )}, ${adultsCount} adults + 1 girl aged ${raw.party.juniorMaxAge} — Reuven Sayag).`,
    `To help us plan our arrival smoothly, could you kindly clarify:`,
    `1. Balance payment (${formatEur(aptBalanceEur)}) + tourist tax: when is it due and which payment method do you prefer (card / bank transfer / cash on arrival)?`,
    `2. Check-in on Saturday ${aptInEnShort}: what is the earliest check-in time, and since we are already sleeping in Livigno on Friday night, could we drop off our suitcases around 09:45 on Saturday morning before going skiing?`,
    `3. Are bed linen, towels for ${peopleCount} guests, and final cleaning all included?`,
    `Thank you very much!`,
    `Reuven Sayag`,
  ].join('\n');

  const calandaBodyIt = [
    `Gentile ${raw.apartment.hostName},`,
    `Grazie ancora per la conferma dell'appartamento SOLE (${formatDm(raw.dates.aptIn)}–${formatDmy(
      raw.dates.aptOut
    )}, ${adultsCount} adulti + 1 ragazza di ${raw.party.juniorMaxAge} anni — Reuven Sayag).`,
    `Per organizzare al meglio il nostro arrivo, potresti gentilmente confermarci:`,
    `1. Saldo (${formatEur(aptBalanceEur)}) e tassa di soggiorno: quando va versato e quale metodo di pagamento preferisci?`,
    `2. Check-in sabato ${aptInItShort}: da che ora è disponibile l'appartamento? Dormendo già a Livigno venerdì notte, sarebbe possibile lasciare le valigie sabato mattina verso le 09:45 prima di andare a sciare?`,
    `3. Biancheria da letto, asciugamani per ${peopleCount} persone e pulizie finali sono inclusi?`,
    `Grazie mille e a presto,`,
    `Reuven Sayag`,
  ].join('\n');

  const hostMessages: HostMessageTemplateVM[] = [
    {
      id: 'msg-calanda',
      recipientTitleHe: `הודעה מוכנה ל-${raw.apartment.hostName} (Appartamenti Calanda)`,
      channelHe: `WhatsApp / אימייל (${raw.apartment.phone})`,
      whatsappUrl: buildWhatsAppUrl(raw.apartment.whatsappDigits, calandaBodyEn),
      bookingHelperHe: 'כולל את כל השאלות הפתוחות ממשימה #1 (יתרה, שמירת מזוודות בשבת בבוקר ומצעים/ניקיון)',
      subjectEn: `Reservation Apartment SOLE (${formatSpanEn(raw.dates.aptIn, raw.dates.aptOut)}) — Reuven Sayag`,
      bodyEn: calandaBodyEn,
      bodyIt: calandaBodyIt,
    },
  ];

  if (fnRaw) {
    const noemiEn = [
      `Hello ${fnRaw.name},`,
      `We have a confirmed reservation for Friday ${formatDm(raw.dates.start)} – Saturday ${formatDmy(
        raw.dates.aptIn
      )} (${peopleCount} guests — Reuven Sayag).`,
      `We land at Milan Malpensa at ${outLegRaw.arr} and expect to arrive in Livigno by private transfer around ${decidedArriveClock}.`,
      `1. Would an early check-in or luggage drop-off around ${decidedArriveClock} (before ${fnRaw.checkIn}) be possible?`,
      `2. How and where do we collect the keys, and are bed linen and towels for ${peopleCount} included?`,
      `Thank you!`,
      `Reuven Sayag`,
    ].join('\n');

    const noemiIt = [
      `Buongiorno ${fnRaw.name},`,
      `Abbiamo una prenotazione confermata per venerdì ${formatDm(raw.dates.start)} – sabato ${formatDmy(
        raw.dates.aptIn
      )} (${peopleCount} ospiti — Reuven Sayag).`,
      `Atterriamo a Milano Malpensa alle ${outLegRaw.arr} e prevediamo di arrivare a Livigno verso le ${decidedArriveClock}.`,
      `1. Sarebbe possibile effettuare il check-in anticipato o lasciare i bagagli verso le ${decidedArriveClock} (prima delle ${fnRaw.checkIn})?`,
      `2. Come funziona il ritiro delle chiavi, e biancheria e asciugamani per ${peopleCount} sono inclusi?`,
      `Grazie mille,`,
      `Reuven Sayag`,
    ].join('\n');

    hostMessages.push({
      id: 'msg-noemi',
      recipientTitleHe: `הודעה מוכנה ל-${fnRaw.name} (הלילה הראשון ב-Booking)`,
      channelHe: 'תיבת ההודעות של Booking.com',
      bookingHelperHe: `מכסה הגעה משוערת ב-${decidedArriveClock} (לפני ${fnRaw.checkIn}), איסוף מפתחות ומצעים`,
      subjectEn: `Arrival question — ${fnRaw.name} (${startEnMonthYear})`,
      bodyEn: noemiEn,
      bodyIt: noemiIt,
    });
  }

  if (tbRaw) {
    const endParsed = parseIsoDate(raw.dates.end);
    const endEnShort = `${endParsed.day} ${EN_MONTHS[endParsed.month - 1]} ${endParsed.year}`;
    const taxiEn = [
      `Hi ${tbRaw.contactName},`,
      `Following up with our flight and address details for our confirmed transfers (Reuven Sayag):`,
      `- Arrival: Friday ${startEnMonthYear}, El Al flight ${outLegRaw.flight} landing at Milan Malpensa Terminal 1 at ${outLegRaw.arr}.`,
      `- Drop-off in Livigno: ${fnRaw ? `${fnRaw.name}, ${fnRaw.address}` : raw.apartment.address}.`,
      `- Return pickup: Saturday ${endEnShort} at ${tbRaw.returnPickupClock} from ${raw.apartment.name} (${raw.apartment.address}) to Milan Malpensa Terminal 1 (flight ${backLegRaw.flight} at ${backLegRaw.dep}).`,
      `I will update you a few weeks before the trip whether we are 4 or 5 passengers.`,
      `Thank you!`,
      `Reuven Sayag`,
    ].join('\n');

    const taxiIt = [
      `Buongiorno ${tbRaw.contactName},`,
      `Ecco i dettagli del volo e degli indirizzi per i nostri transfer confermati (Reuven Sayag):`,
      `- Arrivo: venerdì ${formatDmy(raw.dates.start)}, volo El Al ${outLegRaw.flight} in arrivo a Milano Malpensa Terminal 1 alle ${outLegRaw.arr}.`,
      `- Destinazione a Livigno: ${fnRaw ? `${fnRaw.name}, ${fnRaw.address}` : raw.apartment.address}.`,
      `- Ritorno: sabato ${formatDmy(raw.dates.end)} alle ${tbRaw.returnPickupClock} da ${raw.apartment.name} (${raw.apartment.address}) a Milano Malpensa Terminal 1 (volo ${backLegRaw.flight} alle ${backLegRaw.dep}).`,
      `Ti confermerò qualche settimana prima se saremo 4 o 5 passeggeri.`,
      `Grazie mille,`,
      `Reuven Sayag`,
    ].join('\n');

    hostMessages.push({
      id: 'msg-taxi',
      recipientTitleHe: `הודעת המשך ל-${tbRaw.contactName} (${tbRaw.provider})`,
      channelHe: `אימייל (${tbRaw.email})`,
      bookingHelperHe: `שליחת מספר טיסה ${outLegRaw.flight}, כתובת הורדה (${fnRaw?.name ?? 'ליביניו'}) וכתובת איסוף חזור (Calanda ב-${tbRaw.returnPickupClock})`,
      subjectEn: `Flight ${outLegRaw.flight} & Livigno addresses — Transfer ${startEnMonthYear} (Reuven Sayag)`,
      bodyEn: taxiEn,
      bodyIt: taxiIt,
    });
  }

  // Timeline
  const timeline = buildSkiTimeline(raw, {
    arriveLivignoClock: decidedArriveClock,
    leaveLivignoClock: decidedLeaveClock,
    outAirportByClock: outAirportBy,
    backAirportByClock: backAirportBy,
    calandaBalanceEur: aptBalanceEur,
    firstNightTotalEur: fnTotalEur,
    skiDays,
    courseDays,
    transferDurationHe: decided.transferHe,
  });

  const perPersonExactEur = budgetTotalEur / peopleCount;

  return {
    meta: raw.meta,
    rates: {
      eurIls: eurRate,
      eurIlsDisplay: eurRate.toFixed(2),
      eurUsd: rates.eur_usd,
      usdIls: rates.usd_ils,
      checkedIso: rates.checked,
      checkedDm: formatDm(rates.checked),
      source: rates.source,
    },
    dates: {
      startIso: raw.dates.start,
      endIso: raw.dates.end,
      homeLandingIso: raw.dates.homeLanding,
      aptInIso: raw.dates.aptIn,
      aptOutIso: raw.dates.aptOut,
      courseStartIso: raw.dates.courseStart,
      courseEndIso: raw.dates.courseEnd,
      startDm: formatDm(raw.dates.start),
      endDm: formatDm(raw.dates.end),
      homeLandingDm: formatDm(raw.dates.homeLanding),
      aptInDm: formatDm(raw.dates.aptIn),
      aptOutDm: formatDm(raw.dates.aptOut),
      courseStartDm: formatDm(raw.dates.courseStart),
      courseEndDm: formatDm(raw.dates.courseEnd),
      startDow: formatDowFull(raw.dates.start),
      endDow: formatDowFull(raw.dates.end),
      aptInDow: formatDowFull(raw.dates.aptIn),
      homeLandingDow: formatDowFull(raw.dates.homeLanding),
      startLongHe: formatDowFullDm(raw.dates.start),
      endLongHe: formatDowFullDm(raw.dates.end),
      aptInLongHe: formatDowFullDm(raw.dates.aptIn),
      courseEndLongHe: formatDowFullDm(raw.dates.courseEnd),
      windowHe: formatSpanWindowHe(raw.dates.start, raw.dates.end),
      spanDmYear: `${formatDm(raw.dates.start)} – ${formatDmy(raw.dates.end)}`,
      spanEn: formatSpanEn(raw.dates.start, raw.dates.end),
      aptSpanHe: formatSpanDm(raw.dates.aptIn, raw.dates.aptOut),
      courseSpanHe: `ראשון–שישי, ${formatSpanDm(raw.dates.courseStart, raw.dates.courseEnd)}`,
      courseHoursText: `${raw.dates.courseHours.start}–${raw.dates.courseHours.end}`,
      nights,
      aptNights,
      skiDays,
      courseDays,
      foodDays,
      nightsSplitHe: `לילה אחד + ${aptNights} לילות בדירה`,
      airportExitMin: raw.dates.airportExitMin,
      airportBeforeMin: raw.dates.airportBeforeMin,
      roadBufferMin: raw.dates.roadBufferMin,
      departureEpochMs,
    },
    party: {
      peopleCount,
      peopleHe: heCountMasc(peopleCount),
      skiersCount,
      beginnersCount,
      advancedCount,
      nonSkiersCount,
      juniorMaxAge: raw.party.juniorMaxAge,
      bandsSummaryHe: raw.party.bandsSummaryHe,
      members: membersVM,
    },
    oritGuide: raw.oritGuide.map((g) => ({
      titleHe: interp(g.titleHe),
      whenHe: interp(g.whenHe),
      detailHe: interp(g.detailHe),
      mapUrl: buildGoogleMapsSearchUrl(g.mapQuery),
      url: g.url,
    })),
    flights: {
      out: {
        ...outLegRaw,
        dateDm: formatDm(outLegRaw.date),
        dateLongHe: formatDowFullDm(outLegRaw.date),
        airportByClock: outAirportBy,
        statusUrl: buildFlightAwareUrl(outLegRaw.flight),
      },
      back: {
        ...backLegRaw,
        dateDm: formatDm(backLegRaw.date),
        dateLongHe: formatDowFullDm(backLegRaw.date),
        arrDateLongHe: formatDowFullDm(backLegRaw.arrDate ?? backLegRaw.date),
        airportByClock: backAirportBy,
        statusUrl: buildFlightAwareUrl(backLegRaw.flight),
      },
      baggageHe: raw.flights.baggageHe,
      bookings: bookingsVM,
      bookingCount: bookingsVM.length,
      totalTickets,
      awardTicketsCount,
      pointsPerAwardTicket: raw.flights.pointsPerAwardTicket,
      pointsTotal,
      pointsTotalText: pointsTotal.toLocaleString('en-US'),
      usdTotal,
      usdTotalText: formatUsd(usdTotal),
    },
    apartment: {
      name: raw.apartment.name,
      unitHe: raw.apartment.unitHe,
      hostName: raw.apartment.hostName,
      hostHe: raw.apartment.hostHe,
      address: raw.apartment.address,
      phone: raw.apartment.phone,
      whatsappUrl: buildWhatsAppUrl(raw.apartment.whatsappDigits, calandaBodyEn),
      url: raw.apartment.url,
      bookingPage: raw.apartment.bookingPage,
      googleHotelsUrl: buildGoogleHotelsUrl(
        raw.apartment.hotelsQuery,
        raw.dates.aptIn,
        raw.dates.aptOut
      ),
      mapUrl: buildGoogleMapsSearchUrl(raw.apartment.mapQuery),
      bookedDm: formatDm(raw.apartment.bookedOn),
      bookedViaHe: raw.apartment.bookedViaHe,
      eurTotal: raw.apartment.eurTotal,
      totalText: formatEur(raw.apartment.eurTotal),
      eurPaid: raw.apartment.eurPaid,
      paidText: formatEur(raw.apartment.eurPaid),
      paidOnDm: formatDm(raw.apartment.paidOn),
      paidHowHe: raw.apartment.paidHowHe,
      paidPct: aptPaidPct,
      balanceEur: aptBalanceEur,
      balanceText: formatEur(aptBalanceEur),
      taxEur: raw.apartment.taxEur,
      taxText: formatEur(raw.apartment.taxEur),
      dueOnSiteOrBalanceEur: aptDueOnSiteOrBalanceEur,
      dueOnSiteOrBalanceText: formatEur(aptDueOnSiteOrBalanceEur),
      perNightText: formatEur(Math.round(raw.apartment.eurTotal / aptNights)),
      refundable: raw.apartment.refundable,
      refundHe: raw.apartment.refundable ? 'ניתן לביטול' : 'המקדמה אינה מוחזרת בביטול',
      besafeNoteHe: interp(raw.apartment.besafeNoteHe),
      checkInApprox: raw.apartment.checkInApprox,
      checkOutApprox: raw.apartment.checkOutApprox,
      factsHe: raw.apartment.factsHe.map(interp),
      askHe: raw.apartment.askHe.map(interp),
    },
    carRental: {
      nameHe: raw.carRental.nameHe,
      days: carDays,
      eurPerDayText: formatEur(raw.carRental.eurPerDay),
      coverPerDayText: formatEur(raw.carRental.coverEurPerDay),
      winterPerDayText: formatEur(raw.carRental.winterEurPerDay),
      baseText: formatEur(carBaseEur),
      freeCancelHe: interp(raw.carRental.freeCancelHe),
      watchHe: raw.carRental.watchHe.map(interp),
      url: raw.carRental.url,
      compareUrl: raw.carRental.compareUrl,
    },
    firstNight: fnRaw
      ? {
          name: fnRaw.name,
          unitHe: fnRaw.unitHe,
          unitShortHe: fnRaw.unitHe.split(' · ')[0]!,
          address: fnRaw.address,
          whereHe: fnRaw.whereHe,
          mapUrl: buildGoogleMapsSearchUrl(fnRaw.mapQuery),
          googleHotelsUrl: buildGoogleHotelsUrl(
            fnRaw.hotelsQuery,
            raw.dates.start,
            raw.dates.aptIn
          ),
          bookedDm: formatDm(fnRaw.bookedOn),
          bookedViaHe: fnRaw.bookedViaHe,
          eurBooking: fnRaw.eurBooking,
          bookingText: formatEur(fnRaw.eurBooking),
          cleaningText: formatEur(fnRaw.cleaningEur),
          eurThereTax: fnRaw.eurThereTax,
          thereTaxText: formatEur(fnRaw.eurThereTax),
          eurTotal: fnTotalEur,
          totalText: formatEur(fnTotalEur),
          eurPaid: fnRaw.eurPaid,
          checkIn: fnRaw.checkIn,
          checkInUntil: fnRaw.checkInUntil,
          checkOutFrom: fnRaw.checkOutFrom,
          checkOut: fnRaw.checkOut,
          freeCancelIso: fnRaw.freeCancelUntil,
          freeCancelDm: formatDmy(fnRaw.freeCancelUntil),
          cancelNextDm: formatDm(fnCancelNextIso),
          cancelFeeEur: fnRaw.cancelFeeEur,
          cancelFeeText: formatEur(fnRaw.cancelFeeEur),
          cancelSummaryHe: `ביטול חינם עד ${formatDmy(
            fnRaw.freeCancelUntil
          )} ב-23:59 (שעון איטליה); החל מ-${formatDm(fnCancelNextIso)} דמי ביטול ${formatEur(
            fnRaw.cancelFeeEur
          )}`,
          replacedName: fnRaw.replacedName,
          replacedText: formatEur(fnRaw.replacedEur),
          savedEur: fnSavedEur,
          savedText: formatEur(fnSavedEur),
          goodHe: [
            `חוסכת ${formatEur(fnSavedEur)} לעומת ההמלצה הקודמת (${fnRaw.replacedName}, ${formatEur(
              fnRaw.replacedEur
            )})`,
            ...fnRaw.goodHe.map(interp),
          ],
          askHe: fnRaw.askHe.map(interp),
        }
      : null,
    transferBooked: tbRaw
      ? {
          provider: tbRaw.provider,
          contactName: tbRaw.contactName,
          email: tbRaw.email,
          url: tbRaw.url,
          bookedOnIso: tbRaw.bookedOn,
          bookedDm: formatDm(tbRaw.bookedOn),
          bookedViaHe: interp(tbRaw.bookedViaHe),
          vehicleHe: interp(tbRaw.vehicleHe),
          luggageHe: interp(tbRaw.luggageHe),
          eurWayFor4: tbRaw.eurWayFor4,
          eurReturnFor4: tbRaw.eurWayFor4 * 2,
          wayFor4Text: formatEur(tbRaw.eurWayFor4),
          returnFor4Text: formatEur(tbRaw.eurWayFor4 * 2),
          extraPaxEurWay: tbRaw.extraPaxEurWay,
          extraPaxWayText: formatEur(tbRaw.extraPaxEurWay),
          eurWay: tbRaw.eurWay,
          eurReturn: tbRaw.eurReturn,
          eurPaid: tbRaw.eurPaid,
          wayText: formatEur(tbRaw.eurWay),
          returnText: formatEur(tbRaw.eurReturn),
          ilsText: formatIls(tbRaw.eurReturn * eurRate),
          savedVsPickEur: decided.pickTransfer.eurReturn - tbRaw.eurReturn,
          savedVsPickText: formatEur(decided.pickTransfer.eurReturn - tbRaw.eurReturn),
          payMethodHe: interp(tbRaw.payMethodHe),
          freeCancelHe: interp(tbRaw.freeCancelHe),
          outboundPickupHe: interp(tbRaw.outboundPickupHe),
          returnPickupClock: tbRaw.returnPickupClock,
          returnPickupNoteHe: interp(tbRaw.returnPickupNoteHe),
          meetingPointHe: interp(tbRaw.meetingPointHe),
          driverDetailsNoteHe: interp(tbRaw.driverDetailsNoteHe),
          pendingItemsHe: tbRaw.pendingItemsHe.map(interp),
        }
      : null,
    fridayComparison,
    resorts: resortsVM,
    resortsById,
    decided,
    alternatives,
    byPrice,
    byFit,
    spread,
    budget: {
      lines: budgetLines,
      stages: cashflowStages,
      totalEur: budgetTotalEur,
      totalText: formatEur(budgetTotalEur),
      totalIls: Math.round(budgetTotalEur * eurRate),
      totalIlsText: formatIls(budgetTotalEur * eurRate),
      paidEur: stagePaidEur,
      paidText: formatEur(stagePaidEur),
      leftEur: budgetTotalEur - stagePaidEur,
      leftText: formatEur(budgetTotalEur - stagePaidEur),
      perPersonExactEur,
      perPersonEur: Math.round(perPersonExactEur),
      perPersonText: formatEur(Math.round(perPersonExactEur)),
      perPersonIlsText: formatIls(perPersonExactEur * eurRate),
      vsComparisonDiffEur: vsCompDiff,
      vsComparisonHe,
      excludedHe: raw.excludedHe.map(interp),
    },
    simulator,
    villageMapPins: raw.villageMapPins.map((p) => ({
      ...p,
      mapUrl: buildGoogleMapsSearchUrl(p.mapQuery),
      forWhoNamesHe: p.forWho.map((id) => memberNameById.get(id) ?? id).join(' · '),
    })),
    hostMessages,
    signs,
    heroLedeHe,
    fit: {
      criteria: raw.fit.criteria,
      scores: raw.fit.scores,
      winnerHe: byFit[0]?.nameHe ?? '',
      winnerPct: byFit[0]?.fitPct ?? 0,
      runnerHe: byFit[1]?.nameHe ?? '',
      runnerPct: byFit[1]?.fitPct ?? 0,
      thirdHe: byFit[2]?.nameHe ?? '',
      thirdPct: byFit[2]?.fitPct ?? 0,
    },
    setAside: raw.setAside,
    sources: raw.sources,
    reconciled: raw.reconciled,
    counts: {
      setAside: raw.setAside.length,
      sourcesRead: raw.sources.filter((s) => s.status === 'read').length,
      reconciledTotal: raw.reconciled.length,
      reconciledMoved: raw.reconciled.filter((r) => r.moved).length,
      openTotal: openItemsVM.length,
      openRed: openItemsVM.filter((i) => i.urgency === 'red').length,
    },
    worldFacts: raw.worldFacts,
    openItems: openItemsVM,
    timeline,
    vaultAuth: {
      allowedEmails: raw.vaultAuth.allowedEmails.map((e) => e.trim().toLowerCase()),
      googleClientId: raw.vaultAuth.googleClientId ?? '',
      driveVaultFileId: raw.vaultAuth.driveVaultFileId ?? '',
    },
    liveMountain: raw.liveMountain,
    lunchMeetups: raw.lunchMeetups.map((m) => ({
      ...m,
      forSkierHe: interp(m.forSkierHe),
      forOritHe: interp(m.forOritHe),
      dishTipHe: interp(m.dishTipHe),
      mapUrl: buildGoogleMapsSearchUrl(m.mapQuery),
    })),
    culinaryAndShopping: raw.culinaryAndShopping.map((s) => ({
      ...s,
      vibeHe: interp(s.vibeHe),
      mustTryHe: interp(s.mustTryHe),
      bookingTipHe: interp(s.bookingTipHe),
      mapUrl: buildGoogleMapsSearchUrl(s.mapQuery),
      categoryLabelHe:
        s.category === 'mountain'
          ? 'צהריים בהר'
          : s.category === 'dinner'
            ? 'ערב בכפר'
            : s.category === 'apres'
              ? 'אפרה-סקי ומתוקים'
              : 'דיוטי-פרי וקניות',
    })),
    packingList: raw.packingList.map((p) => ({
      ...p,
      labelHe: interp(p.labelHe),
      noteHe: interp(p.noteHe),
      groupLabelHe:
        p.group === 'docs'
          ? 'מסמכים וביטוח'
          : p.group === 'ski_wear'
            ? 'ביגוד וציוד גלישה אישי'
            : p.group === 'orit_spa'
              ? 'ספא, בריכה והליכה בשלג'
              : 'משותף למזוודות וחשמל',
      forWhoNamesHe:
        p.forWho.length === peopleCount
          ? 'כל המשפחה'
          : p.forWho.map((id) => memberNameById.get(id) ?? id).join(' · '),
    })),
    fieldKit: raw.fieldKit,
    dailyPlanCards: raw.dailyPlanCards.map((d) => ({
      ...d,
      titleHe: interp(d.titleHe),
      summaryHe: interp(d.summaryHe),
      reuvenTrackHe: interp(d.reuvenTrackHe),
      girlsTrackHe: interp(d.girlsTrackHe),
      oritTrackHe: interp(d.oritTrackHe),
      meetupHe: interp(d.meetupHe),
    })),
  };
}
