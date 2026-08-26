const cfg = window.IS2_PROGRAM_CONFIG || {};
const $ = id => document.getElementById(id);
let rawRows = [];
let rows = [];
let detailsIndex = new Map();

function parseCSV(text) {
  const out = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && quoted && n === '"') { field += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) out.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); out.push(row); }
  if (!out.length) return [];
  const headers = out.shift().map(h => h.trim());
  return out.map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
}

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function normalize(r, idx) {
  return {
    key: `row-${idx}`,
    date: r['Date'] || '',
    day: r['Day'] || '',
    start: r['Start'] || '',
    end: r['End'] || '',
    session: r['Session title'] || '',
    type: r['Session type'] || '',
    track: r['Track'] || '',
    id: r['Submission ID'] || '',
    title: r['Contribution title'] || '',
    authors: r['Authors'] || '',
    location: r['Location'] || '',
    chair: r['Chair / contact'] || '',
    notes: r['Abstract / notes'] || '',
    visible: (r['Web visible'] || 'TRUE').toUpperCase() === 'TRUE',
    sort: Number(r['Sort order'] || 9999)
  };
}

function trackConfig(id) {
  return (cfg.tracks || []).find(t => t.id === id) || { id, label: id, className: '' };
}
function trackLabel(id) { return id ? trackConfig(id).label || id : ''; }
function trackClass(id) { return id ? trackConfig(id).className || '' : ''; }
function typeClass(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('keynote')) return 'type-keynote';
  if (t.includes('workshop')) return 'type-workshop';
  if (t === 'paper' || t.includes('oral')) return 'type-paper';
  if (t.includes('poster')) return 'type-poster';
  if (t.includes('demo')) return 'type-demo';
  if (t.includes('performance') || t.includes('installation')) return 'type-performance';
  if (t.includes('social')) return 'type-social';
  if (t.includes('lunch')) return 'type-lunch';
  if (t.includes('break') || t.includes('coffee')) return 'type-break';
  if (t.includes('opening') || t.includes('closing')) return 'type-ceremony';
  if (t.includes('registration')) return 'type-registration';
  return 'type-other';
}

function unique(field) {
  return [...new Set(rows.map(r => r[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}

function addOption(select, value, label = value) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
  select.appendChild(opt);
}

function buildFilters() {
  unique('day').forEach(v => addOption($('dayFilter'), v));
  unique('type').forEach(v => addOption($('typeFilter'), v));

  // Start from configured tracks so workshops are present even before scheduling,
  // then append any new track found in the Program sheet.
  const configuredIds = new Set();
  (cfg.tracks || []).forEach(t => {
    configuredIds.add(t.id);
    addOption($('trackFilter'), t.id, t.label || t.id);
  });
  unique('track').filter(id => !configuredIds.has(id)).forEach(id => addOption($('trackFilter'), id));

  unique('location').forEach(v => addOption($('locationFilter'), v));
}

function searchHaystack(r) {
  return [r.session, r.type, r.track, trackLabel(r.track), r.title, r.authors, r.location, r.chair, r.notes]
    .join(' ').toLowerCase();
}

function filteredRows() {
  const q = $('searchFilter').value.toLowerCase().trim();
  return rows.filter(r => r.visible)
    .filter(r => !$('dayFilter').value || r.day === $('dayFilter').value)
    .filter(r => !$('typeFilter').value || r.type === $('typeFilter').value)
    .filter(r => !$('trackFilter').value || r.track === $('trackFilter').value)
    .filter(r => !$('locationFilter').value || r.location === $('locationFilter').value)
    .filter(r => !q || searchHaystack(r).includes(q))
    .sort((a,b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.sort - b.sort);
}

function hasDetails(r) { return Boolean(r.title || r.authors || r.notes || r.chair); }

function isNow(r) {
  if (!r.date || !r.start || !r.end) return false;
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  if (r.date !== localDate) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  return mins >= toMins(r.start) && mins <= toMins(r.end);
}

function badges(r) {
  const parts = [];
  if (r.type) parts.push(`<span class="badge type-badge ${esc(typeClass(r.type))}">${esc(r.type)}</span>`);
  if (r.track) parts.push(`<span class="badge ${esc(trackClass(r.track))}">${esc(trackLabel(r.track))}</span>`);
  return parts.join('');
}

function card(r) {
  detailsIndex.set(r.key, r);
  const start = r.start || 'TBA';
  const end = r.end ? `<span class="end">to ${esc(r.end)}</span>` : '';
  const contribution = r.title ? `<h4>${esc(r.title)}</h4>${r.authors ? `<p class="authors">${esc(r.authors)}</p>` : ''}` : '';
  const meta = [
    r.location ? `<span>📍 ${esc(r.location)}</span>` : '',
    r.chair ? `<span>Chair: ${esc(r.chair)}</span>` : ''
  ].filter(Boolean).join('');
  const notes = r.notes ? `<p class="notes">${esc(r.notes)}</p>` : '';
  const detailButton = hasDetails(r) ? `<button class="details-button" type="button" data-details="${r.key}">Details</button>` : '';

  return `<article class="item ${esc(typeClass(r.type))} ${hasDetails(r)?'has-details':''} ${isNow(r)?'is-now':''}" data-row-key="${r.key}">
    <div class="time"><span>${esc(start)}</span>${end}</div>
    <div class="content">
      <div class="badges">${badges(r)}</div>
      <h3>${esc(r.session || r.title || r.type || 'Program item')}</h3>
      ${contribution}
      ${meta ? `<p class="meta">${meta}</p>` : ''}
      ${notes}
      ${detailButton}
    </div>
  </article>`;
}

function formatDate(date) {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00`));
  } catch { return date; }
}

function render() {
  detailsIndex = new Map();
  const data = filteredRows();
  const groups = new Map();
  data.forEach(r => {
    const key = `${r.date}|${r.day}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  $('status').textContent = `${data.length} program item${data.length === 1 ? '' : 's'}`;
  $('program').innerHTML = [...groups.entries()].map(([key, items]) => {
    const [date, day] = key.split('|');
    return `<section class="day" data-date="${esc(date)}">
      <div class="day-heading"><h2>${esc(day || date)}</h2><time datetime="${esc(date)}">${esc(formatDate(date))}</time></div>
      <div class="day-list">${items.map(card).join('')}</div>
    </section>`;
  }).join('') || '<p class="empty">No program items match these filters.</p>';

  document.querySelectorAll('[data-details]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation(); openDrawer(detailsIndex.get(btn.dataset.details));
  }));
  document.querySelectorAll('.item.has-details').forEach(item => item.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    openDrawer(detailsIndex.get(item.dataset.rowKey));
  }));

  updateFilterCount();
  updateNowButton();
}

function openDrawer(r) {
  if (!r) return;
  $('drawerBadges').innerHTML = badges(r);
  $('drawerContent').innerHTML = `
    <h2>${esc(r.title || r.session || r.type || 'Program item')}</h2>
    ${r.session && r.title ? `<p><strong>Session:</strong> ${esc(r.session)}</p>` : ''}
    ${r.authors ? `<h3>Authors</h3><p>${esc(r.authors)}</p>` : ''}
    ${(r.start || r.end || r.day || r.date) ? `<h3>When</h3><p>${esc([r.day, formatDate(r.date), r.start && r.end ? `${r.start}–${r.end}` : r.start].filter(Boolean).join(' · '))}</p>` : ''}
    ${r.location ? `<h3>Location</h3><p>${esc(r.location)}</p>` : ''}
    ${r.chair ? `<h3>Chair / contact</h3><p>${esc(r.chair)}</p>` : ''}
    ${r.notes ? `<h3>Details</h3><p>${esc(r.notes)}</p>` : ''}
    ${r.id ? `<p><small>Submission #${esc(r.id)}</small></p>` : ''}`;
  $('drawerBackdrop').hidden = false;
  $('detailsDrawer').classList.add('open');
  $('detailsDrawer').setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  $('detailsDrawer').classList.remove('open');
  $('detailsDrawer').setAttribute('aria-hidden','true');
  $('drawerBackdrop').hidden = true;
  document.body.style.overflow = '';
}

function activeFilterCount() {
  return ['dayFilter','typeFilter','trackFilter','locationFilter'].filter(id => $(id).value).length + ($('searchFilter').value.trim() ? 1 : 0);
}
function updateFilterCount() {
  const count = activeFilterCount();
  $('activeFilterCount').textContent = count;
  $('activeFilterCount').hidden = !count;
}

function clearFilters() {
  ['dayFilter','typeFilter','trackFilter','locationFilter'].forEach(id => $(id).value = '');
  $('searchFilter').value = '';
  render();
  closeFilters();
}

function openFilters() {
  $('filtersPanel').classList.add('open');
  $('openFilters').setAttribute('aria-expanded','true');
}
function closeFilters() {
  $('filtersPanel').classList.remove('open');
  $('openFilters').setAttribute('aria-expanded','false');
}

function updateNowButton() {
  const nowItem = document.querySelector('.item.is-now');
  $('jumpNow').hidden = !nowItem;
  $('jumpNow').onclick = nowItem ? () => nowItem.scrollIntoView({behavior:'smooth',block:'center'}) : null;
}

function initConfigText() {
  const c = cfg.conference || {};
  if (c.name) $('conferenceName').textContent = c.name;
  if (c.shortName) $('conferenceShortName').innerHTML = `${esc(c.shortName)} <span>Program</span>`;
  if (c.city) $('conferenceCity').textContent = c.city;
  if (c.dates) $('conferenceDates').textContent = c.dates;
  $('locationLegend').innerHTML = Object.entries(cfg.locations || {}).map(([k,v]) =>
    `<div><strong>${esc(k)}</strong><br><span>${esc(v)}</span></div>`).join('');
}

function bindUI() {
  ['dayFilter','typeFilter','trackFilter','locationFilter'].forEach(id => $(id).addEventListener('change', render));
  $('searchFilter').addEventListener('input', render);
  $('clearFilters').addEventListener('click', clearFilters);
  $('mobileClear').addEventListener('click', clearFilters);
  $('openFilters').addEventListener('click', openFilters);
  $('closeFilters').addEventListener('click', closeFilters);
  $('closeDrawer').addEventListener('click', closeDrawer);
  $('drawerBackdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeFilters(); } });

  $('comfortableView').addEventListener('click', () => {
    $('program').classList.remove('compact');
    $('comfortableView').classList.add('active'); $('compactView').classList.remove('active');
    localStorage.setItem('is2-density','comfortable');
  });
  $('compactView').addEventListener('click', () => {
    $('program').classList.add('compact');
    $('compactView').classList.add('active'); $('comfortableView').classList.remove('active');
    localStorage.setItem('is2-density','compact');
  });
  if (localStorage.getItem('is2-density') === 'compact') $('compactView').click();
}

async function init() {
  initConfigText();
  bindUI();

  if (!cfg.csvUrl || cfg.csvUrl.startsWith('PASTE_')) {
    $('status').innerHTML = 'Set <code>csvUrl</code> in <code>config.js</code> to your published Google Sheet CSV URL.';
    // Build track filter anyway so configuration can be checked immediately.
    (cfg.tracks || []).forEach(t => addOption($('trackFilter'), t.id, t.label || t.id));
    return;
  }

  try {
    const sep = cfg.csvUrl.includes('?') ? '&' : '?';
    const liveUrl = `${cfg.csvUrl}${sep}_=${Date.now()}`;
    const res = await fetch(liveUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csvText = await res.text();
    rawRows = parseCSV(csvText);
    rows = rawRows.map(normalize);
    console.info(`IEEE IS2 program: loaded ${rows.length} rows from Google Sheets`, cfg.csvUrl);
    buildFilters();
    render();
  } catch (e) {
    $('status').textContent = `Could not load program: ${e.message}`;
  }
}

init();
