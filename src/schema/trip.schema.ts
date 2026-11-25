import { z } from 'zod';

function isValidIsoCalendarDate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() + 1 === mo &&
    dt.getUTCDate() === d
  );
}

function isValidIanaTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Strict YYYY-MM-DD real calendar date */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date format')
  .refine(isValidIsoCalendarDate, 'Invalid calendar date (e.g. non-existent day/month)');

/** Valid IANA timezone string */
export const TimezoneSchema = z
  .string()
  .min(3)
  .refine(isValidIanaTimeZone, 'Invalid IANA timezone identifier');

/** Strict HH:MM (or ~HH:MM approximate) clock string */
export const ClockSchema = z
  .string()
  .regex(/^~?(?:[01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM or ~HH:MM clock format');

export const HttpsUrlSchema = z
  .string()
  .url()
  .refine((u) => u.startsWith('https://'), 'External URL must use https://');

export const ConfidenceSchema = z.enum(['quoted', 'modelled']);
export const UrgencySchema = z.enum(['red', 'amber', 'yellow']);
export const SkierRoleSchema = z.enum(['advanced', 'beginner', 'non_skier']);

export const RatesSchema = z.object({
  eur_ils: z.number().positive(),
  eur_ils_exact: z.number().positive().optional(),
  eur_usd: z.number().positive(),
  usd_ils: z.number().positive(),
  checked: IsoDateSchema,
  source: z.string().min(2),
});

export const PrivateRefsSchema = z.record(
  z.string(),
  z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])
);

export const PartyMemberSchema = z.object({
  id: z.string().min(2),
  nameHe: z.string().min(2),
  nameEn: z.string().min(2),
  age: z.number().int().positive().optional(),
  role: SkierRoleSchema,
  roleHe: z.string().min(3),
  bandHe: z.string().min(1),
  birthYearRuleHe: z.string().min(2),
  gearTierHe: z.string().min(2),
  scheduleFocusHe: z.string().min(4),
  passEur: z.number().nonnegative(),
});

export const FlightLegSchema = z.object({
  id: z.enum(['out', 'back']),
  flight: z.string().regex(/^[A-Z0-9]{4,7}$/),
  date: IsoDateSchema,
  dep: ClockSchema,
  arr: ClockSchema,
  arrDate: IsoDateSchema.optional(),
  fromHe: z.string().min(3),
  toHe: z.string().min(3),
  fromTz: TimezoneSchema,
  toTz: TimezoneSchema,
  mapQuery: z.string().min(3),
  duration: z.string().regex(/^\d+:\d{2}$/),
});

export const FlightBookingSchema = z.object({
  id: z.string().min(2),
  who: z.array(z.string().min(2)).min(1),
  refKey: z.string().min(2),
  ticketRefKeys: z.array(z.string().min(2)).min(1),
  classHe: z.string().min(3),
  points: z.number().int().nonnegative(),
  usd: z.number().nonnegative(),
  seatsAssigned: z.boolean(),
  seatsHe: z.string().min(2),
  noteHe: z.string().optional(),
});

export const BookedApartmentSchema = z.object({
  name: z.string().min(3),
  unitHe: z.string().min(3),
  hostName: z.string().min(3),
  hostHe: z.string().min(3),
  address: z.string().min(5),
  phone: z.string().min(6),
  whatsappDigits: z.string().regex(/^\d{8,15}$/),
  url: HttpsUrlSchema,
  bookingPage: HttpsUrlSchema,
  hotelsQuery: z.string().min(3),
  mapQuery: z.string().min(3),
  bookedOn: IsoDateSchema,
  bookedViaHe: z.string().min(3),
  eurTotal: z.number().int().positive(),
  eurPaid: z.number().int().nonnegative(),
  paidOn: IsoDateSchema,
  paidHowHe: z.string().min(3),
  refundable: z.boolean(),
  besafeNoteHe: z.string().min(5),
  taxEur: z.number().int().nonnegative(),
  confTax: ConfidenceSchema,
  checkInApprox: ClockSchema,
  checkOutApprox: ClockSchema,
  refKey: z.string().min(2),
  factsHe: z.array(z.string().min(3)).min(1),
  askHe: z.array(z.string().min(3)).min(1),
});

export const BookedFirstNightSchema = z.object({
  name: z.string().min(3),
  unitHe: z.string().min(3),
  address: z.string().min(5),
  whereHe: z.string().min(3),
  mapQuery: z.string().min(3),
  hotelsQuery: z.string().min(3),
  bookedOn: IsoDateSchema,
  bookedViaHe: z.string().min(3),
  roomVatEur: z.number().positive(),
  cleaningEur: z.number().nonnegative(),
  eurBooking: z.number().int().positive(),
  eurThereTax: z.number().int().nonnegative(),
  eurPaid: z.number().int().nonnegative(),
  checkIn: ClockSchema,
  checkInUntil: ClockSchema,
  checkOutFrom: ClockSchema,
  checkOut: ClockSchema,
  freeCancelUntil: IsoDateSchema,
  cancelFeeEur: z.number().int().nonnegative(),
  replacedName: z.string().min(3),
  replacedEur: z.number().int().positive(),
  refKey: z.string().min(2),
  pinRefKey: z.string().min(2),
  phoneRefKey: z.string().min(2),
  goodHe: z.array(z.string().min(3)).min(1),
  askHe: z.array(z.string().min(3)).min(1),
});

export const CandidateStaySchema = z
  .object({
    name: z.string().min(3),
    pick: z.boolean().optional(),
    conf: ConfidenceSchema,
    checked: IsoDateSchema,
    eurLow: z.number().int().positive(),
    eurWeek: z.number().int().positive(),
    eurHigh: z.number().int().positive(),
    historicalBasisHe: z.string().min(5),
    kindHe: z.string().min(3),
    bedsHe: z.string().min(3),
    liftHe: z.string().min(2),
    centreHe: z.string().min(2),
    perksHe: z.string().min(2),
    watchHe: z.string().optional(),
    url: HttpsUrlSchema,
    bookingUrl: HttpsUrlSchema.optional(),
    hotelsQuery: z.string().min(3),
  })
  .refine(
    (s) => s.eurLow <= s.eurWeek && s.eurWeek <= s.eurHigh,
    'Candidate stay requires eurLow <= eurWeek <= eurHigh'
  );

export const FirstNightOptionSchema = z.object({
  name: z.string().min(3),
  pick: z.boolean().optional(),
  areaHe: z.string().optional(),
  eur: z.number().int().positive().optional(),
  score: z.number().min(1).max(10).optional(),
  reviews: z.number().int().positive().optional(),
  stars: z.number().int().min(1).max(5).optional(),
  toLivignoMin: z.number().int().nonnegative().optional(),
  freeCancel: z.boolean().optional(),
  whatHe: z.string().min(3),
  url: HttpsUrlSchema,
  hotelsQuery: z.string().min(3),
});

export const TransferOptionSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(3),
  pick: z.boolean().optional(),
  isShared: z.boolean().optional(),
  seats: z.number().int().positive().optional(),
  eurReturn: z.number().int().positive(),
  conf: ConfidenceSchema,
  whatHe: z.string().min(5),
  freeCancelHe: z.string().optional(),
  watchHe: z.string().optional(),
  url: HttpsUrlSchema,
});

export const LocalVendorSchema = z.object({
  name: z.string().min(2),
  pick: z.boolean().optional(),
  whereHe: z.string().min(3),
  whatHe: z.string().min(5),
  url: HttpsUrlSchema,
});

export const SourcedCostLineSchema = z.object({
  eur: z.number().int().positive().optional(),
  insuranceEur: z.number().int().nonnegative().optional(),
  conf: ConfidenceSchema,
  whatHe: z.string().min(5),
  altHe: z.string().optional(),
  src: HttpsUrlSchema,
  srcHe: z.string().min(2),
});

export const ResortSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  nameHe: z.string().min(2),
  countryHe: z.string().min(2),
  order: z.number().int().positive(),
  airport: z.string().min(3),
  airportHe: z.string().min(2),
  transferMin: z.number().int().positive(),
  transferKm: z.number().int().positive(),
  pistesKm: z.number().int().positive(),
  baseM: z.number().int().positive(),
  villageM: z.number().int().positive(),
  topM: z.number().int().positive(),
  verdictHe: z.string().min(3),
  liftPassLink: HttpsUrlSchema,
  schoolLink: HttpsUrlSchema,
  hotelsQuery: z.string().min(2),
  searchQuery: z.string().min(2),
  stays: z.array(CandidateStaySchema).optional(),
  rentals: z.array(LocalVendorSchema).optional(),
  schools: z.array(LocalVendorSchema).optional(),
  firstNightChecked: IsoDateSchema.optional(),
  firstNightOptions: z.array(FirstNightOptionSchema).min(1),
  car: z.object({
    tollEurWay: z.number().int().nonnegative(),
    noteHe: z.string().min(5),
  }),
  transferOptions: z.array(TransferOptionSchema).min(2).max(4),
  cost: z.object({
    firstNight: SourcedCostLineSchema.extend({ eur: z.number().int().positive() }),
    passes: SourcedCostLineSchema.extend({ insuranceEur: z.number().int().nonnegative() }),
    gear: SourcedCostLineSchema.extend({ eur: z.number().int().positive() }),
  }),
  lessons: SourcedCostLineSchema.extend({
    unitEur: z.number().int().positive(),
  }),
  food: z.object({
    perDayEur: z.number().int().positive(),
    conf: ConfidenceSchema,
    breakdownHe: z.string().min(5),
    src: HttpsUrlSchema,
    srcHe: z.string().min(2),
  }),
});

export const VillagePinSchema = z.object({
  id: z.string().min(2),
  labelHe: z.string().min(2),
  labelEn: z.string().min(2),
  category: z.enum(['stay', 'ski', 'village', 'pass']),
  x: z.number().min(0).max(800),
  y: z.number().min(0).max(420),
  walkFromCalandaHe: z.string().min(2),
  forWho: z.array(z.string().min(2)).min(1),
  summaryHe: z.string().min(5),
  mapQuery: z.string().min(3),
});

export const OpenItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  titleHe: z.string().min(3),
  urgency: UrgencySchema,
  deadline: IsoDateSchema.optional(),
  category: z.enum(['stay', 'flights', 'ski', 'logistics', 'docs']),
  targetAnchor: z.string().regex(/^#[a-z0-9-]+$/),
  actionUrl: HttpsUrlSchema.optional(),
  actionLabelHe: z.string().optional(),
  whatHe: z.string().min(5),
});

export const ReconciledRowSchema = z.object({
  topicHe: z.string().min(3),
  historicalWasHe: z.string().min(1),
  historicalOthersHe: z.string().min(1),
  historicalNowHe: z.string().min(1),
  moved: z.boolean(),
  historicalWhyHe: z.string().min(5),
});

export const OutsideSourceSchema = z.object({
  id: z.string().min(2),
  whoHe: z.string().min(3),
  status: z.enum(['read', 'unread']),
  url: HttpsUrlSchema.nullable(),
  localRef: z.string().min(3),
  noteHe: z.string().min(5),
});

export const FitCriterionSchema = z.object({
  id: z.string().min(2),
  weight: z.number().int().min(1).max(5),
  labelHe: z.string().min(2),
  whatHe: z.string().min(5),
});

export const FitCellSchema = z.object({
  n: z.number().int().min(1).max(5),
  whyHe: z.string().min(5),
});

export const SetAsideResortSchema = z.object({
  id: z.string().min(2),
  nameHe: z.string().min(2),
  regionHe: z.string().min(2),
  transferHe: z.string().min(2),
  pistesHe: z.string().min(2),
  goodHe: z.string().min(5),
  notHe: z.string().min(5),
  verdictHe: z.string().min(2),
});

export const FlagSchema = z.object({
  resort: z.string().min(2),
  kind: z.enum(['green', 'red']),
  textHe: z.string().min(5),
});

export const SimulatorConfigSchema = z.object({
  centraleCourseAndGearPerBeginnerEur: z.number().int().positive(),
  reuvenStandaloneGoldGearEur: z.number().int().positive(),
  travelSkiInsurancePerPersonEur: z.number().int().positive(),
  lastSaturdayMorningPerSkierEur: z.number().int().positive(),
});

export const OritHighlightSchema = z.object({
  titleHe: z.string().min(3),
  whenHe: z.string().min(2),
  detailHe: z.string().min(5),
  mapQuery: z.string().min(3),
  url: HttpsUrlSchema.optional(),
});

export const VaultAuthConfigSchema = z.object({
  allowedEmails: z.array(z.string().email()).min(1),
  googleClientId: z.string().optional(),
  driveVaultFileId: z.string().optional(),
});

export const LiveMountainConfigSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  febBaselineVillageC: z.number(),
  febBaselineSummitC: z.number(),
  febSnowBaseCm: z.number().int().positive(),
  webcams: z
    .array(
      z.object({
        id: z.string().min(2),
        labelHe: z.string().min(2),
        subHe: z.string().min(3),
        url: HttpsUrlSchema,
      })
    )
    .min(3),
});

export const LunchMeetupSchema = z.object({
  id: z.string().min(2),
  nameHe: z.string().min(2),
  nameEn: z.string().min(2),
  bestTimeHe: z.string().min(2),
  forSkierHe: z.string().min(5),
  forOritHe: z.string().min(5),
  dishTipHe: z.string().min(3),
  mapQuery: z.string().min(3),
  url: HttpsUrlSchema.optional(),
});

export const CulinarySpotSchema = z.object({
  id: z.string().min(2),
  category: z.enum(['mountain', 'dinner', 'apres', 'dutyfree']),
  nameHe: z.string().min(2),
  nameEn: z.string().min(2),
  vibeHe: z.string().min(4),
  mustTryHe: z.string().min(4),
  bookingTipHe: z.string().min(4),
  mapQuery: z.string().min(3),
  url: HttpsUrlSchema.optional(),
});

export const PackingItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  group: z.enum(['docs', 'ski_wear', 'orit_spa', 'family_bag']),
  labelHe: z.string().min(2),
  noteHe: z.string().min(3),
  forWho: z.array(z.string().min(2)).min(1),
});

export const FieldKitSchema = z.object({
  skiBusLines: z
    .array(
      z.object({
        id: z.string().min(2),
        colorNameHe: z.string().min(2),
        badgeHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        routeHe: z.string().min(5),
        tipForFamilyHe: z.string().min(5),
      })
    )
    .min(3),
  emergencyContacts: z
    .array(
      z.object({
        id: z.string().min(2),
        labelHe: z.string().min(2),
        phoneDisplay: z.string().min(3),
        telHref: z.string().min(4),
        noteHe: z.string().min(4),
      })
    )
    .min(3),
  italianPhrases: z
    .array(
      z.object({
        it: z.string().min(2),
        phoneticHe: z.string().min(2),
        meaningHe: z.string().min(2),
        contextHe: z.string().min(2),
      })
    )
    .min(6),
});

export const DailyPlanCardSchema = z.object({
  id: z.string().min(2),
  tabLabelHe: z.string().min(2),
  dateBadgeHe: z.string().min(2),
  titleHe: z.string().min(4),
  summaryHe: z.string().min(6),
  reuvenTrackHe: z.string().min(4),
  girlsTrackHe: z.string().min(4),
  oritTrackHe: z.string().min(4),
  meetupHe: z.string().min(4),
});

export const TripDataSchema = z.object({
  meta: z.object({
    id: z.string().min(3),
    sharedPublicly: z.boolean(),
    artifactUrl: HttpsUrlSchema,
    lastDataReview: IsoDateSchema,
  }),
  vaultAuth: VaultAuthConfigSchema,
  liveMountain: LiveMountainConfigSchema,
  lunchMeetups: z.array(LunchMeetupSchema).min(4),
  culinaryAndShopping: z.array(CulinarySpotSchema).min(6),
  packingList: z.array(PackingItemSchema).min(12),
  fieldKit: FieldKitSchema,
  dailyPlanCards: z.array(DailyPlanCardSchema).min(4),
  dates: z.object({
    start: IsoDateSchema,
    end: IsoDateSchema,
    homeLanding: IsoDateSchema,
    aptIn: IsoDateSchema,
    aptOut: IsoDateSchema,
    courseStart: IsoDateSchema,
    courseEnd: IsoDateSchema,
    courseHours: z.object({
      start: ClockSchema,
      end: ClockSchema,
    }),
    airportExitMin: z.number().int().positive(),
    airportBeforeMin: z.number().int().positive(),
    roadBufferMin: z.number().int().nonnegative(),
  }),
  decidedResortId: z.string().min(2),
  party: z.object({
    juniorMaxAge: z.number().int().positive(),
    bandsSummaryHe: z.string().min(5),
    members: z.array(PartyMemberSchema).min(1),
  }),
  oritGuide: z.array(OritHighlightSchema).min(3),
  flights: z.object({
    legs: z.array(FlightLegSchema).length(2),
    baggageHe: z.string().min(5),
    pointsPerAwardTicket: z.number().int().positive(),
    bookings: z.array(FlightBookingSchema).min(1),
  }),
  lodgingComparisonAssumption: z
    .object({
      eurLow: z.number().int().positive(),
      eurHigh: z.number().int().positive(),
    })
    .refine((a) => a.eurLow <= a.eurHigh, 'lodgingComparisonAssumption requires eurLow <= eurHigh'),
  apartment: BookedApartmentSchema,
  firstNightBooked: BookedFirstNightSchema.nullable(),
  excludedHe: z.array(z.string().min(3)).min(3),
  carRental: z.object({
    nameHe: z.string().min(3),
    eurPerDay: z.number().int().positive(),
    coverEurPerDay: z.number().int().nonnegative(),
    winterEurPerDay: z.number().int().nonnegative(),
    litersPer100Km: z.number().positive(),
    eurPerLiter: z.number().positive(),
    conf: ConfidenceSchema,
    freeCancelHe: z.string().min(5),
    url: HttpsUrlSchema,
    compareUrl: HttpsUrlSchema,
    watchHe: z.array(z.string().min(3)).min(2),
  }),
  simulator: SimulatorConfigSchema,
  villageMapPins: z.array(VillagePinSchema).min(6),
  resorts: z.array(ResortSchema).min(2),
  setAside: z.array(SetAsideResortSchema).min(3),
  worldFacts: z.object({
    italyPisteInsurance: z.object({
      lawHe: z.string().min(3),
      sinceHe: z.string().min(3),
      fineHe: z.string().min(2),
      dayPriceEur: z.number().positive(),
      src: HttpsUrlSchema,
    }),
    hotelVsApartmentGapEur: z.number().int().positive(),
    ees: z.object({
      liveHe: z.string().min(3),
      src: HttpsUrlSchema,
    }),
    etias: z.object({
      feeEur: z.number().positive(),
      statusHe: z.string().min(5),
      src: HttpsUrlSchema,
    }),
    livignoFoodUnitNotes: z.object({
      mountainDishEur: z.number().positive(),
      trattoriaDinnerEur: z.number().positive(),
      breakfastGroceriesDayEur: z.number().positive(),
    }),
    cerviniaAdult7dPassEur: z.number().positive(),
    sestriereAdult7dPassEur: z.number().positive(),
    sestriereJunior7dPassEur: z.number().positive(),
  }),
  sources: z.array(OutsideSourceSchema).min(1),
  reconciled: z.array(ReconciledRowSchema).min(5),
  fit: z.object({
    criteria: z.array(FitCriterionSchema).min(3),
    scores: z.record(z.string(), z.record(z.string(), FitCellSchema)),
  }),
  flags: z.array(FlagSchema).min(4),
  openItems: z.array(OpenItemSchema).min(1),
});

export type TripData = z.infer<typeof TripDataSchema>;
export type RatesData = z.infer<typeof RatesSchema>;
export type PrivateRefs = z.infer<typeof PrivateRefsSchema>;
export type ResortData = z.infer<typeof ResortSchema>;
export type PartyMember = z.infer<typeof PartyMemberSchema>;
export type OpenItem = z.infer<typeof OpenItemSchema>;
export type VillagePin = z.infer<typeof VillagePinSchema>;
