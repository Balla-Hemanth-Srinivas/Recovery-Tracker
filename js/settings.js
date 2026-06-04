/**
 * Recovery Tracker — Settings Module
 * Theme, habit editing, password change, export/import, logout, reset, about.
 */
'use strict';

RT.Settings = (() => {

  function renderSettingsView() {
    const view   = RT.Utils.$('#view-settings');
    const config = RT.Storage.loadConfig();
    const theme  = config.theme || 'system';
    const habits = RT.Storage.getHabits();

    view.innerHTML = `
      <div class="view-header"><h1 class="view-title">Settings</h1></div>

      <div class="settings-list">

        <!-- Appearance -->
        <h3 class="section-title">Appearance</h3>
        <div class="setting-row card">
          <span class="setting-label">🎨  Theme</span>
          <select class="setting-select" id="theme-select">
            <option value="system" ${theme==='system'?'selected':''}>System Default</option>
            <option value="light"  ${theme==='light'?'selected':''}>Light</option>
            <option value="dark"   ${theme==='dark'?'selected':''}>Dark</option>
          </select>
        </div>

        ${habits.length ? `
        <!-- Habits -->
        <h3 class="section-title">Habits</h3>
        ${habits.map(h => `
          <div class="setting-row card setting-tap" data-action="edit-habit" data-id="${h.id}">
            <span class="setting-label">${h.emoji}  ${h.name}</span>
            <span class="setting-chevron">›</span>
          </div>`).join('')}
        ` : ''}

        <!-- Account -->
        <h3 class="section-title">Account</h3>
        <div class="setting-row card setting-tap" data-action="change-password">
          <span class="setting-label">🔒  Change Password</span>
          <span class="setting-chevron">›</span>
        </div>

        <!-- Data -->
        <h3 class="section-title">Data</h3>
        <div class="setting-row card setting-tap" data-action="export">
          <span class="setting-label">📤  Export JSON</span>
          <span class="setting-chevron">›</span>
        </div>
        <div class="setting-row card setting-tap" data-action="import">
          <span class="setting-label">📥  Import JSON</span>
          <span class="setting-chevron">›</span>
        </div>

        <!-- Session -->
        <h3 class="section-title">Session</h3>
        <div class="setting-row card setting-tap" data-action="logout">
          <span class="setting-label">🚪  Logout</span>
        </div>
        <div class="setting-row card setting-tap setting-danger" data-action="reset">
          <span class="setting-label">⚠️  Reset All Data</span>
        </div>

        <!-- About -->
        <div class="about-card card">
          <h3>Recovery Tracker</h3>
          <p class="about-ver">Version 1.0.0</p>
          <p class="about-desc">Your data is stored locally and synced privately via GitHub Gist.</p>
        </div>
      </div>`;

    // Theme change
    view.querySelector('#theme-select').addEventListener('change', e => {
      config.theme = e.target.value;
      RT.Storage.saveConfig(config);
      RT.App.applyTheme();
      RT.Utils.showToast('Theme updated', 'success');
    });

    // Tappable rows
    view.querySelectorAll('.setting-tap').forEach(row =>
      row.addEventListener('click', () => handleAction(row.dataset.action, row.dataset.id))
    );
  }

  function handleAction(action, id) {
    switch (action) {
      case 'edit-habit':      { const h = RT.Storage.getHabit(id); if (h) RT.Habits.showHabitModal(h); break; }
      case 'change-password': showPasswordModal(); break;
      case 'export':          doExport();           break;
      case 'import':          doImport();           break;
      case 'logout':          doLogout();           break;
      case 'reset':           doReset();            break;
    }
  }

  /* ─── Change Password Modal ─── */

  function showPasswordModal() {
    const overlay = RT.Utils.createElement('div', { className: 'modal-overlay modal-visible' });
    const modal   = RT.Utils.createElement('div', { className: 'modal' });

    modal.innerHTML = `
      <h2 class="modal-title">Change Password</h2>
      <form id="pw-form">
        <div class="form-group">
          <label for="pw-current">Current Password</label>
          <input type="password" id="pw-current" required>
        </div>
        <div class="form-group">
          <label for="pw-new">New Password</label>
          <input type="password" id="pw-new" required minlength="6">
        </div>
        <div class="form-group">
          <label for="pw-confirm">Confirm New Password</label>
          <input type="password" id="pw-confirm" required>
        </div>
        <div class="form-error" id="pw-error"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="pw-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Update</button>
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

    modal.querySelector('#pw-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    modal.querySelector('#pw-form').addEventListener('submit', async e => {
      e.preventDefault();
      const err     = modal.querySelector('#pw-error');
      const cur     = modal.querySelector('#pw-current').value;
      const newPwd  = modal.querySelector('#pw-new').value;
      const conf    = modal.querySelector('#pw-confirm').value;

      if (newPwd !== conf) { err.textContent = 'New passwords do not match.'; return; }
      try {
        await RT.Auth.changePassword(cur, newPwd);
        close();
        RT.Utils.showToast('Password changed', 'success');
      } catch (ex) { err.textContent = ex.message; }
    });
  }

  /* ─── Export ─── */

  function doExport() {
    const json = JSON.stringify(RT.Storage.exportData(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `recovery-tracker-${RT.Utils.today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    RT.Utils.showToast('Data exported', 'success');
  }

  /* ─── Import ─── */

  function doImport() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (await RT.Utils.confirm('Import will replace all current data. Continue?', 'Import')) {
          RT.Storage.importData(data);
          RT.Utils.showToast('Data imported', 'success');
          RT.App.refreshCurrentView();
        }
      } catch { RT.Utils.showToast('Invalid file format', 'error'); }
    });
    input.click();
  }

  /* ─── Logout / Reset ─── */

  async function doLogout() {
    if (await RT.Utils.confirm('Logout from this device?', 'Logout')) RT.Auth.logout();
  }

  async function doReset() {
    if (await RT.Utils.confirm('⚠️ This permanently deletes ALL data. Cannot be undone!', 'Reset Everything')) {
      RT.Storage.resetAll();
      RT.Utils.showToast('All data cleared', 'info');
      window.location.reload();
    }
  }

  return { renderSettingsView };
})();
