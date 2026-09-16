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
 *  ЦВЕТА РАЗДЕЛОВ
 * ============================================================ */
const ACCENTS = {
  events: { accent: '#4f46e5', bg: '#eef2ff', fg: '#4338ca' },
  grants: { accent: '#059669', bg: '#ecfdf5', fg: '#047857' },
  extra:  { accent: '#d97706', bg: '#fffbeb', fg: '#b45309' },
};

/* ============================================================
 *  ЗАГРУЗКА CSV ИЗ GOOGLE SHEETS
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
const MONTH_NAMES = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
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

function daysUntil(date) {
  if (!date) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* ============================================================
 *  ОПРЕДЕЛЕНИЕ ТИПА ПО НАЗВАНИЮ
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
function normalizeEvent(row) {
  const title     = row['Название мероприятия'] || row['Название'] || '';
  const dateStr   = row['Даты проведения'] || '';
  const deadlineS = row['Дедлайн подачи заявок'] || '';
  return {
    title,
    link:         row['Ссылка на сайт'] || '',
    dateRaw:      dateStr,
    dateStart:    parseRussianDate(dateStr),
    organizer:    row['Организатор'] || '',
    deadlineRaw:  deadlineS,
    deadlineDate: parseRussianDate(deadlineS),
    type:         detectType(title),
  };
}

function normalizeSimple(row) {
  const deadlineS = row['Дедлайн'] || '';
  return {
    name:         row['Название'] || row['Наименование'] || '',
    deadlineRaw:  deadlineS,
    deadlineDate: parseRussianDate(deadlineS),
    organizer:    row['Организатор'] || '',
    link:         row['Ссылка'] || '',
  };
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

    document.getElementById('count-events').textContent = state.events.length;
    document.getElementById('count-grants').textContent = state.grants.length;
    document.getElementById('count-extra').textContent  = state.extra.length;

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

/* ============================================================
 *  ФИЛЬТРЫ
 * ============================================================ */
function populateFilters() {
  const types = [...new Set(state.events.map(e => e.type).filter(Boolean))].sort();

  const months = [...new Set(
    state.events.filter(e => e.dateStart).map(e => MONTH_NAMES[e.dateStart.getMonth()])
  )].sort((a, b) => MONTH_NAMES.indexOf(a) - MONTH_NAMES.indexOf(b));

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
    if (type && e.type !== type) return false;
    if (month && (!e.dateStart || MONTH_NAMES[e.dateStart.getMonth()] !== month)) return false;
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

  return `
    <article class="card" style="--card-accent:${c.accent}; --badge-bg:${c.bg}; --badge-fg:${c.fg};">
      <div class="card-header">
        <span class="type-badge">${escapeHtml(e.type)}</span>
      </div>
      <h3 class="card-title">${titleHTML}</h3>
      <div class="card-info">
        ${e.dateRaw   ? `<div><span class="icon">📅</span><span>${escapeHtml(e.dateRaw)}</span></div>` : ''}
        ${e.organizer ? `<div><span class="icon">🏛</span><span>${escapeHtml(e.organizer)}</span></div>` : ''}
      </div>
      ${deadlineBlock(e)}
    </article>`;
}

/* ============================================================
 *  РЕНДЕР: ГРАНТЫ И ДОПОЛНИТЕЛЬНО
 * ============================================================ */
function renderGrants() {
  const q = document.getElementById('grant-search').value.toLowerCase().trim();
  const list = state.grants.filter(g =>
    !q || (g.name + ' ' + g.organizer).toLowerCase().includes(q)
  );
  const container = document.getElementById('grants-container');
  if (!list.length) {
    container.innerHTML = emptyHTML('🔍', 'Ничего не найдено');
    return;
  }
  container.innerHTML = list.map(g => simpleCardHTML(g, 'Грант', ACCENTS.grants)).join('');
}

function renderExtra() {
  const q = document.getElementById('extra-search').value.toLowerCase().trim();
  const list = state.extra.filter(x =>
    !q || (x.name + ' ' + x.organizer).toLowerCase().includes(q)
  );
  const container = document.getElementById('extra-container');
  if (!list.length) {
    container.innerHTML = emptyHTML('🔍', 'Ничего не найдено');
    return;
  }
  container.innerHTML = list.map(x => simpleCardHTML(x, 'Возможность', ACCENTS.extra)).join('');
}

function simpleCardHTML(item, badgeLabel, c) {
  const hasLink = /^https?:\/\//i.test(item.link);
  const titleHTML = hasLink
    ? `<a class="card-title-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>`
    : escapeHtml(item.name);

  return `
    <article class="card" style="--card-accent:${c.accent}; --badge-bg:${c.bg}; --badge-fg:${c.fg};">
      <div class="card-header">
        <span class="type-badge">${escapeHtml(badgeLabel)}</span>
      </div>
      <h3 class="card-title">${titleHTML}</h3>
      <div class="card-info">
        ${item.organizer ? `<div><span class="icon">🏛</span><span>${escapeHtml(item.organizer)}</span></div>` : ''}
      </div>
      ${deadlineBlock(item)}
    </article>`;
}

/* ============================================================
 *  ОБЩИЙ БЛОК ДЕДЛАЙНА
 * ============================================================ */
function deadlineBlock(item) {
  const dd = daysUntil(item.deadlineDate);
  let dClass = '';
  if (item.deadlineDate) {
    if (dd < 0) dClass = 'past';
    else if (dd <= 7) dClass = 'urgent';
    else if (dd <= 30) dClass = 'soon';
  }
  const deadlineLabel = item.deadlineRaw || 'не указан';
  const deadlineSuffix = (item.deadlineDate && dd >= 0 && dd <= 60) ? ` · ${dd} дн.` : '';
  const hasLink = /^https?:\/\//i.test(item.link || '');

  return `
    <div class="card-footer">
      <span class="deadline ${dClass}">⏰ Дедлайн: ${escapeHtml(deadlineLabel)}${deadlineSuffix}</span>
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
    });
  });
}

bindUI();
loadAll();
