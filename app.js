"use strict";

// ─────────────────────────────
// STATE
// ─────────────────────────────

let tasks = [];
let activeFilter = "all";
let searchQuery = "";

// ─────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────

const STORAGE_KEY = "taskly_tasks_v1";

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
  } catch {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ─────────────────────────────
// HELPERS
// ─────────────────────────────

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// ─────────────────────────────
// CRUD
// ─────────────────────────────

function addTask(text, priority, category) {
  const trimmed = text.trim();
  if (!trimmed) return;
  tasks.unshift({ id: generateId(), text: trimmed, done: false, priority, category, createdAt: Date.now() });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  render();
}

function updateTaskText(id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) return;
  const task = tasks.find((t) => t.id === id);
  if (task) { task.text = trimmed; saveTasks(); }
}

function deleteTask(id) {
  const listItem = document.querySelector(`[data-id="${id}"]`);
  if (!listItem) return;
  listItem.classList.add("is-removing");
  listItem.addEventListener("animationend", () => {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }, { once: true });
}

function clearCompleted() {
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
}

// ─────────────────────────────
// FILTERING
// ─────────────────────────────

function getFilteredTasks() {
  return tasks.filter((task) => {
    const matchesFilter =
  activeFilter === "all"         ? true :
  activeFilter === "active"      ? !task.done :
  activeFilter === "completed"   ? task.done :
  activeFilter === "high"        ? task.priority === "high" && !task.done :
  activeFilter === "medium"      ? task.priority === "medium" && !task.done :
  activeFilter === "low"         ? task.priority === "low" && !task.done :
  activeFilter === "cat-general" ? task.category === "General" :
  activeFilter === "cat-work"    ? task.category === "Work" :
  activeFilter === "cat-personal"? task.category === "Personal" :
  activeFilter === "cat-study"   ? task.category === "Study" :
  activeFilter === "cat-health"  ? task.category === "Health" : true;

    const matchesSearch =
      searchQuery === "" ||
      task.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });
}

// ─────────────────────────────
// INLINE EDITING
// ─────────────────────────────

function startEditing(id) {
  const listItem = document.querySelector(`[data-id="${id}"]`);
  if (!listItem) return;
  const textEl = listItem.querySelector(".task-item__text");
  textEl.contentEditable = "true";
  textEl.focus();

  const range = document.createRange();
  range.selectNodeContents(textEl);
  range.collapse(false);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  const finish = () => {
    textEl.contentEditable = "false";
    updateTaskText(id, textEl.textContent);
    textEl.removeEventListener("blur", finish);
    textEl.removeEventListener("keydown", handleKeydown);
  };

  const handleKeydown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); textEl.blur(); }
    if (e.key === "Escape") {
      textEl.textContent = tasks.find((t) => t.id === id)?.text || "";
      textEl.blur();
    }
  };

  textEl.addEventListener("blur", finish);
  textEl.addEventListener("keydown", handleKeydown);
}

// ─────────────────────────────
// BUILD TASK ELEMENT
// ─────────────────────────────

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.done ? " is-done" : "");
  li.dataset.id = task.id;

  li.innerHTML = `
    <div class="task-item__checkbox ${task.done ? "checked" : ""}" role="checkbox" aria-checked="${task.done}" tabindex="0"></div>
    <div class="task-item__body">
      <p class="task-item__text">${escapeHtml(task.text)}</p>
      <div class="task-item__meta">
        <span class="tag tag--category">${escapeHtml(task.category)}</span>
        <span class="tag tag--${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
        <span class="task-item__time">${timeAgo(task.createdAt)}</span>
      </div>
    </div>
    <div class="task-item__actions">
      <button class="action-btn action-btn--edit" title="Edit task">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
      <button class="action-btn action-btn--delete" title="Delete task">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
      </button>
    </div>
  `;

  li.querySelector(".task-item__checkbox").addEventListener("click", () => toggleTask(task.id));
  li.querySelector(".action-btn--edit").addEventListener("click", () => startEditing(task.id));
  li.querySelector(".action-btn--delete").addEventListener("click", () => deleteTask(task.id));

  return li;
}

// ─────────────────────────────
// RENDER
// ─────────────────────────────

function render() {
  const list = document.getElementById("task-list");
  const emptyState = document.getElementById("empty-state");
  const filteredTasks = getFilteredTasks();

  list.innerHTML = "";

  if (filteredTasks.length === 0) {
    emptyState.classList.add("visible");
  } else {
    emptyState.classList.remove("visible");
    filteredTasks.forEach((task) => list.appendChild(createTaskElement(task)));
  }

  updateStats();
}

// ─────────────────────────────
// STATS
// ─────────────────────────────

function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const active    = total - completed;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById("badge-all").textContent       = total;
  document.getElementById("badge-active").textContent    = active;
  document.getElementById("badge-completed").textContent = completed;
  document.getElementById("progress-fill").style.width   = `${pct}%`;
  document.getElementById("progress-text").textContent   = `${pct}%`;
  document.getElementById("progress-sub").textContent    = `${completed} of ${total} tasks complete`;
}

// ─────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────

function setupEventListeners() {
  // Add task
  document.getElementById("btn-add").addEventListener("click", () => {
    const input    = document.getElementById("task-input");
    const priority = document.getElementById("priority-select").value;
    const category = document.getElementById("category-select").value;
    addTask(input.value, priority, category);
    input.value = "";
    input.focus();
  });

  // Enter key to add
  document.getElementById("task-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("btn-add").click();
  });

  // Sidebar filters
  document.querySelectorAll(".nav-item[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item[data-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;

      const titles = {
  all: "All Tasks", active: "Active Tasks", completed: "Completed",
  high: "High Priority", medium: "Medium Priority", low: "Low Priority",
  "cat-general": "General", "cat-work": "Work", "cat-personal": "Personal",
  "cat-study": "Study", "cat-health": "Health",
};
      document.getElementById("view-title").textContent = titles[activeFilter] || "All Tasks";
      render();
    });
  });

  // Search
  document.getElementById("search-input").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    render();
  });

  // Clear completed
  document.getElementById("btn-clear-completed").addEventListener("click", clearCompleted);
}

// ─────────────────────────────
// INIT
// ─────────────────────────────

function init() {
  loadTasks();
  setupEventListeners();
  document.getElementById("current-date").textContent = formatDate();
  render();
}

document.addEventListener("DOMContentLoaded", init);