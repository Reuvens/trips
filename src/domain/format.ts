/**
 * Pure formatting, date math, safe token interpolation, and auto-escaping HTML helpers.
 */

export const HE_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
] as const;

export const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const DOW_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'] as const;
export const DOW_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

export interface ParsedIsoDate {
  iso: string;
  year: number;
  month: number;
  day: number;
  utcMs: number;
  dowIndex: number; // 0 = Sunday .. 6 = Saturday
}

export function parseIsoDate(iso: string): ParsedIsoDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    throw new Error(`Impossible calendar date: ${iso}`);
  }
  return {
    iso,
    year,
    month,
    day,
    utcMs: dt.getTime(),
    dowIndex: dt.getUTCDay(),
  };
}

export function daysBetween(startIso: string, endIso: string): number {
  const a = parseIsoDate(startIso);
  const b = parseIsoDate(endIso);
  return Math.round((b.utcMs - a.utcMs) / 86_400_000);
}

export function addDaysIso(iso: string, deltaDays: number): string {
  const d = parseIsoDate(iso);
  const next = new Date(d.utcMs + deltaDays * 86_400_000);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const day = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDm(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.day}.${d.month}`;
}

export function formatDmy(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.day}.${d.month}.${d.year}`;
}

export function formatDowFull(iso: string): string {
  const d = parseIsoDate(iso);
  return DOW_FULL[d.dowIndex]!;
}

export function formatDowShortDm(iso: string): string {
  const d = parseIsoDate(iso);
  return `${DOW_SHORT[d.dowIndex]}׳ ${d.day}.${d.month}`;
}

export function formatDowFullDm(iso: string): string {
  const d = parseIsoDate(iso);
  return `${DOW_FULL[d.dowIndex]} ${d.day}.${d.month}`;
}

export function formatSpanDm(startIso: string, endIso: string): string {
  const a = parseIsoDate(startIso);
  const b = parseIsoDate(endIso);
  if (a.month === b.month && a.year === b.year) {
    return `${a.day}–${b.day}.${a.month}`;
  }
  return `${a.day}.${a.month}–${b.day}.${b.month}`;
}

export function formatSpanWindowHe(startIso: string, endIso: string): string {
  const a = parseIsoDate(startIso);
  const b = parseIsoDate(endIso);
  if (a.month === b.month && a.year === b.year) {
    return `${a.day}–${b.day} ב${HE_MONTHS[a.month - 1]} ${a.year}`;
  }
  return `${a.day}.${a.month}–${b.day}.${b.month}.${b.year}`;
}

export function formatSpanEn(startIso: string, endIso: string): string {
  const a = parseIsoDate(startIso);
  const b = parseIsoDate(endIso);
  return `${a.day} ${EN_MONTHS[a.month - 1]} – ${b.day} ${EN_MONTHS[b.month - 1]} ${b.year}`;
}

export function parseClockMinutes(clock: string): { minutes: number; approx: boolean } {
  const approx = clock.startsWith('~');
  const clean = approx ? clock.slice(1) : clock;
  const parts = clean.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return { minutes: h * 60 + m, approx };
}

export function minutesToClock(mins: number, step = 15, roundDown = false): string {
  const rounded = roundDown
    ? Math.floor(mins / step) * step
    : Math.round(mins / step) * step;
  const wrapped = ((rounded % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDurationHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function formatEur(amount: number): string {
  if (Number.isInteger(amount) || Math.abs(amount - Math.round(amount)) < 0.005) {
    return `€${Math.round(amount).toLocaleString('en-US')}`;
  }
  return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatIls(amount: number): string {
  return `₪${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const HE_MASCULINE: Record<number, string> = {
  1: 'אחד',
  2: 'שניים',
  3: 'שלושה',
  4: 'ארבעה',
  5: 'חמישה',
  6: 'שישה',
  7: 'שבעה',
  8: 'שמונה',
  9: 'תשעה',
  10: 'עשרה',
};

const HE_FEMININE: Record<number, string> = {
  1: 'אחת',
  2: 'שתיים',
  3: 'שלוש',
  4: 'ארבע',
  5: 'חמש',
  6: 'שש',
  7: 'שבע',
  8: 'שמונה',
  9: 'תשע',
  10: 'עשר',
};

export function heCountMasc(n: number): string {
  return HE_MASCULINE[n] ?? String(n);
}

export function heCountFem(n: number): string {
  return HE_FEMININE[n] ?? String(n);
}

/** Resolve dotted token path against a nested dictionary; throws on missing key. */
export function lookupPath(obj: Record<string, unknown>, dottedPath: string): string | number {
  const parts = dottedPath.trim().split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      throw new Error(`Unresolved token path "{{ ${dottedPath} }}" (stopped at "${p}")`);
    }
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) {
        throw new Error(`Out-of-bounds array index in "{{ ${dottedPath} }}"`);
      }
      cur = cur[idx];
    } else {
      const rec = cur as Record<string, unknown>;
      if (!(p in rec)) {
        throw new Error(`Unknown token key "${p}" in "{{ ${dottedPath} }}"`);
      }
      cur = rec[p];
    }
  }
  if (typeof cur === 'string' || typeof cur === 'number') {
    return cur;
  }
  throw new Error(`Token "{{ ${dottedPath} }}" did not resolve to a string or number`);
}

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function interpolateTokens(text: string, tokens: Record<string, unknown>): string {
  return text.replace(TOKEN_RE, (_full, key: string) => {
    const val = lookupPath(tokens, key);
    return typeof val === 'number' ? val.toLocaleString('en-US') : val;
  });
}

// ── Auto-Escaping SafeHtml Tagged Template Engine ───────────────────────────

export class SafeHtml {
  public readonly __html: string;
  constructor(trustedHtml: string) {
    this.__html = trustedHtml;
  }
  toString(): string {
    return this.__html;
  }
}

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function rawHtml(trusted: string): SafeHtml {
  return new SafeHtml(trusted);
}

type HtmlInterpolation =
  | SafeHtml
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<HtmlInterpolation>;

function renderInterpolation(v: HtmlInterpolation): string {
  if (v === null || v === undefined || v === false) return '';
  if (v === true) return 'true';
  if (v instanceof SafeHtml) return v.__html;
  if (Array.isArray(v)) return v.map(renderInterpolation).join('');
  return escapeHtml(String(v));
}

export function html(
  strings: TemplateStringsArray,
  ...values: HtmlInterpolation[]
): SafeHtml {
  let out = strings[0] ?? '';
  for (let i = 0; i < values.length; i++) {
    out += renderInterpolation(values[i]) + (strings[i + 1] ?? '');
  }
  return new SafeHtml(out);
}
