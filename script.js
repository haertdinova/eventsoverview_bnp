/* ============================================================
 *  КОНФИГУРАЦИЯ
 * ============================================================ */
const SHEET_ID = '1xpqZhHrXlKluMDPfkRgJBewJrlUikF-MB4Vkv9X8du4';

const SHEET_NAMES = {
  events: 'Мероприятия',
  grants: 'Гранты',
  extra:  'Дополнительно',
};

/* ============================================================
 *  НАСТРОЙКИ ПОВЕДЕНИЯ
 * ============================================================ */
const HIDE_EXPIRED = true;
const FALLBACK_FOR_EVENTS_WITHOUT_DEADLINE = 'event';

const SOON_DAYS   = 30;   // > SOON_DAYS   → зелёный
const URGENT_DAYS = 10;   // ≤ URGENT_DAYS → красный, остальное до SOON_DAYS — жёлтый

/* ============================================================
 *  МЕТКА «ВШЭ» — ищем по организатору
 * ============================================================ */
const HSE_MARKERS = ['вшэ', 'высшей школы экономики'];

function isHSEOrganizer(organizer) {
  if (!organizer) return false;
  const o = organizer.toLowerCase();
  return HSE_MARKERS.some(m => o.includes(m));
}

/* ============================================================
 *  ЦВЕТА РАЗДЕЛОВ
 * ============================================================ */
const ACCENTS = {
  events: { accent: '#102D69', bg: '#E9EEF6', fg: '#0A1F4A' },
  grants: { accent: '#0E7C66', bg: '#E6F4F0', fg: '#0A5C4B' },
  extra:  { accent: '#C75B12', bg: '#FBEEE3', fg: '#9C4409' },
};

function applyTabTheme(tab) {
  const c = ACCENTS[tab];
  if (!c) return;
  const root = document.documentElement;
  root.style.setProperty('--tab-accent', c.accent);
  root.style.setProperty('--tab-bg', c.bg);
  root.style.setProperty('--tab-fg', c.fg);
}

/* ============================================================
 *  ЗАГРУЗКА CSV
 * ============================================================ */
function gvizUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') {}
      else { field += c; }
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
      return obj;
    });
}

async function loadSheet(name) {
  const res = await fetch(gvizUrl(name));
  if (!res.ok) throw new Error(`HTTP ${res.status} для листа «${name}»`);
  return rowsToObjects(parseCSV(await res.text()));
}

/* ============================================================
 *  ДАТЫ
 * ============================================================ */
const MONTH_STEMS = [
  ['январ', 0], ['февра', 1], ['март', 2], ['апрел', 3],
  ['май', 4], ['мая', 4], ['июн', 5], ['июл', 6], ['авгус', 7],
  ['сентя', 8], ['октяб', 9], ['нояб', 10], ['декаб', 11],
];
const MONTH_NAMES_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function parseRussianDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    let y = +m[3]; if (y < 100) y += 2000;
    return new Date(y, +m[2] - 1, +m[1]);
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  const lower = s.toLowerCase();
  const yearM = lower.match(/(\d{4})/);
  const year = yearM ? +yearM[1] : new Date().getFullYear();

  for (const [stem, monthIdx] of MONTH_STEMS) {
    const pos = lower.indexOf(stem);
    if (pos === -1) continue;
    const before = lower.slice(0, pos);
    const days = before.match(/\d{1,2}(?=\D*$)/g);
    const day = days && days.length ? +days[days.length - 1] : 1;
    return new Date(year, monthIdx, day);
  }
  return null;
}

function parseLastRussianDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  const lower = s.toLowerCase();
  const yearM = lower.match(/(\d{4})/);
  const year = yearM ? +yearM[1] : new Date().getFullYear();

  let latest = null;
  for (const [stem, monthIdx] of MONTH_STEMS) {
    let pos = 0, found;
    while ((found = lower.indexOf(stem, pos)) !== -1) {
      const before = lower.slice(0, found);
      const dm = before.match(/(\d{1,2})[^\d]*$/);
      const day = dm ? +dm[1] : 1;
      const d = new Date(year, monthIdx, day);
      if (!latest || d > latest) latest = d;
      pos = found + stem.length;
    }
  }
  return latest;
}

function daysUntil(date) {
  if (!date) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

function isPastDate(date) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* ============================================================
 *  ОПРЕДЕЛЕНИЕ ТИПА
 * ============================================================ */
const TYPE_KEYWORDS = [
  ['конференц',    'Конференция'],
  ['симпозиум',    'Симпозиум'],
  ['круглый стол', 'Круглый стол'],
  ['семинар',      'Семинар'],
  ['форум',        'Форум'],
  ['чтени',        'Чтения'],
  ['съезд',        'Съезд'],
  ['школа',        'Школа'],
  ['конкурс',      'Конкурс'],
];

function detectType(title) {
  const t = (title || '').toLowerCase();
  for (const [kw, type] of TYPE_KEYWORDS) if (t.includes(kw)) return type;
  return 'Мероприятие';
}

/* ============================================================
 *  СОСТОЯНИЕ
 * ============================================================ */
const state = {
  events: [], grants: [], extra: [],
  sortDir: 'asc',
};

/* ============================================================
 *  НОРМАЛИЗАЦИЯ
 * ============================================================ */
function hasMarker(row) {
  return !!(row['Метка'] || '').trim();
}

function normalizeEvent(row) {
  const title     = row['Название мероприятия'] || row['Название'] || '';
  const dateStr   = row['Даты проведения'] || '';
  const deadlineS = row['Дедлайн подачи заявок'] || '';
  const organizer = row['Организатор'] || '';
  return {
    title,
    link:         row['Ссылка на сайт'] || '',
    dateRaw:      dateStr,
    dateStart:    parseRussianDate(dateStr),
    dateEnd:      parseLastRussianDate(dateStr),
    organizer,
    deadlineRaw:  deadlineS,
    deadlineDate: parseRussianDate(deadlineS),
    type:         detectType(title),
    highlight:    hasMarker(row),
    isHSE:        isHSEOrganizer(organizer),
  };
}

function normalizeSimple(row) {
  const deadlineS = row['Дедлайн'] || '';
  const organizer = row['Организатор'] || '';
  return {
    name:         row['Название'] || row['Наименование'] || '',
    deadlineRaw:  deadlineS,
    deadlineDate: parseRussianDate(deadlineS),
    organizer,
    link:         row['Ссылка'] || '',
    highlight:    hasMarker(row),
    isHSE:        isHSEOrganizer(organizer),
  };
}

/* ============================================================
 *  ПРАВИЛО «ПРОШЛО ИЛИ НЕТ»
 * ============================================================ */
function isExpiredEvent(e) {
  if (!HIDE_EXPIRED) return false;
  if (e.deadlineDate) return isPastDate(e.deadlineDate);
  if (FALLBACK_FOR_EVENTS_WITHOUT_DEADLINE === 'event') {
    return isPastDate(e.dateEnd || e.dateStart);
  }
  return false;
}

function isExpiredSimple(item) {
  if (!HIDE_EXPIRED) return false;
  return isPastDate(item.deadlineDate);
}

/* ============================================================
 *  ЗАГРУЗКА
 * ============================================================ */
async function loadAll() {
  showSkeletons();
  try {
    const [ev, gr, ex] = await Promise.all([
      loadSheet(SHEET_NAMES.events),
      loadSheet(SHEET_NAMES.grants),
      loadSheet(SHEET_NAMES.extra),
    ]);

    state.events = ev.map(normalizeEvent);
    state.grants = gr.map(normalizeSimple);
    state.extra  = ex.map(normalizeSimple);

    updateCounters();
    populateFilters();
    renderEvents();
    renderGrants();
    renderExtra();

    document.getElementById('status').textContent =
      `Данные из Google Sheets · обновлено ${new Date().toLocaleString('ru-RU')}`;
  } catch (err) {
    console.error(err);
    document.getElementById('events-container').innerHTML =
      `<div class="error-box">
        <div style="font-size:2.4rem;margin-bottom:10px;">⚠️</div>
        <strong style="font-size:1.05rem;">Не удалось загрузить данные</strong>
        <p style="margin-top:8px;">${escapeHtml(err.message)}</p>
      </div>`;
    document.getElementById('status').textContent = 'Ошибка загрузки данных';
  }
}

function updateCounters() {
  document.getElementById('count-events').textContent =
    state.events.filter(e => !isExpiredEvent(e)).length;
  document.getElementById('count-grants').textContent =
    state.grants.filter(g => !isExpiredSimple(g)).length;
  document.getElementById('count-extra').textContent =
    state.extra.filter(x => !isExpiredSimple(x)).length;
}

/* ============================================================
 *  ФИЛЬТРЫ
 * ============================================================ */
function populateFilters() {
  const actualEvents = state.events.filter(e => !isExpiredEvent(e));

  const types = [...new Set(actualEvents.map(e => e.type).filter(Boolean))].sort();

  const monthIdxSet = new Set(
    actualEvents.filter(e => e.dateStart).map(e => e.dateStart.getMonth())
  );
  const months = [...monthIdxSet]
    .sort((a, b) => a - b)
    .map(idx => MONTH_NAMES_NOM[idx]);

  fillSelect('filter-type', types, 'Все типы');
  fillSelect('filter-month', months, 'Все месяцы');
}

function fillSelect(id, values, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
}

/* ============================================================
 *  РЕНДЕР: МЕРОПРИЯТИЯ
 * ============================================================ */
function renderEvents() {
  const type  = document.getElementById('filter-type').value;
  const month = document.getElementById('filter-month').value;
  const q     = document.getElementById('filter-search').value.toLowerCase().trim();

  let list = state.events.filter(e => {
    if (isExpiredEvent(e)) return false;
    if (type && e.type !== type) return false;
    if (month) {
      if (!e.dateStart) return false;
      if (MONTH_NAMES_NOM[e.dateStart.getMonth()] !== month) return false;
    }
    if (q) {
      const hay = [e.title, e.organizer, e.dateRaw].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  list.sort((a, b) => {
    const da = a.dateStart ? a.dateStart.getTime() : Infinity;
    const db = b.dateStart ? b.dateStart.getTime() : Infinity;
    return state.sortDir === 'asc' ? da - db : db - da;
  });

  const container = document.getElementById('events-container');
  if (!list.length) {
    container.innerHTML = emptyHTML('🔍', 'Ничего не найдено. Попробуйте изменить фильтры.');
    return;
  }
  container.innerHTML = list.map(eventCardHTML).join('');
}

function eventCardHTML(e) {
  const c = ACCENTS.events;
  const hasLink = /^https?:\/\//i.test(e.link);
  const titleHTML = hasLink
    ? `<a class="card-title-link" href="${escapeHtml(e.link)}" target="_blank" rel="noopener">${escapeHtml(e.title)}</a>`
    : escapeHtml(e.title);

  const classes = ['card'];
  if (e.isHSE)     classes.push('card--hse');
  if (e.highlight) classes.push('card--highlighted');

  const badges = [];
  if (e.highlight) badges.push('<span class="new-badge">Новое</span>');
  if (e.isHSE)     badges.push('<span class="hse-badge">ВШЭ</span>');
  const badgesHTML = badges.length
    ? `<div class="card-badges">${badges.join('')}</div>`
    : '';

  return `
    <article class="${classes.join(' ')}" style="--card-accent:${c.accent}; --badge-bg:${c.bg}; --badge-fg:${c.fg};">
      ${badgesHTML}
      <h3 class="card-title">${titleHTML}</h3>
      <div class="card-info">
        ${e.dateRaw   ? `<div><span class="icon">📅</span><span>${escapeHtml(e.dateRaw)}</span></div>` : ''}
        ${e.organizer ? `<div><span class="icon">🏢</span><span>${escapeHtml(e.organizer)}</span></div>` : ''}
      </div>
      ${deadlineBlock(e)}
    </article>`;
}

/* ============================================================
 *  РЕНДЕР: ГРАНТЫ И ДОПОЛНИТЕЛЬНО
 * ============================================================ */
function renderGrants() {
  const q = document.getElementById('grant-search').value.toLowerCase().trim();
  const list = state.grants.filter(g => {
    if (isExpiredSimple(g)) return false;
    if (q && !(g.name + ' ' + g.organizer).toLowerCase().includes(q)) return false;
    return true;
  });
  const container = document.getElementById('grants-container');
  if (!list.length) {
    container.innerHTML = emptyHTML('🔍', 'Ничего не найдено');
    return;
  }
  container.innerHTML = list.map(g => simpleCardHTML(g, ACCENTS.grants)).join('');
}

function renderExtra() {
  const q = document.getElementById('extra-search').value.toLowerCase().trim();
  const list = state.extra.filter(x => {
    if (isExpiredSimple(x)) return false;
    if (q && !(x.name + ' ' + x.organizer).toLowerCase().includes(q)) return false;
    return true;
  });
  const container = document.getElementById('extra-container');
  if (!list.length) {
    container.innerHTML = emptyHTML('🔍', 'Ничего не найдено');
    return;
  }
  container.innerHTML = list.map(x => simpleCardHTML(x, ACCENTS.extra)).join('');
}

function simpleCardHTML(item, c) {
  const hasLink = /^https?:\/\//i.test(item.link);
  const titleHTML = hasLink
    ? `<a class="card-title-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>`
    : escapeHtml(item.name);

  const classes = ['card'];
  if (item.isHSE)     classes.push('card--hse');
  if (item.highlight) classes.push('card--highlighted');

  const badges = [];
  if (item.highlight) badges.push('<span class="new-badge">Новое</span>');
  if (item.isHSE)     badges.push('<span class="hse-badge">ВШЭ</span>');
  const badgesHTML = badges.length
    ? `<div class="card-badges">${badges.join('')}</div>`
    : '';

  return `
    <article class="${classes.join(' ')}" style="--card-accent:${c.accent}; --badge-bg:${c.bg}; --badge-fg:${c.fg};">
      ${badgesHTML}
      <h3 class="card-title">${titleHTML}</h3>
      <div class="card-info">
        ${item.organizer ? `<div><span class="icon">🏢</span><span>${escapeHtml(item.organizer)}</span></div>` : ''}
      </div>
      ${deadlineBlock(item)}
    </article>`;
}

/* ============================================================
 *  ОБЩИЙ БЛОК ДЕДЛАЙНА
 * ============================================================ */
function deadlineBlock(item) {
  const hasLink = /^https?:\/\//i.test(item.link || '');
  const dd = daysUntil(item.deadlineDate);
  const raw = item.deadlineRaw || '';

  let inner = '';

  if (!item.deadlineDate) {
    inner = `<span class="deadline-label">Приём заявок до</span> <span class="deadline-date muted">${escapeHtml(raw || 'не указан')}</span>`;
  } else if (dd < 0) {
    inner = `<span class="deadline-label">Приём заявок был до</span> <span class="deadline-date muted">${escapeHtml(raw)}</span>`;
  } else if (dd === 0) {
    inner = `<span class="deadline-label">Приём заявок до</span> <span class="deadline-date">${escapeHtml(raw)}</span> <span class="deadline-sep">·</span> <span class="deadline-when urgent">сегодня</span>`;
  } else if (dd === 1) {
    inner = `<span class="deadline-label">Приём заявок до</span> <span class="deadline-date">${escapeHtml(raw)}</span> <span class="deadline-sep">·</span> <span class="deadline-when urgent">завтра</span>`;
  } else {
    let cls;
    if (dd <= URGENT_DAYS)      cls = 'urgent';
    else if (dd <= SOON_DAYS)   cls = 'soon';
    else                        cls = 'calm';

    inner = `<span class="deadline-label">Приём заявок до</span> <span class="deadline-date">${escapeHtml(raw)}</span> <span class="deadline-sep">·</span> <span class="deadline-when ${cls}">через ${dd} дн.</span>`;
  }

  return `
    <div class="card-footer">
      <span class="deadline">⏰ ${inner}</span>
      ${hasLink ? `<a class="card-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">Сайт →</a>` : ''}
    </div>`;
}

function emptyHTML(emoji, text) {
  return `<div class="no-results">
    <span class="emoji">${emoji}</span>
    <div>${text}</div>
  </div>`;
}

/* ============================================================
 *  СКЕЛЕТОНЫ
 * ============================================================ */
function showSkeletons() {
  document.getElementById('events-container').innerHTML =
    Array.from({ length: 6 }, () => `<div class="skeleton"></div>`).join('');
  document.getElementById('grants-container').innerHTML =
    Array.from({ length: 3 }, () => `<div class="skeleton"></div>`).join('');
  document.getElementById('extra-container').innerHTML =
    Array.from({ length: 3 }, () => `<div class="skeleton"></div>`).join('');
}

/* ============================================================
 *  ИНИЦИАЛИЗАЦИЯ
 * ============================================================ */
function bindUI() {
  ['filter-type', 'filter-month', 'filter-search'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderEvents);
  });

  document.getElementById('clear-events').addEventListener('click', () => {
    ['filter-type', 'filter-month', 'filter-search'].forEach(id => {
      document.getElementById(id).value = '';
    });
    renderEvents();
  });

  document.getElementById('sort-date').addEventListener('click', function () {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    this.textContent = state.sortDir === 'asc' ? 'Дата ↑' : 'Дата ↓';
    renderEvents();
  });

  document.getElementById('grant-search').addEventListener('input', renderGrants);
  document.getElementById('extra-search').addEventListener('input', renderExtra);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('tab-' + this.dataset.tab).classList.add('active');

      applyTabTheme(this.dataset.tab);
    });
  });
}

applyTabTheme('events');
bindUI();
loadAll();
