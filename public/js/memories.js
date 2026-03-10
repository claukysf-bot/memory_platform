let currentYear, currentMonth; // 0-indexed month
let selectedDate = null;
let selectedCategory = null;
let searchQuery = '';
let calendarData = {};
let editingId = null;
let deletingId = null;
let categories = [];
let searchTimeout = null;

// ─── Calendar ───
function renderCalendar() {
  const grid = document.getElementById('calGrid');
  document.getElementById('calTitle').textContent = `${MONTHS[currentMonth]} ${currentYear}`;

  // Monday-start: getDay() 0=Sun→6, 1=Mon→0, ...
  const firstDay = new Date(currentYear, currentMonth, 1);
  const startWeekday = firstDay.getDay(); // Sunday=0
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();

  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStr = utc8.toISOString().split('T')[0];

  let html = WEEKDAYS.map(d => `<div class="cal-weekday">${d}</div>`).join('');

  // Previous month filler
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    html += `<div class="cal-day other-month">${d}</div>`;
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const hasMem = calendarData[dateStr];
    const classes = ['cal-day'];
    if (isToday) classes.push('today');
    if (isSelected) classes.push('selected');
    if (hasMem) classes.push('has-memory');
    const dot = hasMem ? '<div class="dot"></div>' : '';
    html += `<div class="${classes.join(' ')}" onclick="selectDate('${dateStr}')">${d}${dot}</div>`;
  }

  // Next month filler
  const totalCells = startWeekday + daysInMonth;
  const remaining = (7 - totalCells % 7) % 7;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month">${d}</div>`;
  }

  grid.innerHTML = html;
  loadCalendarData();
}

async function loadCalendarData() {
  const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const res = await api(`/memories/calendar/${ym}`);
  if (res.ok) {
    calendarData = {};
    for (const row of res.data) {
      calendarData[row.date] = row.count;
    }
    // Re-render to add dots
    const days = document.querySelectorAll('.cal-day:not(.other-month):not(.cal-weekday)');
    days.forEach(el => {
      const d = parseInt(el.textContent);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (calendarData[dateStr]) {
        el.classList.add('has-memory');
        if (!el.querySelector('.dot')) {
          el.insertAdjacentHTML('beforeend', '<div class="dot"></div>');
        }
      }
    });
  }
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
}

function goToday() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  currentYear = utc8.getUTCFullYear();
  currentMonth = utc8.getUTCMonth();
  selectedDate = utc8.toISOString().split('T')[0];
  renderCalendar();
  loadMemories();
}

function selectDate(dateStr) {
  if (selectedDate === dateStr) {
    selectedDate = null;
  } else {
    selectedDate = dateStr;
  }
  renderCalendar();
  loadMemories();
}

// ─── Memories ───
async function loadMemories() {
  const list = document.getElementById('memoryList');
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  let params = new URLSearchParams();
  if (selectedDate) params.set('date', selectedDate);
  if (selectedCategory) params.set('category', selectedCategory);
  if (searchQuery) params.set('q', searchQuery);

  const title = document.getElementById('mainTitle');
  const subtitle = document.getElementById('mainSubtitle');

  if (selectedDate) {
    const d = new Date(selectedDate + 'T00:00:00');
    title.textContent = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } else if (searchQuery) {
    title.textContent = `Search: "${searchQuery}"`;
  } else if (selectedCategory) {
    title.textContent = `Category: ${selectedCategory}`;
  } else {
    title.textContent = 'All Memories';
  }

  const res = await api(`/memories?${params.toString()}`);
  if (!res.ok) {
    list.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${res.error}</p></div>`;
    return;
  }

  subtitle.textContent = `${res.total} memor${res.total === 1 ? 'y' : 'ies'}`;

  if (res.data.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">🌙</div>
        <h3>No memories here yet</h3>
        <p>${selectedDate ? 'Nothing recorded for this date.' : 'Start capturing moments.'}</p>
      </div>`;
    return;
  }

  list.innerHTML = res.data.map(m => renderMemoryCard(m)).join('');
}

function renderMemoryCard(m) {
  const dots = Array.from({length: 5}, (_, i) =>
    `<div class="importance-dot ${i < m.importance ? 'filled' : ''}"></div>`
  ).join('');

  const keywords = m.keywords.map(k => `<span class="keyword-tag">${k}</span>`).join('');
  const source = m.source ? `<div class="memory-source">via ${m.source}</div>` : '';
  const timeStr = m.time ? ` ${m.time}` : '';

  return `
    <div class="memory-card" data-id="${m.id}">
      <div class="memory-card-header">
        <div class="memory-meta">
          <span class="memory-date">${m.date}${timeStr}</span>
          <span class="memory-category">${m.category}</span>
          <div class="importance-dots">${dots}</div>
        </div>
        <div class="memory-actions">
          <button class="btn btn-ghost btn-sm" onclick="editMemory(${m.id})">Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteMemory(${m.id})">Delete</button>
        </div>
      </div>
      <div class="memory-content">${escapeHtml(m.content)}</div>
      <div class="memory-keywords">${keywords}</div>
      ${source}
    </div>`;
}

// ─── Categories ───
async function loadCategories() {
  const res = await api('/memories/categories');
  if (!res.ok) return;
  categories = res.data;
  const container = document.getElementById('categoryFilters');
  const datalist = document.getElementById('categoryList');
  
  container.innerHTML = res.data.map(c =>
    `<span class="filter-tag ${selectedCategory === c.category ? 'active' : ''}" 
          onclick="filterCategory('${c.category}')">${c.category} (${c.count})</span>`
  ).join('');

  datalist.innerHTML = res.data.map(c => `<option value="${c.category}">`).join('');
}

function filterCategory(cat) {
  selectedCategory = selectedCategory === cat ? null : cat;
  loadCategories();
  loadMemories();
}

// ─── Stats ───
async function loadStats() {
  const res = await api('/stats');
  if (!res.ok) return;
  document.getElementById('statTotal').textContent = res.data.total;
  document.getElementById('statCategories').textContent = res.data.categories;
}

// ─── Search ───
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = document.getElementById('searchInput').value.trim();
    loadMemories();
  }, 300);
}

// ─── Filters ───
function clearFilters() {
  selectedDate = null;
  selectedCategory = null;
  searchQuery = '';
  document.getElementById('searchInput').value = '';
  renderCalendar();
  loadCategories();
  loadMemories();
}

// ─── Modal ───
function openModal(id = null) {
  editingId = id;
  document.getElementById('modalTitle').textContent = id ? 'Edit Memory' : 'New Memory';
  document.getElementById('formSubmit').textContent = id ? 'Update' : 'Save';
  
  if (id) {
    // Load existing memory
    api(`/memories/${id}`).then(res => {
      if (res.ok) {
        const m = res.data;
        document.getElementById('formDate').value = m.date;
        document.getElementById('formTime').value = m.time || '';
        document.getElementById('formContent').value = m.content;
        document.getElementById('formCategory').value = m.category;
        document.getElementById('formImportance').value = m.importance;
        document.getElementById('formKeywords').value = m.keywords.join(', ');
        document.getElementById('formSource').value = m.source || '';
      }
    });
  } else {
    // Default to today (UTC+8)
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    document.getElementById('formDate').value = selectedDate || utc8.toISOString().split('T')[0];
    document.getElementById('formTime').value = '';
    document.getElementById('formContent').value = '';
    document.getElementById('formCategory').value = '';
    document.getElementById('formImportance').value = '3';
    document.getElementById('formKeywords').value = '';
    document.getElementById('formSource').value = '';
  }
  
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
}

function closeModalOverlay(e) {
  if (e.target === e.currentTarget) closeModal();
}

async function submitMemory() {
  if (!ensureAuth()) return toast('Authentication required', 'error');
  const data = {
    date: document.getElementById('formDate').value,
    time: document.getElementById('formTime').value || null,
    content: document.getElementById('formContent').value,
    category: document.getElementById('formCategory').value || 'general',
    importance: parseInt(document.getElementById('formImportance').value),
    keywords: document.getElementById('formKeywords').value.split(',').map(s => s.trim()).filter(Boolean),
    source: document.getElementById('formSource').value || null,
  };

  if (!data.date || !data.content) {
    toast('Date and content are required', 'error');
    return;
  }

  let res;
  if (editingId) {
    res = await api(`/memories/${editingId}`, { method: 'PUT', body: data });
  } else {
    res = await api('/memories', { method: 'POST', body: data });
  }

  if (res.ok) {
    toast(editingId ? 'Memory updated' : 'Memory created', 'success');
    closeModal();
    loadMemories();
    loadCalendarData();
    loadCategories();
    loadStats();
  } else {
    toast(res.error || 'Failed to save', 'error');
  }
}

// ─── Edit/Delete ───
function editMemory(id) {
  openModal(id);
}

function deleteMemory(id) {
  deletingId = id;
  document.getElementById('deleteOverlay').classList.add('open');
}

function closeDelete() {
  document.getElementById('deleteOverlay').classList.remove('open');
  deletingId = null;
}

function closeDeleteOverlay(e) {
  if (e.target === e.currentTarget) closeDelete();
}

async function confirmDelete() {
  if (!deletingId) return;
  if (!ensureAuth()) return toast('Authentication required', 'error');
  const res = await api(`/memories/${deletingId}`, { method: 'DELETE' });
  if (res.ok) {
    toast('Memory deleted', 'success');
    closeDelete();
    loadMemories();
    loadCalendarData();
    loadCategories();
    loadStats();
  } else {
    toast(res.error || 'Failed to delete', 'error');
  }
}
