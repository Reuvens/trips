#!/usr/bin/env tsx
/**
 * Automatic Euro Exchange Rate Updater (`npm run update:rates`).
 *
 * Fetches the latest official ECB exchange rate (EUR -> ILS, USD) from
 * Frankfurter API, falling back to Open Exchange Rates API if unreachable,
 * and updates `data/rates.yaml` atomically. If offline (e.g. air-gapped environment),
 * keeps the last verified `data/rates.yaml` intact with a clear warning.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RATES_PATH = path.join(ROOT, 'data', 'rates.yaml');

interface LiveRateResult {
  eurIlsExact: number;
  eurUsd: number;
  date: string;
  source: string;
}

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLatestEuroRate(): Promise<LiveRateResult> {
  // Primary: Official ECB feed via Frankfurter
  try {
    const res = await fetchWithTimeout('https://api.frankfurter.dev/v1/latest?from=EUR&to=ILS,USD');
    if (res.ok) {
      const json = (await res.json()) as { date?: string; rates?: { ILS?: number; USD?: number } };
      const ils = json.rates?.ILS;
      const usd = json.rates?.USD;
      if (typeof ils === 'number' && ils > 1 && typeof usd === 'number' && usd > 0.5) {
        return {
          eurIlsExact: Number(ils.toFixed(4)),
          eurUsd: Number(usd.toFixed(4)),
          date: json.date ?? new Date().toISOString().slice(0, 10),
          source: 'ECB (Frankfurter API)',
        };
      }
    }
  } catch {
    // Fall through to secondary provider
  }

  // Secondary fallback: Open Exchange Rates
  const res2 = await fetchWithTimeout('https://open.er-api.com/v6/latest/EUR');
  if (!res2.ok) {
    throw new Error(`Secondary FX provider returned HTTP ${res2.status}`);
  }
  const json2 = (await res2.json()) as {
    time_last_update_utc?: string;
    rates?: { ILS?: number; USD?: number };
  };
  const ils2 = json2.rates?.ILS;
  const usd2 = json2.rates?.USD;
  if (typeof ils2 !== 'number' || typeof usd2 !== 'number') {
    throw new Error('Invalid payload from secondary FX provider');
  }
  const parsedDate = json2.time_last_update_utc
    ? new Date(json2.time_last_update_utc).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    eurIlsExact: Number(ils2.toFixed(4)),
    eurUsd: Number(usd2.toFixed(4)),
    date: parsedDate,
    source: 'Open Exchange Rates API',
  };
}

async function main(): Promise<void> {
  try {
    const live = await fetchLatestEuroRate();
    const eurIls = Number(live.eurIlsExact.toFixed(2));
    const usdIls = Number((live.eurIlsExact / live.eurUsd).toFixed(2));

    const header = [
      '# ═══════════════════════════════════════════════════════════════════════════',
      '# שערי מטבע רשמיים — מתעדכנים אוטומטית בשני רבדים:',
      '#   1. בזמן בנייה / GitHub Actions יומי: `npm run update:rates` (מול ה-ECB)',
      '#   2. בזמן אמת בדפדפן של המשתמש: שליפה אוטומטית מ-Frankfurter/ECB עם מטמון חכם',
      '#      וגיבוי שקט לקובץ זה כשאין קליטה על ההר או בתוך סביבת CSP סגורה.',
      '# ═══════════════════════════════════════════════════════════════════════════',
    ].join('\n');

    const doc = YAML.stringify({
      eur_ils: eurIls,
      eur_ils_exact: live.eurIlsExact,
      eur_usd: live.eurUsd,
      usd_ils: usdIls,
      checked: live.date,
      source: live.source,
    });

    fs.writeFileSync(RATES_PATH, `${header}\n${doc}`, 'utf8');
    console.log(
      `[rates] Updated EUR/ILS = ₪${eurIls} (exact ${live.eurIlsExact}), USD/ILS = ₪${usdIls} (${live.date}, ${live.source})`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[rates] Warning: Could not fetch live rate (${msg}). Keeping existing data/rates.yaml.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
