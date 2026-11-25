/**
 * Split-Screen Gateway Hub (`dist/index.html`) for GitHub Pages.
 * Lets any family member open either Site 1 (Mobile Companion App) or Site 2 (Editorial Luxury Magazine).
 */
import { ALPINE_PHOTOS } from '../assets/alpinePhotos.js';
import type { TripViewModel } from '../domain/deriveTrip.js';
import { html } from '../domain/format.js';

export function renderGatewayHubHtml(vm: TripViewModel): string {
  const title = html`<title>ליביניו 2027 · שני אתרי החופשה של משפחת סייג</title>`.toString();
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${title}
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700;900&family=Suez+One&family=Assistant:wght@400;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: 'Assistant', system-ui, sans-serif;
      background: #0b1929;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 28px 18px;
    }
    .hub-wrap {
      max-width: 1060px;
      width: 100%;
      margin: 0 auto;
    }
    .hub-head {
      text-align: right;
      margin-bottom: 24px;
    }
    .hub-back {
      display: inline-block;
      color: #93c5fd;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .hub-back:hover {
      text-decoration: underline;
    }
    .hub-kicker {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      color: #7dd3fc;
    }
    .hub-head h1 {
      font-family: 'Frank Ruhl Libre', 'Suez One', serif;
      font-size: clamp(32px, 5vw, 52px);
      margin: 8px 0;
    }
    .hub-head p {
      margin: 0;
      max-width: 64ch;
      color: #cbd5e1;
      font-size: 17px;
      line-height: 1.5;
    }
    .hub-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 22px;
    }
    @media (max-width: 760px) {
      .hub-grid { grid-template-columns: minmax(0, 1fr); }
    }
    .hub-card {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      min-height: 360px;
      display: flex;
      align-items: flex-end;
      text-decoration: none;
      color: #ffffff;
      border: 1.5px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.2s ease, border-color 0.2s ease;
      box-shadow: 0 20px 44px rgba(0, 0, 0, 0.35);
    }
    .hub-card:hover {
      transform: translateY(-4px);
      border-color: #7dd3fc;
    }
    .hub-card img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .hub-overlay {
      position: relative;
      z-index: 2;
      width: 100%;
      padding: 28px 24px;
      background: linear-gradient(to top, rgba(8, 17, 28, 0.95) 0%, rgba(8, 17, 28, 0.62) 60%, rgba(8, 17, 28, 0.15) 100%);
    }
    .hub-tag {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.16);
      backdrop-filter: blur(8px);
      margin-bottom: 10px;
    }
    .hub-card h2 {
      font-family: 'Frank Ruhl Libre', 'Suez One', serif;
      font-size: 28px;
      margin: 0 0 8px;
    }
    .hub-card p {
      margin: 0 0 16px;
      color: #e2e8f0;
      font-size: 15.5px;
      line-height: 1.45;
    }
    .hub-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 12px;
      background: #ffffff;
      color: #0f2338;
      font-weight: 800;
      font-size: 15px;
    }
  </style>
</head>
<body dir="rtl" style="direction:rtl;text-align:right">
  <div class="hub-wrap">
    <div class="hub-head">
      <a class="hub-back" href="../index.html">← כל המסעות של משפחת סייג</a>
      <span class="hub-kicker">ליביניו, איטליה · ${html`${vm.dates.spanDmYear}`} · משפחת סייג</span>
      <h1>חופשת הסקי בליביניו — שתי מהדורות חיות</h1>
      <p>שני אתרים שונים הבנויים מאותו מקור אמת מאומת, עם עדכון יורו אוטומטי, מזג אוויר חי וכספת הזמנות משפחתית מוצפנת.</p>
    </div>
    <div class="hub-grid">
      <a class="hub-card" href="./app/index.html">
        <img src="${ALPINE_PHOTOS.heroValley}" alt="אפליקציית החופשה המשפחתית" />
        <div class="hub-overlay">
          <span class="hub-tag">אתר 1 · Mobile-First Companion App</span>
          <h2>אפליקציית השטח המשפחתית</h2>
          <p>ניווט מהיר ב-5 לשוניות באגודל, סינון אישי לכל בן משפחה, מצב שלג מהיר, כספת PNR/PIN, רשימת אריזה ותקציב חי.</p>
          <span class="hub-cta">פתיחת האפליקציה ←</span>
        </div>
      </a>
      <a class="hub-card" href="./magazine/index.html">
        <img src="${ALPINE_PHOTOS.aquagrandaSpa}" alt="המגזין האלפיני היוקרתי" />
        <div class="hub-overlay">
          <span class="hub-tag">אתר 2 · Editorial Luxury Resort</span>
          <h2>המגזין האלפיני היוקרתי</h2>
          <p>חוויית מגזין מצולמת בסגנון Condé Nast: כתבות אווירה על הספא, מפגשי הצהריים בהר, הקולינריה והבקתות בעמק.</p>
          <span class="hub-cta">פתיחת המגזין ←</span>
        </div>
      </a>
    </div>
  </div>
</body>
</html>
`;
}
