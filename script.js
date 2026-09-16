/* ============================================================
 *  HSE SANS
 * ============================================================ */
@font-face {
  font-family: 'HSE Sans';
  src: url('fonts/HSESans-Thin.otf') format('opentype');
  font-weight: 100; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'HSE Sans';
  src: url('fonts/HSESans-Regular.otf') format('opentype');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'HSE Sans';
  src: url('fonts/HSESans-Italic.otf') format('opentype');
  font-weight: 400; font-style: italic; font-display: swap;
}
@font-face {
  font-family: 'HSE Sans';
  src: url('fonts/HSESans-SemiBold.otf') format('opentype');
  font-weight: 600; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'HSE Sans';
  src: url('fonts/HSESans-Bold.otf') format('opentype');
  font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'HSE Sans';
  src: url('fonts/HSESans-Black.otf') format('opentype');
  font-weight: 900; font-style: normal; font-display: swap;
}

/* ============================================================
 *  ПЕРЕМЕННЫЕ
 * ============================================================ */
:root {
  --font: 'HSE Sans', 'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* Акценты разделов */
  --c-events: #4f46e5;
  --c-events-light: #eef2ff;
  --c-grants: #059669;
  --c-grants-light: #ecfdf5;
  --c-extra: #d97706;
  --c-extra-light: #fffbeb;

  --primary: var(--c-events);
  --primary-light: var(--c-events-light);

  --bg: #f7f8fc;
  --surface: #ffffff;
  --border: #e6e8f0;
  --border-strong: #d4d8e5;
  --text: #0f172a;
  --text-muted: #556177;
  --text-soft: #8b95a8;
  --radius: 16px;
  --radius-sm: 10px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 2px rgba(15,23,42,.04);
  --shadow: 0 4px 20px rgba(15,23,42,.06);
  --shadow-lg: 0 16px 32px rgba(15,23,42,.10);
  --t: .2s cubic-bezier(.4,0,.2,1);
}

/* ============================================================
 *  RESET + BASE
 * ============================================================ */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16.5px; }

body {
  font-family: var(--font);
  background: var(--bg);
  background-image:
    radial-gradient(at 0% 0%, rgba(99,102,241,.07) 0, transparent 50%),
    radial-gradient(at 100% 0%, rgba(168,85,247,.05) 0, transparent 50%);
  background-attachment: fixed;
  color: var(--text);
  min-height: 100vh;
  padding: 22px 20px 40px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-weight: 400;
}

.container { max-width: 1340px; margin: 0 auto; }

/* ============================================================
 *  HERO
 * ============================================================ */
.hero { margin-bottom: 18px; }
.hero h1 {
  font-size: clamp(1.75rem, 3.5vw, 2.3rem);
  font-weight: 900;
  letter-spacing: -.03em; line-height: 1.1;
  background: linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin-bottom: 4px;
}
.hero-sub {
  color: var(--text-muted); font-size: .98rem;
  font-weight: 400; line-height: 1.5;
}

/* ============================================================
 *  TABS — разные цвета для разделов
 * ============================================================ */
.tabs {
  display: flex; gap: 4px; padding: 4px;
  background: rgba(255,255,255,.8);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  margin-bottom: 18px; width: fit-content; max-width: 100%;
  overflow-x: auto; box-shadow: var(--shadow-sm);
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 20px; border: none; background: transparent;
  font-family: inherit; font-size: .95rem; font-weight: 600;
  color: var(--text-muted); cursor: pointer;
  border-radius: var(--radius-pill); transition: var(--t); white-space: nowrap;
}
.tab-btn:hover { color: var(--text); background: rgba(99,102,241,.06); }

/* Каждая активная вкладка — своего цвета */
.tab-btn.active[data-tab="events"] {
  background: var(--c-events); color: #fff;
  box-shadow: 0 5px 14px rgba(79,70,229,.35);
}
.tab-btn.active[data-tab="grants"] {
  background: var(--c-grants); color: #fff;
  box-shadow: 0 5px 14px rgba(5,150,105,.35);
}
.tab-btn.active[data-tab="extra"] {
  background: var(--c-extra); color: #fff;
  box-shadow: 0 5px 14px rgba(217,119,6,.35);
}
.tab-btn.active:hover { background: inherit; }

.tab-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 24px; height: 20px; padding: 0 7px;
  font-size: .72rem; font-weight: 700;
  background: rgba(0,0,0,.06); border-radius: var(--radius-pill); opacity: .9;
}
.tab-btn.active .tab-count { background: rgba(255,255,255,.28); }

.tab-content { display: none; animation: fadeIn .25s ease; }
.tab-content.active { display: block; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}

/* ============================================================
 *  FILTERS — компактнее
 * ============================================================ */
.filters {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end;
  background: var(--surface); border: 1px solid var(--border);
  padding: 12px 16px; border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm); margin-bottom: 16px;
}
.filter { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
.filter label {
  font-size: .7rem; font-weight: 600; color: var(--text-soft);
  text-transform: uppercase; letter-spacing: .06em; padding-left: 3px;
}
.filter select, .filter input {
  padding: 8px 13px; border: 1px solid var(--border);
  background: var(--bg); border-radius: var(--radius-sm);
  font-family: inherit; font-size: .93rem; color: var(--text);
  transition: var(--t); outline: none;
}
.filter select:focus, .filter input:focus {
  border-color: var(--primary); background: #fff;
  box-shadow: 0 0 0 3px rgba(79,70,229,.14);
}
.filter-search { flex: 1; min-width: 220px; }

.btn-ghost, .btn-sort {
  padding: 8px 18px; border-radius: var(--radius-sm);
  font-family: inherit; font-size: .92rem;
  cursor: pointer; transition: var(--t); white-space: nowrap; height: 38px;
}
.btn-ghost {
  background: transparent; color: var(--text-muted);
  border: 1px solid var(--border); font-weight: 400;
}
.btn-ghost:hover {
  background: var(--bg); color: var(--text); border-color: var(--border-strong);
}
.btn-sort {
  background: var(--primary-light); color: var(--primary);
  border: 1px solid transparent; font-weight: 600;
}
.btn-sort:hover { filter: brightness(.96); }

/* ============================================================
 *  CARDS — плотнее
 * ============================================================ */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.card {
  position: relative; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 16px 18px 14px;
  display: flex; flex-direction: column;
  transition: var(--t); overflow: hidden;
}
.card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--card-accent, var(--primary));
  opacity: 0; transition: var(--t);
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}
.card:hover::before { opacity: 1; }

.card-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 8px; flex-wrap: wrap;
}
.type-badge {
  display: inline-flex; align-items: center; padding: 3px 11px;
  font-size: .74rem; font-weight: 600; border-radius: var(--radius-pill);
  background: var(--badge-bg, var(--primary-light));
  color: var(--badge-fg, var(--primary));
  letter-spacing: .02em;
}
.card-title {
  font-size: 1.05rem; font-weight: 700; line-height: 1.35;
  margin-bottom: 10px; letter-spacing: -.005em;
}
.card-title-link {
  color: inherit;
  text-decoration: none;
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 0% 1px;
  background-repeat: no-repeat;
  background-position: 0 100%;
  transition: background-size .25s ease, color .15s ease;
}
.card-title-link:hover {
  color: var(--card-accent, var(--primary));
  background-size: 100% 1px;
}

.card-info {
  display: flex; flex-direction: column; gap: 5px;
  font-size: .9rem; color: var(--text-muted); margin-bottom: 10px;
}
.card-info > div { display: flex; align-items: flex-start; gap: 8px; line-height: 1.45; }
.card-info .icon { flex-shrink: 0; width: 18px; text-align: center; opacity: .7; font-size: 1em; }

.card-footer {
  margin-top: auto; padding-top: 10px;
  border-top: 1px dashed var(--border);
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; flex-wrap: wrap;
}
.deadline {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .87rem; font-weight: 600; color: var(--text);
}
.deadline.soon   { color: #c2660a; }
.deadline.urgent { color: #c81e1e; }
.deadline.past   { color: var(--text-soft); text-decoration: line-through; }
.card-link {
  font-size: .87rem; font-weight: 600;
  color: var(--card-accent, var(--primary));
  text-decoration: none;
  white-space: nowrap;
}
.card-link:hover { text-decoration: underline; }

/* ============================================================
 *  EMPTY / LOADING
 * ============================================================ */
.no-results {
  grid-column: 1 / -1; text-align: center;
  padding: 40px 20px; color: var(--text-muted);
  font-size: .98rem;
}
.no-results .emoji { font-size: 2.8rem; display: block; margin-bottom: 10px; opacity: .55; }

.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius); height: 190px;
}
@keyframes shimmer {
  0%   { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

.error-box {
  grid-column: 1 / -1; padding: 32px 20px; text-align: center;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: var(--radius); color: #991b1b;
  font-size: .95rem;
}

.footer {
  margin-top: 22px; text-align: center;
  font-size: .82rem; color: var(--text-soft);
}

/* ============================================================
 *  АДАПТИВ
 * ============================================================ */
@media (max-width: 720px) {
  html { font-size: 16px; }
  body { padding: 16px 14px 32px; }
  .filters { flex-direction: column; align-items: stretch; padding: 10px 12px; }
  .filter { min-width: 0; }
  .btn-ghost, .btn-sort { width: 100%; }
  .cards-grid { grid-template-columns: 1fr; gap: 12px; }
  .tab-btn { padding: 8px 14px; font-size: .88rem; }
}
