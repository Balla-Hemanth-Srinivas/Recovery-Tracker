/**
 * Recovery Tracker — Entries Module
 * Add / edit / delete occurrences and render the collapsible entry list.
 */
'use strict';

RT.Entries = (() => {

  /* ─── Collapsible Entry List ─── */

  function renderEntrySection(habitId, container) {
    const all = RT.Storage.getAllEntries(habitId);

    // Group by date descending
    const groups = {};
    all.forEach(e => { (groups[e.date] = groups[e.date] || []).push(e); });
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    let html = `
      <div class="entries-section">
        <div class="entries-header" id="entries-toggle">
          <h3>Recent Entries</h3>
          <span class="entries-badge">${all.length}</span>
          <span class="entries-chevron">▾</span>
        </div>
        <div class="entries-body" id="entries-body">`;

    if (all.length === 0) {
      html += '<div class="empty-state-inline"><p>No entries yet. Tap <strong>+</strong> to record an occurrence.</p></div>';
    } else {
      sortedDates.slice(0, 14).forEach(date => {
        const entries = groups[date].sort((a, b) => b.time.localeCompare(a.time));
        html += `<div class="entry-group">
          <div class="entry-date-label">${RT.Utils.formatRelativeDate(date)}</div>`;
        entries.forEach(en => {
          html += `
            <div class="entry-item" data-id="${en.id}">
              <span class="entry-time-badge">${en.time}</span>
              <div class="entry-actions">
                <button class="entry-btn edit-entry" data-id="${en.id}" title="Edit">✏️</button>
                <button class="entry-btn del-entry" data-id="${en.id}" title="Delete">🗑️</button>
              </div>
            </div>`;
        });
        html += '</div>';
      });
    }

    html += '</div></div>';
    container.innerHTML = html;

    // Collapse toggle (collapsed by default)
    const toggle = container.querySelector('#entries-toggle');
    const body   = container.querySelector('#entries-body');
    let open = false;

    toggle.addEventListener('click', () => {
      open = !open;
      body.style.maxHeight  = open ? body.scrollHeight + 'px' : '0';
      toggle.querySelector('.entries-chevron').textContent = open ? '▴' : '▾';
    });

    // Action buttons
    container.querySelectorAll('.edit-entry').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const entry = all.find(en => en.id === btn.dataset.id);
        if (entry) showEntryModal(habitId, entry);
      })
    );

    container.querySelectorAll('.del-entry').forEach(btn =>
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (await RT.Utils.confirm('Delete this entry?', 'Delete')) {
          RT.Storage.deleteEntry(btn.dataset.id);
          RT.Utils.showToast('Entry deleted', 'success');
          RT.App.refreshCurrentView();
        }
      })
    );
  }

  /* ─── Add / Edit Entry Modal ─── */

  function showEntryModal(habitId, editEntry) {
    const isEdit = !!editEntry;
    const now    = new Date();

    const overlay = RT.Utils.createElement('div', { className: 'modal-overlay modal-visible' });
    const modal   = RT.Utils.createElement('div', { className: 'modal modal-compact' });

    modal.innerHTML = `
      <h2 class="modal-title">${isEdit ? 'Edit Entry' : 'Record Occurrence'}</h2>
      <form id="entry-form">
        <div class="form-group">
          <label for="entry-date">Date</label>
          <input type="date" id="entry-date" required
                 value="${isEdit ? editEntry.date : RT.Utils.formatDate(now)}"
                 max="${RT.Utils.formatDate(now)}">
        </div>
        <div class="form-group">
          <label for="entry-time">Time</label>
          <input type="time" id="entry-time"
                 value="${isEdit ? editEntry.time : RT.Utils.formatTime(now)}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="entry-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Record'}</button>
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

    modal.querySelector('#entry-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    modal.querySelector('#entry-form').addEventListener('submit', e => {
      e.preventDefault();
      const date = modal.querySelector('#entry-date').value;
      const time = modal.querySelector('#entry-time').value || RT.Utils.formatTime(new Date());

      if (isEdit) {
        RT.Storage.updateEntry(editEntry.id, { date, time });
        RT.Utils.showToast('Entry updated', 'success');
      } else {
        RT.Storage.addEntry({ habitId, date, time });
        RT.Utils.showToast('Occurrence recorded', 'success');
      }
      close();
      RT.App.refreshCurrentView();
    });
  }

  return { renderEntrySection, showEntryModal };
})();
