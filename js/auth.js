/**
 * Recovery Tracker — Authentication
 * Handles login, registration, restore-from-Gist, and password changes.
 * Passwords are hashed with SHA-256 (salted by username) via Web Crypto API.
 */
'use strict';

RT.Auth = (() => {

  /* ─── Render the Auth View (Login / Register / Restore tabs) ─── */

  function renderAuthView() {
    const view = RT.Utils.$('#view-auth');

    view.innerHTML = `
      <div class="auth-container">
        <div class="auth-logo">
          <span class="auth-logo-icon">🛡️</span>
          <h1 class="auth-title">Recovery Tracker</h1>
          <p class="auth-subtitle">Track · Visualize · Recover</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Login</button>
          <button class="auth-tab" data-tab="register">Register</button>
          <button class="auth-tab" data-tab="restore">Restore</button>
        </div>

        <div class="auth-forms">
          <!-- ─── Login ─── -->
          <form id="form-login" class="auth-form active">
            <div class="form-group">
              <label for="login-username">Username</label>
              <input type="text" id="login-username" required autocomplete="username">
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" required autocomplete="current-password">
            </div>
            <label class="form-checkbox">
              <input type="checkbox" id="login-remember">
              <span>Remember me</span>
            </label>
            <div class="form-error" id="login-error"></div>
            <button type="submit" class="btn btn-primary btn-full">Sign In</button>
          </form>

          <!-- ─── Register ─── -->
          <form id="form-register" class="auth-form">
            <div class="form-group">
              <label for="reg-username">Username</label>
              <input type="text" id="reg-username" required autocomplete="username" minlength="3">
            </div>
            <div class="form-group">
              <label for="reg-password">Password</label>
              <input type="password" id="reg-password" required autocomplete="new-password" minlength="6">
            </div>
            <div class="form-group">
              <label for="reg-confirm">Confirm Password</label>
              <input type="password" id="reg-confirm" required autocomplete="new-password">
            </div>
            <div class="form-group">
              <label for="reg-pat">GitHub Personal Access Token</label>
              <input type="password" id="reg-pat" required>
              <span class="form-hint">Required for cross-device sync.
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">Create one here ↗</a>
              </span>
            </div>
            <div class="form-error" id="register-error"></div>
            <button type="submit" class="btn btn-primary btn-full">Create Account</button>
          </form>

          <!-- ─── Restore ─── -->
          <form id="form-restore" class="auth-form">
            <div class="form-group">
              <label for="restore-username">Username</label>
              <input type="text" id="restore-username" required autocomplete="username">
            </div>
            <div class="form-group">
              <label for="restore-password">Password</label>
              <input type="password" id="restore-password" required autocomplete="current-password">
            </div>
            <div class="form-group">
              <label for="restore-pat">GitHub Personal Access Token</label>
              <input type="password" id="restore-pat" required>
            </div>
            <div class="form-error" id="restore-error"></div>
            <button type="submit" class="btn btn-primary btn-full">Restore Account</button>
          </form>
        </div>
      </div>`;

    // Tab switching
    view.querySelectorAll('.auth-tab').forEach(tab =>
      tab.addEventListener('click', () => switchTab(tab.dataset.tab))
    );

    // Form handlers
    RT.Utils.$('#form-login').addEventListener('submit', handleLogin);
    RT.Utils.$('#form-register').addEventListener('submit', handleRegister);
    RT.Utils.$('#form-restore').addEventListener('submit', handleRestore);

    // Show register tab if no user exists, login otherwise
    switchTab(RT.Storage.getUser() ? 'login' : 'register');
  }

  function switchTab(name) {
    RT.Utils.$$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    RT.Utils.$$('.auth-form').forEach(f => f.classList.remove('active'));
    RT.Utils.$(`#form-${name}`).classList.add('active');
  }

  /* ─── Login ─── */

  async function handleLogin(e) {
    e.preventDefault();
    const err = RT.Utils.$('#login-error');
    err.textContent = '';

    const username = RT.Utils.$('#login-username').value.trim();
    const password = RT.Utils.$('#login-password').value;
    const remember = RT.Utils.$('#login-remember').checked;

    const user = RT.Storage.getUser();
    if (!user) { err.textContent = 'No account found. Please register first.'; return; }
    if (user.username.toLowerCase() !== username.toLowerCase()) { err.textContent = 'Invalid username or password.'; return; }

    const hash = await RT.Utils.hashPassword(username, password);
    if (hash !== user.passwordHash) { err.textContent = 'Invalid username or password.'; return; }

    RT.Storage.saveSession({ loggedIn: true, username: user.username }, remember);
    RT.Utils.showToast('Welcome back!', 'success');
    RT.App.onLoginSuccess();
  }

  /* ─── Register ─── */

  async function handleRegister(e) {
    e.preventDefault();
    const err = RT.Utils.$('#register-error');
    err.textContent = '';

    const username = RT.Utils.$('#reg-username').value.trim();
    const password = RT.Utils.$('#reg-password').value;
    const confirm  = RT.Utils.$('#reg-confirm').value;
    const pat      = RT.Utils.$('#reg-pat').value.trim();

    if (username.length < 3) { err.textContent = 'Username must be at least 3 characters.'; return; }
    if (password.length < 6) { err.textContent = 'Password must be at least 6 characters.'; return; }
    if (password !== confirm) { err.textContent = 'Passwords do not match.'; return; }
    if (!pat.startsWith('ghp_') && !pat.startsWith('github_pat_')) {
      err.textContent = 'Invalid GitHub token. It should start with ghp_ or github_pat_.'; return;
    }
    if (RT.Storage.getUser()) {
      err.textContent = 'An account already exists. Login or reset data in Settings.'; return;
    }

    const hash = await RT.Utils.hashPassword(username, password);
    RT.Storage.setUser({ username, passwordHash: hash, createdAt: new Date().toISOString() });

    // Save PAT & create Gist
    const config = RT.Storage.loadConfig();
    config.pat = pat;

    RT.Utils.showToast('Setting up secure sync…', 'info');
    try {
      config.gistId = await RT.Sync.createGist(pat, username);
      RT.Utils.showToast('Account created!', 'success');
    } catch (ex) {
      console.error('Gist creation failed:', ex);
      RT.Utils.showToast('Account created — sync setup failed. Check your PAT.', 'warning');
    }
    RT.Storage.saveConfig(config);

    RT.Storage.saveSession({ loggedIn: true, username }, true);
    RT.App.onLoginSuccess();
  }

  /* ─── Restore ─── */

  async function handleRestore(e) {
    e.preventDefault();
    const err = RT.Utils.$('#restore-error');
    err.textContent = '';

    const username = RT.Utils.$('#restore-username').value.trim();
    const password = RT.Utils.$('#restore-password').value;
    const pat      = RT.Utils.$('#restore-pat').value.trim();

    if (!username || !password || !pat) { err.textContent = 'All fields are required.'; return; }

    err.textContent = 'Searching for your data…';

    try {
      const remote = await RT.Sync.findAndRestoreGist(pat, username);
      if (!remote) { err.textContent = 'No Recovery Tracker data found for this username.'; return; }

      const hash = await RT.Utils.hashPassword(username, password);
      if (hash !== remote.user.passwordHash) { err.textContent = 'Invalid password for this account.'; return; }

      // Restore data
      RT.Storage.setDataFromSync(remote);

      const config = RT.Storage.loadConfig();
      config.pat = pat;
      config.gistId = remote._gistId || '';
      config.lastSyncTime = new Date().toISOString();
      RT.Storage.saveConfig(config);

      RT.Storage.saveSession({ loggedIn: true, username }, true);
      RT.Utils.showToast('Account restored!', 'success');
      RT.App.onLoginSuccess();
    } catch (ex) {
      err.textContent = 'Restore failed: ' + ex.message;
    }
  }

  /* ─── Change Password ─── */

  async function changePassword(currentPwd, newPwd) {
    const user = RT.Storage.getUser();
    if (!user) throw new Error('No user found');

    const curHash = await RT.Utils.hashPassword(user.username, currentPwd);
    if (curHash !== user.passwordHash) throw new Error('Current password is incorrect.');

    const newHash = await RT.Utils.hashPassword(user.username, newPwd);
    RT.Storage.setUser({ ...user, passwordHash: newHash });
  }

  /* ─── Session Helpers ─── */

  function isLoggedIn() {
    const s = RT.Storage.loadSession();
    return !!(s && s.loggedIn);
  }

  function logout() {
    RT.Storage.clearSession();
    RT.App.navigate('auth');
  }

  return { renderAuthView, isLoggedIn, logout, changePassword };
})();
