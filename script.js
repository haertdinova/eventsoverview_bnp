/* ============================================================
 *  РЕНДЕР: МЕРОПРИЯТИЯ — список по месяцам
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

  /* Сортировка по дате начала */
  list.sort((a, b) => {
    const da = a.dateStart ? a.dateStart.getTime() : Infinity;
    const db = b.dateStart ? b.dateStart.getTime() : Infinity;
    return state.sortDir === 'asc' ? da - db : db - da;
  });

  const container = document.getElementById('events-container');
  container.className = 'events-list';

  if (!list.length) {
    container.innerHTML = emptyHTML('🔍', 'Ничего не найдено. Попробуйте изменить фильтры.');
    return;
  }

  /* Группируем по месяцу + году */
  const groups = new Map();
  list.forEach(e => {
    const key = e.dateStart
      ? `${MONTH_NAMES_NOM[e.dateStart.getMonth()]} ${e.dateStart.getFullYear()}`
      : 'Дата не указана';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  });

  /* Порядок групп: сначала все с датой (уже в правильном порядке),
     потом «Дата не указана» (если такие есть). */
  const keys = [...groups.keys()];
  keys.sort((a, b) => {
    if (a === 'Дата не указана') return 1;
    if (b === 'Дата не указана') return -1;
    const ia = MONTH_NAMES_NOM.findIndex(m => a.startsWith(m));
    const ib = MONTH_NAMES_NOM.findIndex(m => b.startsWith(m));
    const ya = +(a.match(/\d{4}/)?.[0] || 0);
    const yb = +(b.match(/\d{4}/)?.[0] || 0);
    if (ya !== yb) return ya - yb;
    return ia - ib;
  });

  let html = '';
  keys.forEach(key => {
    html += `
      <section class="month-group">
        <h2 class="month-heading">${escapeHtml(key)}</h2>
        <div class="event-list">
          ${groups.get(key).map(eventRowHTML).join('')}
        </div>
      </section>`;
  });

  container.innerHTML = html;
}

function eventRowHTML(e) {
  const hasLink = /^https?:\/\//i.test(e.link);
  const titleHTML = hasLink
    ? `<a href="${escapeHtml(e.link)}" target="_blank" rel="noopener">${escapeHtml(e.title)}</a>`
    : escapeHtml(e.title);

  const dd = daysUntil(e.deadlineDate);
  let dClass = '';
  let suffix = '';
  if (e.deadlineDate) {
    if (dd < 0) { dClass = 'past'; suffix = ' · просрочен'; }
    else if (dd === 0) { dClass = 'urgent'; suffix = ' · сегодня'; }
    else if (dd === 1) { dClass = 'urgent'; suffix = ' · завтра'; }
    else {
      if (dd <= 7) dClass = 'urgent';
      else if (dd <= 30) dClass = 'soon';
      suffix = ` · ${dd} дн.`;
    }
  }
  const deadlineLabel = e.deadlineRaw || '—';

  return `
    <article class="event-row${e.highlight ? ' event-row--highlighted' : ''}">
      <div class="event-row-date">${escapeHtml(e.dateRaw || '—')}</div>
      <div class="event-row-main">
        ${e.highlight ? '<div><span class="new-badge">Новое</span></div>' : ''}
        <h3 class="event-row-title">${titleHTML}</h3>
        ${e.organizer ? `<div class="event-row-org"><span class="icon">🏢</span><span>${escapeHtml(e.organizer)}</span></div>` : ''}
      </div>
      <div class="event-row-right">
        <span class="deadline ${dClass}">⏰ ${escapeHtml(deadlineLabel)}${suffix}</span>
        ${hasLink ? `<a class="card-link" href="${escapeHtml(e.link)}" target="_blank" rel="noopener">Сайт →</a>` : ''}
      </div>
    </article>`;
}
