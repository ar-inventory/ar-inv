<script>
  import { goto } from '$app/navigation';
  import { dbReady } from '$lib/stores/db.js';
  import { currentUser } from '$lib/stores/ui.js';
  import { getActiveUsers, verifyUserPassword, getInitials } from '$lib/db/users.js';
  import { setSession, isLoggedIn } from '$lib/auth/session.js';
  import { getSetting } from '$lib/db/settings.js';
  import { hasAnyAdmin } from '$lib/db/users.js';
  import { toastError } from '$lib/utils/swal.js';

  let users        = [];
  let companyName  = '';
  let companyLogo  = '';
  let selected     = null;   // user yang dipilih
  let password     = '';
  let showPassword = false;
  let logging      = false;
  let errorMsg     = '';

  $: if ($dbReady) init();

  function init() {
    // Belum ada admin dengan password → ke setup
    if (!hasAnyAdmin()) { goto('/setup'); return; }
    // Sudah login → ke dashboard
    if (isLoggedIn()) { goto('/'); return; }

    // Hanya tampilkan user yang punya password_hash
    users       = getActiveUsers().filter(u => u.password_hash);
    companyName = getSetting('company_name', 'Inventory App');
    companyLogo = getSetting('company_logo', '');
  }

  function selectUser(user) {
    selected  = user;
    password  = '';
    errorMsg  = '';
    // Auto-focus password field
    setTimeout(() => document.getElementById('login-pass')?.focus(), 50);
  }

  function backToUsers() {
    selected = null;
    password = '';
    errorMsg = '';
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!selected || !password) return;
    logging  = true;
    errorMsg = '';

    try {
      const ok = await verifyUserPassword(selected.id, password);
      if (!ok) {
        errorMsg = 'Password salah. Silakan coba lagi.';
        password = '';
        logging  = false;
        document.getElementById('login-pass')?.focus();
        return;
      }

      // Set session
      setSession({
        user_id:      selected.id,
        user_name:    selected.name,
        role:         selected.role,
        avatar_color: selected.avatar_color
      });

      // Update store
      currentUser.set({
        id:           selected.id,
        name:         selected.name,
        role:         selected.role,
        avatar_color: selected.avatar_color
      });

      goto('/');
    } catch (err) {
      toastError('Login gagal: ' + err.message);
      logging = false;
    }
  }

  const ROLE_LABELS = {
    admin:      'Admin',
    technician: 'Teknisi',
    staff:      'Staff',
    viewer:     'Viewer'
  };
  const ROLE_ICONS = {
    admin:      'fa-solid fa-shield-halved',
    technician: 'fa-solid fa-screwdriver-wrench',
    staff:      'fa-solid fa-user',
    viewer:     'fa-solid fa-eye'
  };
</script>

<svelte:head><title>Login — Inventory App</title></svelte:head>

<div class="login-page">
  <div class="login-card">

    <!-- Company header -->
    <div class="login-brand">
      {#if companyLogo}
        <img src={companyLogo} alt="Logo" class="brand-logo" />
      {:else}
        <div class="brand-icon">
          <i class="fa-solid fa-boxes-stacked"></i>
        </div>
      {/if}
      <div>
        <h1 class="brand-name">{companyName}</h1>
        <p class="brand-sub">Inventory App</p>
      </div>
    </div>

    <!-- PILIH USER -->
    {#if !selected}
      <div class="login-section">
        <h2 class="section-title">Siapa Anda?</h2>
        <p class="section-sub">Pilih akun untuk masuk</p>

        {#if users.length === 0}
          <div class="empty-users">
            <i class="fa-solid fa-users-slash" style="font-size:2rem;color:var(--text-muted)"></i>
            <p>Tidak ada akun aktif.</p>
            <a href="/setup" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-plus"></i> Buat Akun Admin
            </a>
          </div>
        {:else}
          <div class="user-list">
            {#each users as user}
              <button class="user-card" on:click={() => selectUser(user)}>
                <div class="user-avatar" style="background:{user.avatar_color}">
                  {getInitials(user.name)}
                </div>
                <div class="user-info">
                  <span class="user-name">{user.name}</span>
                  <span class="user-role">
                    <i class="{ROLE_ICONS[user.role] ?? 'fa-solid fa-user'}" style="font-size:.65rem"></i>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </div>
                <i class="fa-solid fa-chevron-right" style="color:var(--border);font-size:.75rem"></i>
              </button>
            {/each}
          </div>
        {/if}
      </div>

    <!-- MASUK PASSWORD -->
    {:else}
      <form class="login-section" on:submit={handleLogin}>
        <button type="button" class="back-btn" on:click={backToUsers}>
          <i class="fa-solid fa-arrow-left"></i> Ganti akun
        </button>

        <!-- Profil yang dipilih -->
        <div class="selected-user">
          <div class="user-avatar-lg" style="background:{selected.avatar_color}">
            {getInitials(selected.name)}
          </div>
          <div>
            <p class="sel-name">{selected.name}</p>
            <p class="sel-role">
              <i class="{ROLE_ICONS[selected.role] ?? 'fa-solid fa-user'}" style="font-size:.65rem"></i>
              {ROLE_LABELS[selected.role] ?? selected.role}
            </p>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="login-pass">Password</label>
          <div class="input-eye">
            <input
              id="login-pass"
              class="form-input {errorMsg ? 'input-error' : ''}"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              placeholder="Masukkan password"
              autocomplete="current-password"
            />
            <button
              type="button" class="eye-btn"
              on:click={() => showPassword = !showPassword}
              aria-label="{showPassword ? 'Sembunyikan' : 'Tampilkan'} password">
              <i class="fa-solid {showPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>
            </button>
          </div>
          {#if errorMsg}
            <p class="form-error">
              <i class="fa-solid fa-circle-exclamation" style="font-size:.65rem"></i>
              {errorMsg}
            </p>
          {/if}
        </div>

        <button type="submit" class="btn btn-primary btn-block" disabled={logging || !password}>
          {#if logging}
            <span class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            Memverifikasi...
          {:else}
            <i class="fa-solid fa-right-to-bracket"></i> Masuk
          {/if}
        </button>
      </form>
    {/if}

  </div>
</div>

<style>
  .login-page {
    min-height: 100vh; min-height: 100dvh;
    display: grid; place-items: center;
    background: var(--bg); padding: 20px;
  }

  .login-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    width: 100%; max-width: 400px;
    overflow: hidden;
  }

  /* Brand header */
  .login-brand {
    display: flex; align-items: center; gap: 14px;
    padding: 24px 24px 20px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, var(--primary) 0%, #818cf8 100%);
  }
  .brand-icon {
    width: 48px; height: 48px; border-radius: 12px;
    background: rgba(255,255,255,.2);
    display: grid; place-items: center; flex-shrink: 0;
  }
  .brand-icon i  { color: #fff; font-size: 1.3rem; }
  .brand-logo    { width: 48px; height: 48px; border-radius: 12px; object-fit: contain; flex-shrink: 0; }
  .brand-name    { font-size: 1.1rem; font-weight: 800; color: #fff; }
  .brand-sub     { font-size: .75rem; color: rgba(255,255,255,.75); margin-top: 1px; }

  /* Section */
  .login-section  { padding: 24px; }
  .section-title  { font-size: 1rem; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .section-sub    { font-size: .82rem; color: var(--text-muted); margin-bottom: 16px; }

  /* User list */
  .user-list   { display: flex; flex-direction: column; gap: 6px; }
  .user-card {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    background: var(--surface2); cursor: pointer;
    transition: all .15s; text-align: left; width: 100%;
  }
  .user-card:hover { border-color: var(--primary); background: var(--primary-l); }
  .user-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    display: grid; place-items: center;
    font-size: .82rem; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .user-info   { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .user-name   { font-size: .9rem; font-weight: 600; color: var(--text); }
  .user-role   { font-size: .72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }

  .empty-users {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 24px; text-align: center;
    color: var(--text-muted); font-size: .85rem;
  }

  /* Password form */
  .back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: .8rem; color: var(--text-muted);
    background: none; border: none; cursor: pointer;
    padding: 0; margin-bottom: 16px;
    transition: color .15s;
  }
  .back-btn:hover { color: var(--primary); }

  .selected-user {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; margin-bottom: 20px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .user-avatar-lg {
    width: 46px; height: 46px; border-radius: 50%;
    display: grid; place-items: center;
    font-size: .95rem; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .sel-name { font-size: .95rem; font-weight: 700; color: var(--text); }
  .sel-role { font-size: .75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }

  .input-eye     { position: relative; }
  .input-eye .form-input { padding-right: 42px; }
  .eye-btn {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); font-size: .9rem; padding: 4px;
  }
  .eye-btn:hover { color: var(--text); }

  .input-error { border-color: var(--danger) !important; }
  .input-error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important; }

  .btn-block { width: 100%; justify-content: center; padding: 12px; font-size: .95rem; }
</style>
