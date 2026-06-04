/**
 * Recovery Tracker — Habits Module
 * CRUD operations and Home-page rendering for habits.
 */
'use strict';

RT.Habits = (() => {
  const EMOJIS = [
    '🚬','🍺','🍷','🎰','📱','🍔','🍩','☕','💊','🎮',
    '💅','🛒','😤','😰','🤬','💸','🍭','🥤','⏰','📺'
  ];

  /* ─── Home View ─── */

  function renderHomeView() {
    const view   = RT.Utils.$('#view-home');
    const habits = RT.Storage.getHabits();

    let html = '<div class="view-header"><h1 class="view-title">My Habits</h1></div>';

    if (habits.length === 0) {
      html += emptyState();
    } else {
      html += '<div class="habit-list">';
      habits.forEach(h => {
        const cnt   = RT.Storage.countForDate(h.id, RT.Utils.today());
        const clean = cnt <= h.threshold;
        html += `
          <div class="habit-card card" data-id="${h.id}">
            <div class="habit-card-icon">${h.emoji}</div>
            <div class="habit-card-info">
              <h3 class="habit-card-name">${h.name}</h3>
              ${h.description ? `<p class="habit-card-desc">${h.description}</p>` : ''}
            </div>
            <div class="habit-card-count ${clean ? 'count-clean' : 'count-dirty'}">${cnt}</div>
          </div>`;
      });
      html += '</div>';
    }

    html += '<button class="fab" id="fab-add-habit" title="Add Habit"><span>+</span></button>';
    view.innerHTML = html;

    // Navigate to habit detail on card tap
    view.querySelectorAll('.habit-card').forEach(card =>
      card.addEventListener('click', () => RT.App.navigate('habit/' + card.dataset.id))
    );

    const fab = view.querySelector('#fab-add-habit');
    if (fab) fab.addEventListener('click', () => showHabitModal());
  }

  function emptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🌱</div>
        <h2>Start Your Journey</h2>
        <p>Create your first habit to begin tracking your recovery.</p>
        <button class="btn btn-primary" onclick="RT.Habits.showHabitModal()">Add Your First Habit</button>
      </div>`;
  }

  /* ─── Add / Edit Habit Modal ─── */

  function showHabitModal(editHabit) {
    const isEdit = !!editHabit;
    const overlay = RT.Utils.createElement('div', { className: 'modal-overlay modal-visible' });
    const modal   = RT.Utils.createElement('div', { className: 'modal' });

    let selectedEmoji = isEdit ? editHabit.emoji : '🚬';

    modal.innerHTML = `
      <h2 class="modal-title">${isEdit ? 'Edit Habit' : 'New Habit'}</h2>
      <form id="habit-form">
        <div class="form-group">
          <label for="habit-name">Name</label>
          <input type="text" id="habit-name" required maxlength="50"
                 value="${isEdit ? editHabit.name : ''}" placeholder="e.g., Smoking">
        </div>
        <div class="form-group">
          <label>Icon</label>
          <div class="emoji-picker">
            ${EMOJIS.map(e => `<button type="button" class="emoji-opt ${e === selectedEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label for="habit-desc">Description <span class="optional">(optional)</span></label>
          <input type="text" id="habit-desc" maxlength="100"
                 value="${isEdit ? (editHabit.description || '') : ''}" placeholder="Brief description">
        </div>
        <div class="form-group">
          <label for="habit-threshold">Daily Threshold</label>
          <input type="number" id="habit-threshold" min="0" max="100"
                 value="${isEdit ? editHabit.threshold : 0}">
          <span class="form-hint">Days with occurrences ≤ this count as clean.</span>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="habit-cancel">Cancel</button>
          ${isEdit ? '<button type="button" class="btn btn-danger" id="habit-delete">Delete</button>' : ''}
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
        </div>
      </form>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => modal.classList.add('modal-animate-in'));

    // Emoji picker
    modal.querySelectorAll('.emoji-opt').forEach(btn =>
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmoji = btn.dataset.emoji;
      })
    );

    const close = () => {
      modal.classList.remove('modal-animate-in');
      overlay.classList.remove('modal-visible');
      setTimeout(() => overlay.remove(), 250);
    };

    modal.querySelector('#habit-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Delete
    if (isEdit) {
      modal.querySelector('#habit-delete').addEventListener('click', async () => {
        if (await RT.Utils.confirm(`Delete "${editHabit.name}" and all its entries?`, 'Delete')) {
          RT.Storage.getAllEntries(editHabit.id).forEach(en => RT.Storage.deleteEntry(en.id));
          RT.Storage.deleteHabit(editHabit.id);
          close();
          RT.Utils.showToast('Habit deleted', 'success');
          RT.App.navigate('home');
        }
      });
    }

    // Submit
    modal.querySelector('#habit-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = modal.querySelector('#habit-name').value.trim();
      const desc = modal.querySelector('#habit-desc').value.trim();
      const thr  = parseInt(modal.querySelector('#habit-threshold').value) || 0;
      if (!name) return;

      if (isEdit) {
        RT.Storage.updateHabit(editHabit.id, { name, emoji: selectedEmoji, description: desc, threshold: thr });
        RT.Utils.showToast('Habit updated', 'success');
      } else {
        RT.Storage.addHabit({ name, emoji: selectedEmoji, description: desc, threshold: thr });
        RT.Utils.showToast('Habit created!', 'success');
      }
      close();
      RT.App.refreshCurrentView();
    });
  }

  return { renderHomeView, showHabitModal };
})();
