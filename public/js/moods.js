// ─── Mood Tracker ───
const MOODS = [
  { key: 'happy', label: 'Happy', emoji: 'Smiling face with smiling eyes', file: 'smiling_face_with_smiling_eyes_3d.png' },
  { key: 'excited', label: 'Excited', emoji: 'Star-struck', file: 'star-struck_3d.png' },
  { key: 'loved', label: 'Loved', emoji: 'Smiling face with hearts', file: 'smiling_face_with_hearts_3d.png' },
  { key: 'calm', label: 'Calm', emoji: 'Relieved face', file: 'relieved_face_3d.png' },
  { key: 'silly', label: 'Silly', emoji: 'Zany face', file: 'zany_face_3d.png' },
  { key: 'tired', label: 'Tired', emoji: 'Sleeping face', file: 'sleeping_face_3d.png' },
  { key: 'sad', label: 'Sad', emoji: 'Crying face', file: 'crying_face_3d.png' },
  { key: 'angry', label: 'Angry', emoji: 'Pouting face', file: 'pouting_face_3d.png' },
  { key: 'anxious', label: 'Anxious', emoji: 'Anxious face with sweat', file: 'anxious_face_with_sweat_3d.png' },
  { key: 'meh', label: 'Meh', emoji: 'Neutral face', file: 'neutral_face_3d.png' },
  { key: 'thinking', label: 'Thinking', emoji: 'Thinking face', file: 'thinking_face_3d.png' },
  { key: 'crying', label: 'Sobbing', emoji: 'Loudly crying face', file: 'loudly_crying_face_3d.png' },
];

function moodImgUrl(file) {
  return `/emoji/${file}`;
}

let moodYear, moodMonth;
let moodData = {};
let moodPickerDate = null;
let moodPickerPerson = null;
let moodPickerSelected = null;

function initMoodPage() {
  if (!moodYear) {
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    moodYear = utc8.getUTCFullYear();
    moodMonth = utc8.getUTCMonth();
  }
  renderMoodCalendar();
}

function moodChangeMonth(delta) {
  moodMonth += delta;
  if (moodMonth > 11) { moodMonth = 0; moodYear++; }
  if (moodMonth < 0) { moodMonth = 11; moodYear--; }
  renderMoodCalendar();
}

function moodGoToday() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  moodYear = utc8.getUTCFullYear();
  moodMonth = utc8.getUTCMonth();
  renderMoodCalendar();
}

async function renderMoodCalendar() {
  const grid = document.getElementById('moodGrid');
  const ym = `${moodYear}-${String(moodMonth + 1).padStart(2, '0')}`;
  document.getElementById('moodCalTitle').textContent = `${MONTHS[moodMonth]} ${moodYear}`;
  
  // Load mood data
  const res = await api(`/moods/calendar/${ym}`);
  if (res.ok) moodData = res.data;
  
  const firstDay = new Date(moodYear, moodMonth, 1);
  const startWeekday = firstDay.getDay(); // Sunday=0
  const daysInMonth = new Date(moodYear, moodMonth + 1, 0).getDate();
  const daysInPrev = new Date(moodYear, moodMonth, 0).getDate();
  
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStr = utc8.toISOString().split('T')[0];
  
  let html = WEEKDAYS.map(d => `<div class="mood-cal-weekday">${d}</div>`).join('');
  
  // Previous month filler
  for (let i = startWeekday - 1; i >= 0; i--) {
    html += `<div class="mood-cal-day other-month"><span class="day-num">${daysInPrev - i}</span></div>`;
  }
  
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${moodYear}-${String(moodMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const dayData = moodData[dateStr] || {};
    const rosaMood = dayData.rosa;
    const claudeMood = dayData.claude;
    
    const rosaEmoji = rosaMood ? MOODS.find(m => m.key === rosaMood.mood) : null;
    const claudeEmoji = claudeMood ? MOODS.find(m => m.key === claudeMood.mood) : null;
    
    html += `<div class="mood-cal-day ${isToday ? 'today' : ''}" onclick="openMoodDayPicker('${dateStr}')">
      <span class="day-num">${d}</span>
      <div class="mood-pair">
        ${rosaEmoji ? `<img src="/emoji/${rosaEmoji.file}" alt="${rosaEmoji.label}">` : '<div class="mood-dot"></div>'}
        ${claudeEmoji ? `<img src="/emoji/${claudeEmoji.file}" alt="${claudeEmoji.label}">` : '<div class="mood-dot"></div>'}
      </div>
      ${rosaMood?.note ? `<div class="mood-note">${escapeHtml(rosaMood.note)}</div>` : ''}
      ${claudeMood?.note ? `<div class="mood-note">${escapeHtml(claudeMood.note)}</div>` : ''}
    </div>`;
  }
  
  // Next month filler
  const totalCells = startWeekday + daysInMonth;
  const remaining = (7 - totalCells % 7) % 7;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="mood-cal-day other-month"><span class="day-num">${d}</span></div>`;
  }
  
  grid.innerHTML = html;
  document.getElementById('moodSubtitle').textContent = `${Object.keys(moodData).length} days logged`;
}

function openMoodDayPicker(dateStr) {
  // Show picker asking which person
  moodPickerDate = dateStr;
  const dayData = moodData[dateStr] || {};
  
  // If neither has a mood, default to rosa
  // If one has a mood, open the other
  // If both have moods, show rosa's for editing
  if (!dayData.rosa) {
    openMoodPicker(dateStr, 'rosa');
  } else if (!dayData.claude) {
    openMoodPicker(dateStr, 'claude');
  } else {
    // Both set — let user pick who to edit
    openMoodPicker(dateStr, 'rosa');
  }
}

function openMoodPicker(date, person) {
  moodPickerDate = date;
  moodPickerPerson = person;
  moodPickerSelected = null;
  
  document.getElementById('moodPickerTitle').textContent = date;
  
  // Highlight active person tab
  document.getElementById('moodPersonRosa').style.background = person === 'rosa' ? 'var(--accent-light)' : '';
  document.getElementById('moodPersonRosa').style.color = person === 'rosa' ? 'var(--accent)' : '';
  document.getElementById('moodPersonClaude').style.background = person === 'claude' ? 'var(--accent-light)' : '';
  document.getElementById('moodPersonClaude').style.color = person === 'claude' ? 'var(--accent)' : '';
  
  document.getElementById('moodNote').value = '';
  
  // Check existing
  const existing = moodData[date]?.[person];
  const deleteBtn = document.getElementById('moodDeleteBtn');
  if (existing) {
    moodPickerSelected = existing.mood;
    document.getElementById('moodNote').value = existing.note || '';
    deleteBtn.style.display = '';
  } else {
    deleteBtn.style.display = 'none';
  }
  
  // Render picker
  const grid = document.getElementById('moodPickerGrid');
  grid.innerHTML = MOODS.map(m => `
    <div class="mood-picker-item ${moodPickerSelected === m.key ? 'selected' : ''}" onclick="selectMood('${m.key}', this)">
      <img src="${moodImgUrl(m.file)}" alt="${m.label}">
      <span>${m.label}</span>
    </div>
  `).join('');
  
  document.getElementById('moodPickerOverlay').classList.add('open');
}

function selectMood(key, el) {
  moodPickerSelected = key;
  document.querySelectorAll('.mood-picker-item').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

function switchMoodPerson(person) {
  openMoodPicker(moodPickerDate, person);
}

function closeMoodPicker() {
  document.getElementById('moodPickerOverlay').classList.remove('open');
}

function closeMoodPickerOverlay(e) {
  if (e.target === e.currentTarget) closeMoodPicker();
}

async function saveMood() {
  if (!moodPickerSelected) { toast('Pick a mood first', 'error'); return; }
  if (!ensureAuth()) return toast('Authentication required', 'error');
  
  const res = await api('/moods', {
    method: 'PUT',
    body: {
      date: moodPickerDate,
      person: moodPickerPerson,
      mood: moodPickerSelected,
      note: document.getElementById('moodNote').value || null,
      source: 'web'
    }
  });
  
  if (res.ok) {
    toast('Mood saved', 'success');
    closeMoodPicker();
    renderMoodCalendar();
  } else {
    toast(res.error || 'Failed to save', 'error');
  }
}

async function deleteMoodEntry() {
  if (!ensureAuth()) return toast('Authentication required', 'error');
  const res = await api(`/moods?date=${moodPickerDate}&person=${moodPickerPerson}`, { method: 'DELETE' });
  if (res.ok) {
    toast('Mood deleted', 'success');
    closeMoodPicker();
    renderMoodCalendar();
  } else {
    toast(res.error || 'Failed to delete', 'error');
  }
}
