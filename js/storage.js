/**
 * Recovery Tracker — Storage Layer
 * All LocalStorage operations, data access, and change notification.
 *
 * Three separate keys keep concerns separated:
 *   rt_data    — synced payload (habits, entries, user identity)
 *   rt_config  — local-only config (PAT, gistId, theme, lastSync)
 *   rt_session — login session (localStorage when "Remember Me", else sessionStorage)
 */
'use strict';

RT.Storage = (() => {
  const DATA_KEY    = 'rt_data';
  const CONFIG_KEY  = 'rt_config';
  const SESSION_KEY = 'rt_session';

  const listeners = [];

  /* ─── Default Structures ─── */

  function defaultData() {
    return { version: 1, user: null, habits: [], entries: [], lastModified: new Date().toISOString() };
  }

  function defaultConfig() {
    return { pat: '', gistId: '', theme: 'system', lastSyncTime: null };
  }

  /* ─── Raw Accessors ─── */

  function loadData() {
    try { const r = localStorage.getItem(DATA_KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }

  function saveData(data) {
    data.lastModified = new Date().toISOString();
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    notify();
    if (RT.Sync) RT.Sync.scheduleSync();
  }

  function loadConfig() {
    try { const r = localStorage.getItem(CONFIG_KEY); return r ? JSON.parse(r) : defaultConfig(); }
    catch { return defaultConfig(); }
  }

  function saveConfig(cfg) { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }

  /* ─── Session (Remember Me ↔ sessionStorage) ─── */

  function loadSession() {
    try {
      const l = localStorage.getItem(SESSION_KEY);
      if (l) return JSON.parse(l);
      const s = sessionStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  function saveSession(obj, remember = false) {
    const json = JSON.stringify(obj);
    if (remember) localStorage.setItem(SESSION_KEY, json);
    else          sessionStorage.setItem(SESSION_KEY, json);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  /* ─── Change Listeners ─── */

  function onChange(fn) { listeners.push(fn); }
  function notify()     { listeners.forEach(fn => fn()); }

  /* ─── User ─── */

  function getUser() { const d = loadData(); return d ? d.user : null; }

  function setUser(user) {
    const d = loadData() || defaultData();
    d.user = user;
    saveData(d);
  }

  /* ─── Habits ─── */

  function getHabits()     { const d = loadData(); return d ? d.habits.filter(h => !h.deletedAt) : []; }
  function getAllHabitsRaw(){ const d = loadData(); return d ? d.habits : []; }
  function getHabit(id)    { return getHabits().find(h => h.id === id) || null; }

  function addHabit(h) {
    const d = loadData() || defaultData();
    h.id        = h.id || RT.Utils.generateId('h');
    h.createdAt = h.createdAt || new Date().toISOString();
    h.updatedAt = new Date().toISOString();
    d.habits.push(h);
    saveData(d);
    return h;
  }

  function updateHabit(id, upd) {
    const d = loadData(); if (!d) return null;
    const i = d.habits.findIndex(h => h.id === id); if (i === -1) return null;
    d.habits[i] = { ...d.habits[i], ...upd, updatedAt: new Date().toISOString() };
    saveData(d);
    return d.habits[i];
  }

  function deleteHabit(id) { return updateHabit(id, { deletedAt: new Date().toISOString() }); }

  /* ─── Entries ─── */

  function getEntries(habitId, date) {
    const d = loadData(); if (!d) return [];
    return d.entries
      .filter(e => !e.deletedAt && e.habitId === habitId && (!date || e.date === date))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }

  function getEntriesForMonth(habitId, year, month) {
    const d = loadData(); if (!d) return [];
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return d.entries.filter(e => !e.deletedAt && e.habitId === habitId && e.date.startsWith(prefix));
  }

  function getEntriesForRange(habitId, start, end) {
    const d = loadData(); if (!d) return [];
    return d.entries.filter(e => !e.deletedAt && e.habitId === habitId && e.date >= start && e.date <= end);
  }

  function getAllEntries(habitId) {
    const d = loadData(); if (!d) return [];
    return d.entries.filter(e => !e.deletedAt && e.habitId === habitId);
  }

  function countForDate(habitId, date) {
    const d = loadData(); if (!d) return 0;
    return d.entries.filter(e => !e.deletedAt && e.habitId === habitId && e.date === date).length;
  }

  function addEntry(e) {
    const d = loadData() || defaultData();
    e.id        = e.id || RT.Utils.generateId('e');
    e.createdAt = e.createdAt || new Date().toISOString();
    e.updatedAt = new Date().toISOString();
    d.entries.push(e);
    saveData(d);
    return e;
  }

  function updateEntry(id, upd) {
    const d = loadData(); if (!d) return null;
    const i = d.entries.findIndex(e => e.id === id); if (i === -1) return null;
    d.entries[i] = { ...d.entries[i], ...upd, updatedAt: new Date().toISOString() };
    saveData(d);
    return d.entries[i];
  }

  function deleteEntry(id) { return updateEntry(id, { deletedAt: new Date().toISOString() }); }

  /* ─── Export / Import / Reset ─── */

  function exportData() { return loadData(); }

  function importData(imported) {
    if (!imported || !imported.version) throw new Error('Invalid data format');
    saveData(imported);
  }

  function resetAll() {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(CONFIG_KEY);
    clearSession();
  }

  /* ─── Sync Helpers ─── */

  function getDataForSync() { return loadData(); }

  function setDataFromSync(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    notify();
  }

  /* ─── Public API ─── */

  return {
    defaultData, loadData, saveData,
    loadConfig, saveConfig,
    loadSession, saveSession, clearSession,
    onChange,
    getUser, setUser,
    getHabits, getAllHabitsRaw, getHabit, addHabit, updateHabit, deleteHabit,
    getEntries, getEntriesForMonth, getEntriesForRange, getAllEntries, countForDate,
    addEntry, updateEntry, deleteEntry,
    exportData, importData, resetAll,
    getDataForSync, setDataFromSync
  };
})();
