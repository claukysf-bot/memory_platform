let AUTH_TOKEN = localStorage.getItem('memory_auth_token') || '';

function ensureAuth() {
  if (AUTH_TOKEN) return true;
  const token = prompt('Enter your memory token:');
  if (token) {
    AUTH_TOKEN = token;
    localStorage.setItem('memory_auth_token', token);
    return true;
  }
  return false;
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const now = new Date();
  // Use UTC+8
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  currentYear = utc8.getUTCFullYear();
  currentMonth = utc8.getUTCMonth();
  renderCalendar();
  loadMemories();
  loadCategories();
  loadStats();
});

// ─── Theme ───
function initTheme() {
  // Default to dark after 18:00 UTC+8
  const now = new Date();
  const utc8Hour = (now.getUTCHours() + 8) % 24;
  const saved = localStorage.getItem('theme');
  const prefersDark = saved === 'dark' || (!saved && (utc8Hour >= 18 || utc8Hour < 7));
  if (prefersDark) {
    document.body.classList.add('dark');
    document.getElementById('themeSun').style.display = 'none';
    document.getElementById('themeMoon').style.display = 'block';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  document.getElementById('themeSun').style.display = isDark ? 'none' : 'block';
  document.getElementById('themeMoon').style.display = isDark ? 'block' : 'none';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}


// ─── API ───
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? {'Authorization': 'Bearer ' + AUTH_TOKEN} : {}),
    },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (res.status === 401) {
    AUTH_TOKEN = '';
    localStorage.removeItem('memory_auth_token');
    toast('Token expired or invalid — please re-enter', 'error');
  }
  return data;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Nav Rail toggle (mobile) ───
function openNav() {
  document.getElementById('navRail').classList.add('mobile-open');
  document.getElementById('navBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNav() {
  const nav = document.getElementById('navRail');
  const backdrop = document.getElementById('navBackdrop');
  if (!nav.classList.contains('mobile-open')) return;
  
  nav.style.animation = 'slideLeft 0.2s ease forwards';
  backdrop.style.animation = 'fadeOut 0.2s ease forwards';
  
  setTimeout(() => {
    nav.classList.remove('mobile-open');
    backdrop.classList.remove('open');
    nav.style.animation = '';
    backdrop.style.animation = '';
    document.body.style.overflow = '';
  }, 200);
}

function toggleNavRail() {
  const nav = document.getElementById('navRail');
  if (nav.classList.contains('mobile-open')) {
    closeNav();
  } else {
    openNav();
  }
}

// ─── Page switching ───
function switchPage(page) {
  // Hide all pages
  document.getElementById('pageMemory').style.display = 'none';
  document.getElementById('pagePeriod').style.display = 'none';
  document.getElementById('pageJournal').style.display = 'none';
  document.getElementById('pageMood').style.display = 'none';
  document.getElementById('pageTasks').style.display = 'none';
  // Deactivate all nav items
  document.querySelectorAll('.nav-rail-item').forEach(el => el.classList.remove('active'));
  
  const actionBtn = document.getElementById('headerAction');
  
  if (page === 'memory') {
    document.getElementById('pageMemory').style.display = 'block';
    document.getElementById('navMemory').classList.add('active');
    actionBtn.textContent = '+ New Memory';
    actionBtn.onclick = () => openModal();
    actionBtn.style.display = '';
  } else if (page === 'period') {
    document.getElementById('pagePeriod').style.display = 'block';
    document.getElementById('navPeriod').classList.add('active');
    actionBtn.style.display = 'none';
  } else if (page === 'journal') {
    document.getElementById('pageJournal').style.display = 'block';
    document.getElementById('navJournal').classList.add('active');
    actionBtn.style.display = 'none';
    initJournalPage();
  } else if (page === 'mood') {
    document.getElementById('pageMood').style.display = 'block';
    document.getElementById('navMood').classList.add('active');
    actionBtn.style.display = 'none';
    initMoodPage();
  } else if (page === 'tasks') {
    document.getElementById('pageTasks').style.display = 'block';
    document.getElementById('navTasks').classList.add('active');
    actionBtn.textContent = '+ New Task';
    actionBtn.onclick = () => openTaskModal();
    actionBtn.style.display = '';
    initTasksPage();
  }
  
  // Close mobile nav
  closeNav();
}

// ─── Filter Panel ───
function toggleFilterPanel() {
  const panel = document.getElementById('filterPanel');
  panel.classList.toggle('open');
}

// Close filter panel on outside click
document.addEventListener('click', (e) => {
  const panel = document.getElementById('filterPanel');
  const btn = document.getElementById('filterPanelBtn');
  if (panel && panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn) {
    panel.classList.remove('open');
  }
});


// ─── Toast ───
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Touch swipe for mobile nav ───
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  // Don't trigger nav swipe when inside a modal
  if (e.target.closest('.modal-overlay')) return;
  
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const dx = touchEndX - touchStartX;
  const dy = Math.abs(touchEndY - touchStartY);
  
  // Only trigger on horizontal swipes (dx > 60px, not too vertical)
  if (dy > 80) return;
  
  const nav = document.getElementById('navRail');
  if (dx > 60) {
    // Swipe right anywhere → open
    openNav();
  } else if (dx < -60 && nav.classList.contains('mobile-open')) {
    // Swipe left → close
    closeNav();
  }
}, { passive: true });
