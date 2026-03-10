// ─── Tasks ───
let taskStatusFilter = null;
let taskCategoryFilter = null;
let taskEditingId = null;
let taskDeletingId = null;

const TASK_STATUS_COLORS = {
  'todo': 'var(--accent)',
  'in-progress': '#6B9E78',
  'done': 'var(--text-muted)'
};

const TASK_PRIORITY_LABELS = ['', 'Low', 'Minor', 'Normal', 'Important', 'Urgent'];

function initTasksPage() {
  loadTasks();
  loadTaskCategories();
}

async function loadTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  let params = new URLSearchParams();
  if (taskStatusFilter) params.set('status', taskStatusFilter);
  if (taskCategoryFilter) params.set('category', taskCategoryFilter);

  const res = await api(`/tasks?${params.toString()}`);
  if (!res.ok) {
    list.innerHTML = `<div class="empty-state"><div class="icon">\u26a0\ufe0f</div><p>${res.error}</p></div>`;
    return;
  }

  document.getElementById('tasksSubtitle').textContent = `${res.total} task${res.total === 1 ? '' : 's'}`;

  if (res.data.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
        <h3>${taskStatusFilter === 'done' ? 'No completed tasks' : 'All clear!'}</h3>
        <p>${taskStatusFilter ? '' : 'Nothing to do. Enjoy the moment.'}</p>
      </div>`;
    return;
  }

  // Group by category
  const groups = {};
  for (const t of res.data) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }

  // Sort categories: ones with urgent/active tasks first
  const catOrder = Object.entries(groups).sort((a, b) => {
    const aMax = Math.max(...a[1].map(t => t.status === 'done' ? 0 : t.priority));
    const bMax = Math.max(...b[1].map(t => t.status === 'done' ? 0 : t.priority));
    return bMax - aMax;
  });

  let html = '';
  for (const [cat, tasks] of catOrder) {
    const activeCount = tasks.filter(t => t.status !== 'done').length;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const countLabel = doneCount > 0 ? `${activeCount} active, ${doneCount} done` : `${activeCount} task${activeCount !== 1 ? 's' : ''}`;
    html += `
      <div class="task-group" style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-size:15px;font-weight:600;color:var(--text-primary);text-transform:capitalize;">${escapeHtml(cat)}</span>
          <span style="font-size:12px;color:var(--text-muted);">(${countLabel})</span>
        </div>
        <div class="memory-list" style="gap:8px;">
          ${tasks.map(t => renderTaskCard(t)).join('')}
        </div>
      </div>`;
  }
  list.innerHTML = html;
}

function renderTaskCard(t) {
  const statusColor = TASK_STATUS_COLORS[t.status] || 'var(--text-muted)';
  const isDone = t.status === 'done';
  const isInProgress = t.status === 'in-progress';
  const statusIcon = isDone ? '&#10003;' : isInProgress ? '&#9998;' : '&#9675;';
  const priorityDots = Array.from({length: 5}, (_, i) =>
    `<div class="importance-dot ${i < t.priority ? 'filled' : ''}"></div>`
  ).join('');

  const deadlineStr = t.deadline ? `<span style="font-size:11px;color:${isOverdue(t) ? 'var(--danger);font-weight:600' : 'var(--text-muted)'};">${t.deadline}</span>` : '';

  return `
    <div class="task-card ${isDone ? 'task-done' : ''}">
      <div class="task-card-main">
        <span class="task-status-icon" style="color:${statusColor};" onclick="${isDone ? '' : `quickCompleteTask(${t.id})`}" title="${isDone ? 'Completed' : 'Click to complete'}">${statusIcon}</span>
        <div class="task-card-body">
          <div class="task-title${isDone ? ' done' : ''}">${escapeHtml(t.title)}</div>
          ${t.description ? `<div class="task-desc">${escapeHtml(t.description)}</div>` : ''}
          <div class="task-meta">
            ${deadlineStr}
            <div class="importance-dots">${priorityDots}</div>
            ${isInProgress ? '<span class="task-status-badge">in progress</span>' : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn" onclick="editTask(${t.id})" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="task-action-btn task-action-del" onclick="deleteTask(${t.id})" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>
    </div>`;
}

function isOverdue(t) {
  if (!t.deadline || t.status === 'done') return false;
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStr = utc8.toISOString().split('T')[0];
  return t.deadline < todayStr;
}

async function loadTaskCategories() {
  const res = await api('/tasks/categories');
  if (!res.ok) return;
  const cats = {};
  for (const row of res.data) {
    cats[row.category] = (cats[row.category] || 0) + row.count;
  }
  const container = document.getElementById('taskCategoryFilters');
  container.innerHTML = Object.entries(cats).map(([cat, count]) =>
    `<span class="filter-tag ${taskCategoryFilter === cat ? 'active' : ''}" onclick="filterTaskCategory('${cat}')">${cat} (${count})</span>`
  ).join('');
}

function filterTaskStatus(status, el) {
  taskStatusFilter = status;
  document.querySelectorAll('#taskStatusFilters .filter-tag').forEach(e => e.classList.remove('active'));
  if (el) el.classList.add('active');
  loadTasks();
}

function filterTaskCategory(cat) {
  taskCategoryFilter = taskCategoryFilter === cat ? null : cat;
  loadTasks();
  loadTaskCategories();
}

function openTaskModal(id = null) {
  taskEditingId = id;
  document.getElementById('taskModalTitle').textContent = id ? 'Edit Task' : 'New Task';
  document.getElementById('taskFormSubmit').textContent = id ? 'Update' : 'Save';

  if (id) {
    api(`/tasks/${id}`).then(res => {
      if (res.ok) {
        const t = res.data;
        document.getElementById('taskFormTitle').value = t.title;
        document.getElementById('taskFormDesc').value = t.description || '';
        document.getElementById('taskFormCategory').value = t.category;
        document.getElementById('taskFormPriority').value = t.priority;
        document.getElementById('taskFormDeadline').value = t.deadline || '';
        document.getElementById('taskFormStatus').value = t.status;
      }
    });
  } else {
    document.getElementById('taskFormTitle').value = '';
    document.getElementById('taskFormDesc').value = '';
    document.getElementById('taskFormCategory').value = 'general';
    document.getElementById('taskFormPriority').value = '3';
    document.getElementById('taskFormDeadline').value = '';
    document.getElementById('taskFormStatus').value = 'todo';
  }

  document.getElementById('taskModalOverlay').classList.add('open');
}

function closeTaskModal() {
  document.getElementById('taskModalOverlay').classList.remove('open');
  taskEditingId = null;
}

async function submitTask() {
  if (!ensureAuth()) return toast('Authentication required', 'error');
  const data = {
    title: document.getElementById('taskFormTitle').value,
    description: document.getElementById('taskFormDesc').value || null,
    category: document.getElementById('taskFormCategory').value,
    priority: parseInt(document.getElementById('taskFormPriority').value),
    deadline: document.getElementById('taskFormDeadline').value || null,
    status: document.getElementById('taskFormStatus').value,
  };
  if (!data.title) return toast('Title is required', 'error');

  let res;
  if (taskEditingId) {
    res = await api(`/tasks/${taskEditingId}`, { method: 'PUT', body: data });
  } else {
    res = await api('/tasks', { method: 'POST', body: data });
  }

  if (res.ok) {
    toast(taskEditingId ? 'Task updated' : 'Task created', 'success');
    closeTaskModal();
    loadTasks();
    loadTaskCategories();
  } else {
    toast(res.error || 'Failed to save', 'error');
  }
}

function editTask(id) { openTaskModal(id); }

async function quickCompleteTask(id) {
  if (!ensureAuth()) return toast('Authentication required', 'error');
  const res = await api(`/tasks/${id}/done`, { method: 'PUT' });
  if (res.ok) {
    toast('Task completed!', 'success');
    loadTasks();
    loadTaskCategories();
  } else {
    toast(res.error || 'Failed', 'error');
  }
}

function deleteTask(id) {
  taskDeletingId = id;
  document.getElementById('taskDeleteOverlay').classList.add('open');
}

function closeTaskDelete() {
  document.getElementById('taskDeleteOverlay').classList.remove('open');
  taskDeletingId = null;
}

async function confirmTaskDelete() {
  if (!taskDeletingId) return;
  if (!ensureAuth()) return toast('Authentication required', 'error');
  const res = await api(`/tasks/${taskDeletingId}`, { method: 'DELETE' });
  if (res.ok) {
    toast('Task deleted', 'success');
    closeTaskDelete();
    loadTasks();
    loadTaskCategories();
  } else {
    toast(res.error || 'Failed to delete', 'error');
  }
}
