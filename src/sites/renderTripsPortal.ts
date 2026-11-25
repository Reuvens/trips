/**
 * Root Family Trips Portal (`dist/index.html` for `Reuvens/trips` GitHub Pages).
 * Automatically lists every trip under `trips/<slug>/` built by the shared engine ("same brain"),
 * with 1-tap launch buttons for both the Mobile Companion App and Editorial Luxury Magazine.
 */
import { ALPINE_PHOTOS } from '../assets/alpinePhotos.js';
import type { TripViewModel } from '../domain/deriveTrip.js';
import { html } from '../domain/format.js';

export interface PortalTripEntry {
  slug: string;
  vm: TripViewModel;
}

export function renderTripsPortalHtml(entries: PortalTripEntry[]): string {
  const cardsHtml = entries
    .map(({ slug, vm }) => {
      const cardMarkup = html`
        <article class="trip-portal-card" data-trip-card="${slug}">
          <div class="tpc-media">
            <img
              src="${ALPINE_PHOTOS.heroValley}"
              alt="${vm.decided.nameHe}"
            />
            <div class="tpc-media-veil">
              <span class="tpc-badge">${vm.party.peopleHe} בני משפחה · <span class="ltr">${vm.dates.spanDmYear}</span></span>
              <h2>${vm.decided.nameHe}</h2>
              <p>${vm.heroLedeHe}</p>
            </div>
          </div>

          <div class="tpc-body">
            <div class="tpc-stats">
              <div>
                <span>יעד וגובה</span>
                <b>${vm.decided.name} · <span class="ltr">${vm.decided.baseM.toLocaleString('en-US')}–${vm.decided.topM.toLocaleString('en-US')}m</span></b>
              </div>
              <div>
                <span>לינה סגורה</span>
                <b>${vm.apartment.name}</b>
              </div>
              <div>
                <span>סטטוס הכנות</span>
                <b>${vm.counts.openTotal} משימות פתוחות · שער €1 = ₪${vm.rates.eurIlsDisplay}</b>
              </div>
            </div>

            <div class="tpc-actions">
              <a class="tpc-btn primary" href="./${slug}/app/index.html">
                📱 אפליקציית שטח בנייד (App)
              </a>
              <a class="tpc-btn secondary" href="./${slug}/magazine/index.html">
                📖 מהדורת מגזין אלפיני (Magazine)
              </a>
              <a class="tpc-btn ghost" href="./${slug}/index.html">
                שער הטיול ←
              </a>
            </div>
          </div>
        </article>
      `;
      return cardMarkup.toString();
    })
    .join('\n');

  return `<!doctype html>
<html lang="he" dir="rtl" style="direction:rtl;text-align:right">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>המסעות של משפחת סייג · פורטל הטיולים המשפחתי</title>
  <meta name="description" content="פורטל הטיולים המשפחתי של משפחת סייג — מנוע משותף לכל חופשה עם אפליקציית שטח, מגזין מאויר וכספת הזמנות מוצפנת">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700;900&family=Suez+One&family=Assistant:wght@400;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100vh;
      direction: rtl !important;
      text-align: right !important;
      font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a1726;
      color: #f1f5f9;
      overflow-x: clip;
    }
    .ltr {
      direction: ltr;
      unicode-bidi: isolate;
      display: inline-block;
    }
    .portal-shell {
      max-width: 1060px;
      margin: 0 auto;
      padding: 36px 18px 56px;
    }
    .portal-header {
      border-bottom: 1px solid rgba(148, 163, 184, 0.25);
      padding-bottom: 22px;
      margin-bottom: 28px;
    }
    .portal-kicker {
      display: inline-block;
      font-size: 13px;
      font-weight: 800;
      color: #7dd3fc;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 10px;
    }
    .portal-header h1 {
      font-family: 'Frank Ruhl Libre', 'Suez One', Georgia, serif;
      font-size: clamp(32px, 5.5vw, 52px);
      line-height: 1.08;
      margin: 0 0 10px;
      color: #ffffff;
    }
    .portal-header p {
      margin: 0;
      max-width: 66ch;
      color: #cbd5e1;
      font-size: 17px;
      line-height: 1.55;
    }
    .portal-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }
    .trip-portal-card {
      border-radius: 24px;
      overflow: hidden;
      background: #112236;
      border: 1.5px solid rgba(148, 163, 184, 0.26);
      box-shadow: 0 22px 48px rgba(0, 0, 0, 0.38);
    }
    .tpc-media {
      position: relative;
      min-height: 270px;
      display: flex;
      align-items: flex-end;
    }
    .tpc-media img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .tpc-media-veil {
      position: relative;
      z-index: 2;
      width: 100%;
      padding: 32px 24px 20px;
      background: linear-gradient(to top, rgba(9, 19, 32, 0.96) 0%, rgba(9, 19, 32, 0.58) 62%, rgba(9, 19, 32, 0.12) 100%);
    }
    .tpc-badge {
      display: inline-block;
      padding: 4px 11px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 800;
      background: rgba(56, 189, 248, 0.2);
      color: #bae6fd;
      border: 1px solid rgba(125, 211, 252, 0.35);
      margin-bottom: 8px;
    }
    .tpc-media-veil h2 {
      font-family: 'Frank Ruhl Libre', 'Suez One', serif;
      font-size: clamp(28px, 4.5vw, 40px);
      margin: 0 0 6px;
      color: #ffffff;
    }
    .tpc-media-veil p {
      margin: 0;
      color: #e2e8f0;
      font-size: 15.5px;
      max-width: 66ch;
      line-height: 1.48;
    }
    .tpc-body {
      padding: 20px 24px 24px;
    }
    .tpc-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    @media (max-width: 720px) {
      .tpc-stats {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .tpc-stats > div {
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      padding: 11px 14px;
    }
    .tpc-stats span {
      display: block;
      font-size: 12.5px;
      color: #94a3b8;
      margin-bottom: 3px;
    }
    .tpc-stats b {
      font-size: 15px;
      color: #f8fafc;
    }
    .tpc-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .tpc-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 11px 18px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      transition: transform 0.14s ease, opacity 0.14s ease;
    }
    .tpc-btn:hover {
      transform: translateY(-1px);
    }
    .tpc-btn.primary {
      background: #2563eb;
      color: #ffffff;
    }
    .tpc-btn.secondary {
      background: #9e472a;
      color: #ffffff;
    }
    .tpc-btn.ghost {
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: #cbd5e1;
    }
    .portal-footer {
      margin-top: 32px;
      padding-top: 18px;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      color: #94a3b8;
      font-size: 14px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 10px;
    }
    code {
      font-family: 'IBM Plex Mono', monospace;
      direction: ltr;
      unicode-bidi: isolate;
      display: inline-block;
      background: rgba(15, 23, 42, 0.7);
      padding: 2px 7px;
      border-radius: 6px;
      color: #bae6fd;
    }
  </style>
</head>
<body dir="rtl">
  <div class="portal-shell">
    <header class="portal-header">
      <span class="portal-kicker">משפחת סייג · מנוע תכנון ושטח רב-טיולי</span>
      <h1>המסעות של משפחת סייג</h1>
      <p>
        כל חופשות המשפחה במקום אחד — מופעלות מאותו מנוע משותף (<code>src/</code>) עם נתוני טיול מבודדים לכל יעד
        (<code>trips/&lt;slug&gt;/</code>), שער מטבע חי יומי וכספת הזמנות מוצפנת ללא שום מידע רגיש בריפו הציבורי.
      </p>
    </header>

    <main class="portal-grid">
      ${cardsHtml}
    </main>

    <footer class="portal-footer">
      <span>להוספת טיול משפחתי חדש: <code>npm run new-trip &lt;slug&gt;</code></span>
      <span>אפס מידע רגיש ב-Git · הצפנת כספת PBKDF2-HMAC-SHA256</span>
    </footer>
  </div>
</body>
</html>
`;
}
