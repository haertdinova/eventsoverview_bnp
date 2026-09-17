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
const URGENT_DAYS = 10;
const WEEK_DAYS   = 7;

/* ============================================================
 *  ВШЭ
 * ============================================================ */
const HSE_MARKERS = [
  'ВШЭ',
  'Высшей школы экономики',
  'Высшая школа экономики',
];

function isHSEOrganizer(organizer) {
  if (!organizer) return false;
  const o = organizer.toLowerCase();
  return HSE_MARKERS.some(m => o.includes(m.toLowerCase()));
}

function splitOrganizers(organizer) {
  if (!organizer) return [];
  return organizer.split(';').map(s => s.trim()).filter(Boolean);
}

/* ============================================================
 *  СКЛОНЕНИЯ
 * ============================================================ */
function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/* ============================================================
 *  ЦВЕТА РАЗДЕЛОВ
 * ============================================================ */
const ACCENTS = {
  events: { accent: '#102D69', bg: '#EDF1F9', fg: '#0A1F4A' },
  grants: { accent: '#0E7C66', bg: '#ECF5EF', fg: '#0A5C4B' },
  extra:  { accent: '#C75B12', bg: '#FAF0E6', fg: '#9C4409' },
};

function applyTabTheme(tab) {
  const c = ACCENTS[tab];
  if (!c) return;
  const root = document.documentElement;
  root.style.setProperty('--tab-accent', c.accent);
  root.style.setProperty('--tab-bg',     c.bg);
  root.style.setProperty('--tab-fg',     c.fg);
  root.style.setProperty('--bg',         c.bg);
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

/* Приводит все виды двойных кавычек к типографским:
 * 1-й уровень — «ёлочки», 2-й — „лапки", 3-й — снова «ёлочки» и т. д. */
function normalizeQuotes(str) {
  if (str == null) return '';
  let s = String(str);

  /* Унифицируем все варианты двойных кавычек к прямому символу */
  s = s.replace(/[«»""„"‟″]/g, '"');

  /* Чередуем пары: 1 — ёлочки, 2 — лапки, 3 — снова ёлочки, 4 — снова лапки… */
  const pairs = [
    ['«', '»'],
    ['„', '"'],
  ];
  let idx = 0;
  s = s.replace(/"/g, () => {
    const pair = pairs[Math.floor(idx / 2) % pairs.length];
    const ch = idx % 2 === 0 ? pair[0] : pair[1];
    idx++;
    return ch;
  });
  return s;
}

function escapeHtml(s) {
  const normalized = normalizeQuotes(s);
  return normalized.replace(/[&<>"']/g, c =>
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
  showOnlyNew: false,
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
    organizersList: splitOrganizers(organizer),
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
    organizersList: splitOrganizers(organizer),
    link:         row['Ссылка на сайт'] || row['Ссылка'] || '',
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
    updateHeroStats();
    populateFilters();
    populateOrganizerDatalist();
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
 *  СТАТИСТИКА В ШАПКЕ
 * ============================================================ */
function updateHeroStats() {
  const eventsCount = state.events.filter(e => !isExpiredEvent(e)).length;
  const grantsCount = state.grants.filter(g => !isExpiredSimple(g)).length;
  const extraCount  = state.extra.filter(x => !isExpiredSimple(x)).length;

  const allActual = [
    ...state.events.filter(e => !isExpiredEvent(e)),
    ...state.grants.filter(g => !isExpiredSimple(g)),
    ...state.extra.filter(x => !isExpiredSimple(x)),
  ];
  const urgentCount = allActual.filter(item => {
    const dd = daysUntil(item.deadlineDate);
    return dd >= 0 && dd <= WEEK_DAYS;
  }).length;

  const parts = [
    `${eventsCount} ${plural(eventsCount, 'мероприятие', 'мероприятия', 'мероприятий')}`,
    `${grantsCount} ${plural(grantsCount, 'грант', 'гранта', 'грантов')}`,
    `${extraCount} ${plural(extraCount, 'возможность', 'возможности', 'возможностей')}`,
  ];
  if (urgentCount > 0) {
    parts.push(
      `<strong>${urgentCount} ${plural(urgentCount, 'срочный дедлайн', 'срочных дедлайна', 'срочных дедлайнов')}</strong>`
    );
  }

  document.getElementById('hero-stats').innerHTML =
    parts.join('<span class="sep">·</span>');
}

/* ============================================================
 *  ФИЛЬТРЫ
 * ============================================================ */
function populateFilters() {
  const actualEvents = state.events.filter(e => !isExpiredEvent(e));

  const types = [...new Set(actualEvents.map(e => e.type).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ru'));

  const monthIdxSet = new Set(
    actualEvents.filter(e => e.dateStart).map(e => e.dateStart.getMonth())
  );
  const months = [...monthIdxSet]
    .sort((a, b) => a - b)
    .map(idx => MONTH_NAMES_NOM[idx]);

  fillSelect('filter-type', types, 'Все типы');
  fillSelect('filter-month', months, 'Все месяцы');
}

function populateOrganizerDatalist() {
  const actualEvents = state.events.filter(e => !isExpiredEvent(e));
  const orgSet = new Set();
  actualEvents.forEach(e => {
    (e.organizersList || []).forEach(o => orgSet.add(o));
  });
  const organizers = [...orgSet].sort((a, b) => a.localeCompare(b, 'ru'));

  const datalist = document.getElementById('organizers-list');
  datalist.innerHTML = organizers
    .map(o => `<option value="${escapeHtml(o)}"></option>`)
    .join('');
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
 *  СОРТИРОВКА
 * ============================================================ */
function sortEvents(list, mode) {
  const t = d => d ? d.getTime() : null;

  const byDate = (a, b, dir) => {
    const da = t(a.dateStart), db = t(b.dateStart);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return dir === 'asc' ? da - db : db - da;
  };

  const byDeadline = (a, b, dir) => {
    const da = t(a.deadlineDate), db = t(b.deadlineDate);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return dir === 'asc' ? da - db : db - da;
  };

  const byName = (a, b, dir) => {
    const r = a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' });
    return dir === 'asc' ? r : -r;
  };

  switch (mode) {
    case 'date-asc':      return list.sort((a, b) => byDate(a, b, 'asc'));
    case 'date-desc':     return list.sort((a, b) => byDate(a, b, 'desc'));
    case 'deadline-asc':  return list.sort((a, b) => byDeadline(a, b, 'asc'));
    case 'deadline-desc': return list.sort((a, b) => byDeadline(a, b, 'desc'));
    case 'name-asc':      return list.sort((a, b) => byName(a, b, 'asc'));
    case 'name-desc':     return list.sort((a, b) => byName(a, b, 'desc'));
    default:              return list;
  }
}

/* ============================================================
 *  РЕНДЕР: МЕРОПРИЯТИЯ
 * ============================================================ */
function renderEvents() {
  const type      = document.getElementById('filter-type').value;
  const month     = document.getElementById('filter-month').value;
  const organizer = document.getElementById('filter-organizer').value.trim().toLowerCase();
  const sortBy    = document.getElementById('sort-by').value;
  const q         = document.getElementById('filter-search').value.toLowerCase().trim();

  let list = state.events.filter(e => {
    if (isExpiredEvent(e)) return false;
    if (state.showOnlyNew && !e.highlight) return false;
    if (type && e.type !== type) return false;
    if (organizer) {
      const match = (e.organizersList || []).some(o => o.toLowerCase().includes(organizer));
      if (!match) return false;
    }
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

  sortEvents(list, sortBy);

  const n = list.length;
  document.getElementById('result-count').textContent =
    n === 0 ? 'Ничего не найдено'
            : `Найдено: ${n} ${plural(n, 'мероприятие', 'мероприятия', 'мероприятий')}`;

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

  const titleClass = `card-title-link${e.isHSE ? ' title-hse' : ''}`;
  const titleHTML = hasLink
    ? `<a class="${titleClass}" href="${escapeHtml(e.link)}" target="_blank" rel="noopener">${escapeHtml(e.title)}</a>`
    : `<span class="${e.isHSE ? 'title-hse' : ''}">${escapeHtml(e.title)}</span>`;

  return `
    <article class="card${e.highlight ? ' card--highlighted' : ''}" style="--card-accent:${c.accent}; --badge-bg:${c.bg}; --badge-fg:${c.fg};">
      ${e.highlight ? '<span class="new-badge">Новое</span>' : ''}
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

  const titleClass = `card-title-link${item.isHSE ? ' title-hse' : ''}`;
  const titleHTML = hasLink
    ? `<a class="${titleClass}" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>`
    : `<span class="${item.isHSE ? 'title-hse' : ''}">${escapeHtml(item.name)}</span>`;

  return `
    <article class="card${item.highlight ? ' card--highlighted' : ''}" style="--card-accent:${c.accent}; --badge-bg:${c.bg}; --badge-fg:${c.fg};">
      ${item.highlight ? '<span class="new-badge">Новое</span>' : ''}
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
    const cls = dd <= URGENT_DAYS ? 'urgent' : '';
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
function skeletonCard() {
  return `<div class="skeleton-card">
    <div class="skeleton-line" style="width:55%"></div>
    <div class="skeleton-line" style="width:95%"></div>
    <div class="skeleton-line" style="width:80%"></div>
    <div class="skeleton-line" style="width:40%; margin-top:auto;"></div>
  </div>`;
}

function showSkeletons() {
  document.getElementById('events-container').innerHTML =
    Array.from({ length: 6 }, skeletonCard).join('');
  document.getElementById('grants-container').innerHTML =
    Array.from({ length: 3 }, skeletonCard).join('');
  document.getElementById('extra-container').innerHTML =
    Array.from({ length: 3 }, skeletonCard).join('');
}

/* ============================================================
 *  ИНИЦИАЛИЗАЦИЯ
 * ============================================================ */
function bindUI() {
  ['filter-type', 'filter-month', 'filter-organizer', 'sort-by', 'filter-search']
    .forEach(id => {
      document.getElementById(id).addEventListener('input', renderEvents);
    });

  document.getElementById('clear-events').addEventListener('click', () => {
    ['filter-type', 'filter-month', 'filter-organizer', 'filter-search']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('sort-by').value = 'date-asc';
    state.showOnlyNew = false;
    document.getElementById('filter-new-only').classList.remove('active');
    renderEvents();
  });

  document.getElementById('filter-new-only').addEventListener('click', function () {
    state.showOnlyNew = !state.showOnlyNew;
    this.classList.toggle('active', state.showOnlyNew);
    renderEvents();
  });

  document.getElementById('filters-toggle').addEventListener('click', function () {
    document.getElementById('filters-events').classList.toggle('open');
    this.classList.toggle('open');
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
