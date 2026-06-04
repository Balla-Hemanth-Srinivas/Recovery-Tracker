/**
 * Recovery Tracker — Utility Functions
 * Shared helpers used across the entire application.
 */
'use strict';

window.RT = window.RT || {};

RT.Utils = (() => {

  /* ─── ID Generation ─── */

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /* ─── Password Hashing (Web Crypto API) ─── */

  async function hashPassword(username, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${username.toLowerCase()}:${password}`);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /* ─── Date / Time Formatting ─── */

  function formatDate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatTime(date) {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function formatRelativeDate(dateStr) {
    const t = today();
    if (dateStr === t) return 'Today';
    const y = formatDate(new Date(Date.now() - 86400000));
    if (dateStr === y) return 'Yesterday';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function today() { return formatDate(new Date()); }

  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function getMonthName(m)      { return MONTH_NAMES[m]; }
  function getShortMonthName(m) { return SHORT_MONTHS[m]; }

  /** Monday = 0 … Sunday = 6 */
  function getDayOfWeek(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return (d.getDay() + 6) % 7;
  }

  function getWeekStart(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const diff = (d.getDay() === 0 ? 6 : d.getDay() - 1);
    d.setDate(d.getDate() - diff);
    return formatDate(d);
  }

  function dateRange(startStr, endStr) {
    const dates = [];
    const cur = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    while (cur <= end) {
      dates.push(formatDate(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  function daysBetween(a, b) {
    return Math.round(Math.abs(new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }

  /* ─── Debounce ─── */

  function debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  /* ─── DOM Helpers ─── */

  function $(sel)  { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className')    el.className = v;
      else if (k === 'textContent') el.textContent = v;
      else if (k === 'innerHTML')   el.innerHTML = v;
      else if (k.startsWith('on'))  el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
    children.forEach(c => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    });
    return el;
  }

  /* ─── Toast Notifications ─── */

  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = createElement('div', { className: `toast toast-${type}` });
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
  }

  /* ─── Confirmation Dialog ─── */

  function confirm(message, okText = 'Confirm', cancelText = 'Cancel') {
    return new Promise(resolve => {
      const overlay = createElement('div', { className: 'modal-overlay modal-visible' });
      const modal   = createElement('div', { className: 'modal confirm-modal' });

      modal.innerHTML = `
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirm-cancel">${cancelText}</button>
          <button class="btn btn-danger" id="confirm-ok">${okText}</button>
        </div>`;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => modal.classList.add('modal-animate-in'));

      const close = (result) => {
        modal.classList.remove('modal-animate-in');
        overlay.classList.remove('modal-visible');
        setTimeout(() => overlay.remove(), 250);
        resolve(result);
      };

      modal.querySelector('#confirm-cancel').onclick = () => close(false);
      modal.querySelector('#confirm-ok').onclick     = () => close(true);
      overlay.onclick = e => { if (e.target === overlay) close(false); };
    });
  }

  /* ─── Public API ─── */

  return {
    generateId, hashPassword,
    formatDate, formatTime, formatDateTime, formatRelativeDate,
    today, daysInMonth, getMonthName, getShortMonthName,
    getDayOfWeek, getWeekStart, dateRange, daysBetween,
    debounce, $, $$, createElement, showToast, confirm
  };
})();
