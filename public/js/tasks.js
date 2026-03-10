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

  list.innerHTML = res.data.map(t => renderTaskCard(t)).join('');
}

function renderTaskCard(t) {
  const statusColor = TASK_STATUS_COLORS[t.status] || 'var(--text-muted)';
  const isDone = t.status === 'done';
  const priorityDots = Array.from({length: 5}, (_, i) =>
    `<div class="importance-dot ${i < t.priority ? 'filled' : ''}"></div>`
  ).join('');

  const deadlineStr = t.deadline ? `<span style="font-size:12px;color:${isOverdue(t) ? 'var(--danger)' : 'var(--text-muted)'};">${t.deadline}</span>` : '';
  const completedStr = t.completed_at ? `<span style="font-size:11px;color:var(--success);font-style:italic;">Completed ${t.completed_at.split(' ')[0]}</span>` : '';

  return `
    <div class="memory-card" style="${isDone ? 'opacity:0.6;' : ''}">
      <div class="memory-card-header">
        <div class="memory-meta" style="gap:10px;">
          <span style="font-size:15px;font-weight:600;${isDone ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${escapeHtml(t.title)}</span>
          <span class="memory-category" style="background:${statusColor};color:#FFF;">${t.status}</span>
          <span class="memory-category">${t.category}</span>
          <div class="importance-dots">${priorityDots}</div>
        </div>
        <div class="memory-actions">
          ${!isDone ? `<button class="btn btn-ghost btn-sm" style="color:var(--success)" onclick="quickCompleteTask(${t.id})">Done</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="editTask(${t.id})">Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteTask(${t.id})">Delete</button>
        </div>
      </div>
      ${t.description ? `<div class="memory-content" style="font-size:13px;color:var(--text-secondary);">${escapeHtml(t.description)}</div>` : ''}
      <div style="display:flex;gap:12px;align-items:center;margin-top:6px;">
        ${deadlineStr}
        ${completedStr}
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
