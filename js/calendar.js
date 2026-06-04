/**
 * Recovery Tracker — Calendar Module
 * Monthly grid with colour-coded cells and occurrence counters.
 * Color scale: 0→Green, 1→Amber, 2-3→Light Red, 4+→Dark Red.
 * Zero-count days show green only (no number).
 */
'use strict';

RT.Calendar = (() => {
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  /* ─── Color class helper (exported for heatmap reuse) ─── */

  function colorClass(count) {
    if (count === 0) return 'cal-green';
    if (count === 1) return 'cal-amber';
    if (count <= 3)  return 'cal-light-red';
    return 'cal-dark-red';
  }

  /* ─── Render Calendar ─── */

  function render(habitId, year, month, container) {
    const todayStr  = RT.Utils.today();
    const numDays   = RT.Utils.daysInMonth(year, month);
    const firstDay  = RT.Utils.getDayOfWeek(`${year}-${String(month+1).padStart(2,'0')}-01`);

    // Count entries per day
    const entries = RT.Storage.getEntriesForMonth(habitId, year, month);
    const counts  = {};
    entries.forEach(e => {
      const d = parseInt(e.date.split('-')[2]);
      counts[d] = (counts[d] || 0) + 1;
    });

    let html = `
      <div class="calendar-card card">
        <div class="calendar-nav-row">
          <button class="cal-nav-btn" id="cal-prev" aria-label="Previous month">‹</button>
          <h3 class="cal-month-label">${RT.Utils.getMonthName(month)} ${year}</h3>
          <button class="cal-nav-btn" id="cal-next" aria-label="Next month">›</button>
        </div>
        <div class="cal-day-names">${DAYS.map(d=>`<span>${d}</span>`).join('')}</div>
        <div class="cal-grid">`;

    // Leading blanks
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell cal-blank"></div>';

    for (let day = 1; day <= numDays; day++) {
      const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const future   = dateStr > todayStr;
      const count    = counts[day] || 0;
      const cls      = future ? 'cal-future' : colorClass(count);

      html += `
        <div class="cal-cell ${cls}${future ? ' cal-disabled' : ''}"
             data-date="${dateStr}" ${!future ? 'tabindex="0" role="button"' : ''}>
          <span class="cal-num">${day}</span>
          ${(!future && count > 0) ? `<span class="cal-count">${count}</span>` : ''}
        </div>`;
    }

    html += '</div></div>';
    container.innerHTML = html;

    // Month navigation
    container.querySelector('#cal-prev').addEventListener('click', () => {
      let m = month - 1, y = year;
      if (m < 0) { m = 11; y--; }
      render(habitId, y, m, container);
    });
    container.querySelector('#cal-next').addEventListener('click', () => {
      let m = month + 1, y = year;
      if (m > 11) { m = 0; y++; }
      render(habitId, y, m, container);
    });

    // Day tap → show day detail modal
    container.querySelectorAll('.cal-cell:not(.cal-blank):not(.cal-disabled)').forEach(cell =>
      cell.addEventListener('click', () => showDayModal(habitId, cell.dataset.date))
    );
  }

  /* ─── Day Detail Modal ─── */

  function showDayModal(habitId, date) {
    const entries   = RT.Storage.getEntries(habitId, date);
    const overlay   = RT.Utils.createElement('div', { className: 'modal-overlay modal-visible' });
    const modal     = RT.Utils.createElement('div', { className: 'modal' });
    const formatted = RT.Utils.formatRelativeDate(date);

    let html = `<h2 class="modal-title">${formatted}</h2>`;

    if (entries.length === 0) {
      html += '<p class="day-clean-msg">No occurrences — clean day! 🎉</p>';
    } else {
      html += `<p class="day-count">${entries.length} occurrence${entries.length > 1 ? 's' : ''}</p>`;
      html += '<div class="day-entries">';
      entries.forEach(en => {
        html += `<div class="day-entry">
          <span class="entry-time-badge">${en.time}</span>
          <div class="entry-actions">
            <button class="entry-btn edit-day-entry" data-id="${en.id}">✏️</button>
            <button class="entry-btn del-day-entry"  data-id="${en.id}">🗑️</button>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    html += `<div class="modal-actions">
      <button class="btn btn-secondary" id="day-close">Close</button>
      ${date <= RT.Utils.today() ? '<button class="btn btn-primary" id="day-add">+ Add</button>' : ''}
    </div>`;

    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => modal.classList.add('modal-animate-in'));

    const close = () => {
      modal.classList.remove('modal-animate-in');
      overlay.classList.remove('modal-visible');
      setTimeout(() => overlay.remove(), 250);
    };

    modal.querySelector('#day-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    const addBtn = modal.querySelector('#day-add');
    if (addBtn) addBtn.addEventListener('click', () => { close(); addEntryForDate(habitId, date); });

    modal.querySelectorAll('.edit-day-entry').forEach(btn =>
      btn.addEventListener('click', () => {
        const en = entries.find(e => e.id === btn.dataset.id);
        close();
        if (en) RT.Entries.showEntryModal(habitId, en);
      })
    );

    modal.querySelectorAll('.del-day-entry').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (await RT.Utils.confirm('Delete this entry?', 'Delete')) {
          RT.Storage.deleteEntry(btn.dataset.id);
          RT.Utils.showToast('Entry deleted', 'success');
          close();
          RT.App.refreshCurrentView();
        }
      })
    );
  }

  /* ─── Quick-add entry for a specific date ─── */

  function addEntryForDate(habitId, date) {
    const overlay = RT.Utils.createElement('div', { className: 'modal-overlay modal-visible' });
    const modal   = RT.Utils.createElement('div', { className: 'modal modal-compact' });

    modal.innerHTML = `
      <h2 class="modal-title">Record Occurrence</h2>
      <form id="quick-entry-form">
        <div class="form-group">
          <label for="qe-date">Date</label>
          <input type="date" id="qe-date" required value="${date}" max="${RT.Utils.today()}">
        </div>
        <div class="form-group">
          <label for="qe-time">Time</label>
          <input type="time" id="qe-time" value="${RT.Utils.formatTime(new Date())}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="qe-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Record</button>
        </div>
      </form>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => modal.classList.add('modal-animate-in'));

    const close = () => {
      modal.classList.remove('modal-animate-in');
      overlay.classList.remove('modal-visible');
      setTimeout(() => overlay.remove(), 250);
    };

    modal.querySelector('#qe-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    modal.querySelector('#quick-entry-form').addEventListener('submit', e => {
      e.preventDefault();
      const d = modal.querySelector('#qe-date').value;
      const t = modal.querySelector('#qe-time').value || RT.Utils.formatTime(new Date());
      RT.Storage.addEntry({ habitId, date: d, time: t });
      RT.Utils.showToast('Occurrence recorded', 'success');
      close();
      RT.App.refreshCurrentView();
    });
  }

  return { render, colorClass };
})();
