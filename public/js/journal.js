// ─── Journal ───
let journalYear, journalMonth;
let journalViewingId = null;

function utcToLocal(utcStr) {
  if (!utcStr) return '';
  const d = new Date(utcStr + 'Z');
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initJournalPage() {
  if (!journalYear) {
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    journalYear = utc8.getUTCFullYear();
    journalMonth = utc8.getUTCMonth();
  }
  loadJournalEntries();
}

function journalChangeMonth(delta) {
  journalMonth += delta;
  if (journalMonth > 11) { journalMonth = 0; journalYear++; }
  if (journalMonth < 0) { journalMonth = 11; journalYear--; }
  loadJournalEntries();
}

async function loadJournalEntries() {
  const list = document.getElementById('journalList');
  const ym = `${journalYear}-${String(journalMonth + 1).padStart(2, '0')}`;
  document.getElementById('journalMonthTitle').textContent = `${MONTHS[journalMonth]} ${journalYear}`;
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  const res = await api(`/journal?month=${ym}`);
  if (!res.ok) {
    list.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${res.error}</p></div>`;
    return;
  }
  
  document.getElementById('journalSubtitle').textContent = `${res.total} entr${res.total === 1 ? 'y' : 'ies'}`;
  
  if (res.data.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div><h3>No entries this month</h3><p>Nothing written yet.</p></div>`;
    return;
  }
  
  list.innerHTML = res.data.map(e => `
    <div class="journal-card" onclick="openJournalDetail(${e.id})">
      <div class="journal-card-header">
        <div class="journal-card-title">${escapeHtml(e.title || 'Untitled')}</div>
        <div class="journal-card-date">${e.date}</div>
      </div>
      <div class="journal-card-preview">${escapeHtml(e.content)}</div>
      <div class="journal-card-footer">
        <span style="color:var(--accent);">${e.person === 'claude' ? '🌙' : '🌸'}</span> <span>${e.person}</span>
        ${e.commentCount > 0 ? `<span>· ${e.commentCount} comment${e.commentCount > 1 ? 's' : ''}</span>` : ''}
      </div>
    </div>
  `).join('');
}

async function openJournalDetail(id) {
  journalViewingId = id;
  const res = await api(`/journal/${id}`);
  if (!res.ok) return toast(res.error, 'error');
  
  const e = res.data;
  document.getElementById('journalDetailTitle').textContent = e.title || e.date;
  document.getElementById('journalDetailContent').textContent = e.content;
  
  renderJournalComments(e.comments || []);
  document.getElementById('journalCommentInput').value = '';
  document.getElementById('journalDetailOverlay').classList.add('open');
}

function renderJournalComments(comments) {
  const container = document.getElementById('journalComments');
  if (comments.length === 0) {
    container.innerHTML = '<div style="font-size:13px;color:var(--text-muted);font-style:italic;">No comments yet.</div>';
    return;
  }
  container.innerHTML = comments.map(c => `
    <div class="journal-comment-item">
      <div class="journal-comment-meta"><span style="color:var(--accent);">${c.person === 'claude' ? '🌙' : '🌸'}</span> ${c.person} · ${utcToLocal(c.created_at)}</div>
      <div class="journal-comment-text">${escapeHtml(c.content)}</div>
    </div>
  `).join('');
}

async function submitJournalComment() {
  if (!journalViewingId) return;
  if (!ensureAuth()) return toast('Authentication required', 'error');
  const input = document.getElementById('journalCommentInput');
  const content = input.value.trim();
  if (!content) return;
  
  const res = await api(`/journal/${journalViewingId}/comments`, {
    method: 'POST',
    body: { content, person: 'rosa' }
  });
  
  if (res.ok) {
    input.value = '';
    // Reload entry to get updated comments
    openJournalDetail(journalViewingId);
    toast('Comment added', 'success');
  } else {
    toast(res.error || 'Failed to comment', 'error');
  }
}

function closeJournalDetail() {
  document.getElementById('journalDetailOverlay').classList.remove('open');
  journalViewingId = null;
  loadJournalEntries(); // Refresh comment counts
}

function closeJournalDetailOverlay(e) {
  if (e.target === e.currentTarget) closeJournalDetail();
}
