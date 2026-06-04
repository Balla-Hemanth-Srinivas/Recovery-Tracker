/**
 * Recovery Tracker — Sync Engine
 * Handles GitHub Gist creation, push/pull, merge (last-write-wins per entity),
 * and the sync indicator (🟢 Synced / 🟡 Syncing / 🔴 Offline).
 */
'use strict';

RT.Sync = (() => {
  const API       = 'https://api.github.com';
  const DESC_PFX  = 'Recovery Tracker Data - ';
  const FILENAME  = 'recovery_tracker.json';

  let timeout   = null;
  let syncing   = false;

  /* ─── Status Indicator ─── */

  function getStatus() {
    const cfg = RT.Storage.loadConfig();
    if (!navigator.onLine) return { state: 'offline', label: 'Offline',    lastSync: cfg.lastSyncTime };
    if (syncing)           return { state: 'syncing', label: 'Syncing…',   lastSync: cfg.lastSyncTime };
    return                        { state: 'synced',  label: 'Synced',     lastSync: cfg.lastSyncTime };
  }

  function updateIndicator() {
    const el = document.getElementById('sync-indicator');
    if (!el) return;
    const { state, label, lastSync } = getStatus();
    const dot  = el.querySelector('.sync-dot');
    const txt  = el.querySelector('.sync-label');
    const time = el.querySelector('.sync-time');
    if (dot)  dot.className = 'sync-dot sync-' + state;
    if (txt)  txt.textContent = label;
    if (time) time.textContent = lastSync ? 'Last: ' + RT.Utils.formatDateTime(lastSync) : '';
  }

  /* ─── Schedule / Perform ─── */

  function scheduleSync() {
    clearTimeout(timeout);
    timeout = setTimeout(() => performSync(), 2000);
  }

  async function performSync() {
    if (syncing || !navigator.onLine) { updateIndicator(); return; }
    const cfg = RT.Storage.loadConfig();
    if (!cfg.pat || !cfg.gistId) { updateIndicator(); return; }

    syncing = true;
    updateIndicator();

    try {
      const remote = await pull(cfg);
      const local  = RT.Storage.getDataForSync();

      if (remote) {
        const merged = merge(local, remote);
        RT.Storage.setDataFromSync(merged);
        await push(cfg, merged);
      } else {
        await push(cfg, local);
      }

      cfg.lastSyncTime = new Date().toISOString();
      RT.Storage.saveConfig(cfg);
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      syncing = false;
      updateIndicator();
    }
  }

  /* ─── Gist CRUD ─── */

  async function createGist(pat, username) {
    const data  = RT.Storage.getDataForSync() || RT.Storage.defaultData();
    const clean = { ...data }; delete clean._gistId;

    const res = await fetch(`${API}/gists`, {
      method: 'POST',
      headers: headers(pat),
      body: JSON.stringify({
        description: DESC_PFX + username,
        public: false,
        files: { [FILENAME]: { content: JSON.stringify(clean, null, 2) } }
      })
    });

    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Gist creation failed'); }
    return (await res.json()).id;
  }

  async function findAndRestoreGist(pat, username) {
    const res = await fetch(`${API}/gists?per_page=100`, { headers: headers(pat) });
    if (!res.ok) throw new Error('Failed to fetch Gists — check your PAT.');

    const gists = await res.json();
    const target = (DESC_PFX + username).toLowerCase();
    const found = gists.find(g =>
      g.description && g.description.toLowerCase() === target && g.files && g.files[FILENAME]
    );
    if (!found) return null;

    const full = await fetch(`${API}/gists/${found.id}`, { headers: headers(pat) });
    if (!full.ok) throw new Error('Failed to read Gist data.');
    const gist = await full.json();
    const data = JSON.parse(gist.files[FILENAME].content);
    data._gistId = found.id;
    return data;
  }

  async function push(cfg, data) {
    const clean = { ...data }; delete clean._gistId;
    await fetch(`${API}/gists/${cfg.gistId}`, {
      method: 'PATCH',
      headers: headers(cfg.pat),
      body: JSON.stringify({ files: { [FILENAME]: { content: JSON.stringify(clean, null, 2) } } })
    });
  }

  async function pull(cfg) {
    const res = await fetch(`${API}/gists/${cfg.gistId}`, { headers: headers(cfg.pat) });
    if (!res.ok) return null;
    const gist = await res.json();
    if (!gist.files || !gist.files[FILENAME]) return null;
    return JSON.parse(gist.files[FILENAME].content);
  }

  function headers(pat) {
    return {
      'Authorization': 'token ' + pat,
      'Content-Type':  'application/json',
      'Accept':        'application/vnd.github.v3+json'
    };
  }

  /* ─── Merge (last-write-wins per entity) ─── */

  function merge(local, remote) {
    if (!local)  return remote;
    if (!remote) return local;

    const merged = { ...local };

    // Habits: union by ID, keep newer
    const hMap = new Map();
    (local.habits  || []).forEach(h => hMap.set(h.id, h));
    (remote.habits || []).forEach(h => {
      const ex = hMap.get(h.id);
      if (!ex || h.updatedAt > ex.updatedAt) hMap.set(h.id, h);
    });
    merged.habits = Array.from(hMap.values());

    // Entries: union by ID, keep newer
    const eMap = new Map();
    (local.entries  || []).forEach(e => eMap.set(e.id, e));
    (remote.entries || []).forEach(e => {
      const ex = eMap.get(e.id);
      if (!ex || e.updatedAt > ex.updatedAt) eMap.set(e.id, e);
    });
    merged.entries = Array.from(eMap.values());

    merged.lastModified = new Date().toISOString();
    return merged;
  }

  /* ─── Init ─── */

  function init() {
    window.addEventListener('online',  () => { updateIndicator(); performSync(); });
    window.addEventListener('offline', () => { updateIndicator(); });
    if (RT.Auth.isLoggedIn()) setTimeout(performSync, 1000);
    updateIndicator();
  }

  return {
    init, createGist, findAndRestoreGist,
    performSync, scheduleSync, updateIndicator, getStatus
  };
})();
