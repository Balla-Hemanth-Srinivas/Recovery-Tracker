/**
 * Recovery Tracker — App Shell & Router
 * Hash-based routing, view transitions, theme application, and habit-detail renderer.
 */
'use strict';

RT.App = (() => {
  let currentView    = null;
  let currentHabitId = null;
  const initialHashOnLoad = window.location.hash;
  const isRootRoute = !initialHashOnLoad || initialHashOnLoad === '#' || initialHashOnLoad === '#/';

  /* ─── Initialise ─── */

  function init() {
    applyTheme();
    window.addEventListener('hashchange', route);
    RT.Storage.onChange(() => RT.Sync.updateIndicator());
    RT.Sync.init();

    // Listen for system theme change when set to "system"
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const cfg = RT.Storage.loadConfig();
      if (cfg.theme === 'system') applyTheme();
    });

    // Initial route
    if (!RT.Auth.isLoggedIn()) {
      navigate('auth');
    } else {
      if (isRootRoute) {
        const habits = RT.Storage.getHabits();
        navigate(habits.length === 1 ? 'habit/' + habits[0].id : 'home');
      } else {
        route();
      }
    }
  }

  /* ─── Theme ─── */

  function applyTheme() {
    const theme = RT.Storage.loadConfig().theme || 'system';
    const html  = document.documentElement;
    html.removeAttribute('data-theme');
    if (theme === 'light' || theme === 'dark') html.setAttribute('data-theme', theme);
    // 'system' → no attribute → CSS prefers-color-scheme controls it
  }

  /* ─── Navigation ─── */

  function navigate(r) {
    if (!r) {
      window.location.hash = '/';
    } else if (r.startsWith('/')) {
      window.location.hash = r;
    } else {
      window.location.hash = '/' + r;
    }
  }

  function route() {
    let hash = window.location.hash;
    // Normalize hash: strip leading '#' and leading/trailing '/'
    if (hash.startsWith('#')) {
      hash = hash.slice(1);
    }
    if (hash.startsWith('/')) {
      hash = hash.slice(1);
    }
    if (hash.endsWith('/')) {
      hash = hash.slice(0, -1);
    }

    if (!hash) {
      hash = 'auth';
    }

    const parts = hash.split('/');
    const page  = parts[0];
    const id    = parts[1];

    // Auth guard
    if (page !== 'auth' && !RT.Auth.isLoggedIn()) { navigate('auth'); return; }

    // Hide all views, then show target
    document.querySelectorAll('.view').forEach(v => v.classList.remove('view-active'));

    const nav    = document.getElementById('bottom-nav');
    const header = document.getElementById('app-header');
    nav.style.display    = page === 'auth' ? 'none' : 'flex';
    header.style.display = page === 'auth' ? 'none' : 'flex';

    // Active nav highlight
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));

    currentView = page;

    switch (page) {
      case 'auth':
        show('view-auth');
        RT.Auth.renderAuthView();
        break;

      case 'home':
        show('view-home');
        mark('home');
        RT.Habits.renderHomeView();
        break;

      case 'habit':
        currentHabitId = id;
        show('view-habit');
        mark('home');
        renderHabitDetail(id);
        break;

      case 'stats':
        show('view-stats');
        mark('stats');
        RT.Stats.renderStatsView(id || currentHabitId || firstHabitId());
        break;

      case 'settings':
        show('view-settings');
        mark('settings');
        RT.Settings.renderSettingsView();
        break;

      default:
        show('view-fallback');
        renderFallbackView();
    }
  }

  function show(viewId) {
    const el = document.getElementById(viewId);
    if (el) el.classList.add('view-active');
  }

  function mark(name) {
    const btn = document.querySelector(`[data-nav="${name}"]`);
    if (btn) btn.classList.add('nav-active');
  }

  function firstHabitId() {
    const h = RT.Storage.getHabits();
    return h.length ? h[0].id : null;
  }

  /* ─── Habit Detail View ─── */

  function renderHabitDetail(habitId) {
    const view  = RT.Utils.$('#view-habit');
    const habit = RT.Storage.getHabit(habitId);

    if (!habit) {
      view.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h2>Habit not found.</h2>
          <p>This habit may have been deleted.</p>
          <button class="btn btn-primary" onclick="RT.App.navigate('home')">Return Home</button>
        </div>`;
      return;
    }

    const todayCount = RT.Storage.countForDate(habitId, RT.Utils.today());
    const range      = RT.Stats.getDateRange('all');
    const stats      = RT.Stats.calculate(habitId, range.start, range.end);
    const now        = new Date();

    view.innerHTML = `
      <div class="view-header">
        <button class="header-btn back-btn" id="habit-back" aria-label="Back">‹</button>
        <h1 class="view-title">${habit.emoji} ${habit.name}</h1>
        <button class="header-btn" id="habit-edit" aria-label="Edit habit">✏️</button>
      </div>

      <div class="quick-stats">
        <div class="quick-stat">
          <div class="quick-stat-value">${stats ? stats.currentStreak : 0}</div>
          <div class="quick-stat-label">Streak</div>
        </div>
        <div class="quick-stat quick-stat-hero">
          <div class="quick-stat-value ${todayCount <= habit.threshold ? 'text-success' : 'text-danger'}">${todayCount}</div>
          <div class="quick-stat-label">Today</div>
        </div>
        <div class="quick-stat">
          <div class="quick-stat-value">${stats ? (stats.successPct === 'N/A' ? 'N/A' : stats.successPct + '%') : '--'}</div>
          <div class="quick-stat-label">Success</div>
        </div>
      </div>

      <div id="calendar-container"></div>
      <div id="entries-container"></div>

      <button class="fab" id="fab-add-entry" title="Record Occurrence"><span>+</span></button>`;

    RT.Calendar.render(habitId, now.getFullYear(), now.getMonth(), view.querySelector('#calendar-container'));
    RT.Entries.renderEntrySection(habitId, view.querySelector('#entries-container'));

    view.querySelector('#habit-back').addEventListener('click', () => navigate('home'));
    view.querySelector('#habit-edit').addEventListener('click', () => RT.Habits.showHabitModal(habit));
    view.querySelector('#fab-add-entry').addEventListener('click', () => RT.Entries.showEntryModal(habitId));
  }

  /* ─── Post-login redirect ─── */

  function onLoginSuccess() {
    const habits = RT.Storage.getHabits();
    navigate(habits.length === 1 ? 'habit/' + habits[0].id : 'home');
    RT.Sync.performSync();
  }

  function renderFallbackView() {
    const view = document.getElementById('view-fallback');
    if (view) {
      view.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h2>Page not found.</h2>
          <p>The requested page does not exist.</p>
          <button class="btn btn-primary" onclick="RT.App.navigate('home')">Return Home</button>
        </div>`;
    }
  }

  function refreshCurrentView() { route(); }

  return { init, navigate, applyTheme, onLoginSuccess, refreshCurrentView, renderFallbackView };
})();

/* ─── Boot ─── */
document.addEventListener('DOMContentLoaded', () => RT.App.init());
