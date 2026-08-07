<script>
  import { goto }        from '$app/navigation';
  import { currentUser, applyTheme, theme, unreadCount } from '$lib/stores/ui.js';
  import { clearSession }  from '$lib/auth/session.js';
  import { getSetting }    from '$lib/db/settings.js';
  import { dbReady }       from '$lib/stores/db.js';
  import { getInitials }   from '$lib/db/users.js';
  import { ROLE_LABELS }   from '$lib/utils/format.js';
  import { confirmAction } from '$lib/utils/swal.js';
  import NotificationPanel from './NotificationPanel.svelte';

  let companyName = 'Inventory App';
  let companyLogo = null;
  let showUserMenu = false;

  $: if ($dbReady) {
    companyName = getSetting('company_name', 'Inventory App');
    companyLogo = getSetting('company_logo', null);
  }

  function toggleTheme() {
    const next = $theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    import('$lib/db/settings.js').then(m => m.setSetting('theme', next));
  }

  async function handleLogout() {
    const ok = await confirmAction('Keluar dari aplikasi?', 'Session Anda akan diakhiri.');
    if (!ok) return;
    clearSession();
    currentUser.set(null);
    goto('/login');
  }

  function closeMenu() { showUserMenu = false; }
</script>

<svelte:window on:click={(e) => { if (!e.target.closest('.user-menu-wrap')) closeMenu(); }} />

<header class="app-header">
  <!-- LEFT: Logo + Nama -->
  <div class="header-left">
    <a href="/" class="brand">
      {#if companyLogo}
        <img src={companyLogo} alt="Logo" class="brand-logo" />
      {:else}
        <div class="brand-icon">
          <i class="fa-solid fa-boxes-stacked"></i>
        </div>
      {/if}
      <span class="brand-name">{companyName}</span>
    </a>
  </div>

  <!-- RIGHT: Actions -->
  <div class="header-right">
    <!-- Theme toggle -->
    <button class="btn-icon" on:click={toggleTheme} title="Ganti tema" aria-label="Ganti tema">
      <i class="fa-solid {$theme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>
    </button>

    <!-- Notifications -->
    <NotificationPanel />

    <!-- User menu -->
    {#if $currentUser}
      <div class="user-menu-wrap">
        <button class="user-btn" on:click={() => showUserMenu = !showUserMenu}
                aria-label="Menu pengguna">
          <span class="user-avatar" style="background:{$currentUser.avatar_color}">
            {getInitials($currentUser.name)}
          </span>
          <div class="user-text hide-mobile">
            <span class="user-name">{$currentUser.name}</span>
            <span class="user-role">{ROLE_LABELS[$currentUser.role] ?? $currentUser.role}</span>
          </div>
          <i class="fa-solid fa-chevron-down hide-mobile" style="font-size:.65rem;color:var(--text-muted)"></i>
        </button>

        {#if showUserMenu}
          <div class="user-dropdown">
            <div class="dropdown-header">
              <span class="user-avatar-sm" style="background:{$currentUser.avatar_color}">
                {getInitials($currentUser.name)}
              </span>
              <div>
                <p class="dd-name">{$currentUser.name}</p>
                <p class="dd-role">{ROLE_LABELS[$currentUser.role] ?? $currentUser.role}</p>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <a href="/settings" class="dropdown-item" on:click={closeMenu}>
              <i class="fa-solid fa-gear"></i> Pengaturan
            </a>
            <button class="dropdown-item danger" on:click={handleLogout}>
              <i class="fa-solid fa-right-from-bracket"></i> Keluar
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</header>

<style>
  .header-left { display: flex; align-items: center; }
  .header-right { display: flex; align-items: center; gap: 4px; }

  .brand {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; color: var(--text);
  }
  .brand-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, var(--primary), #818cf8);
    border-radius: var(--radius-sm);
    display: grid; place-items: center; flex-shrink: 0;
  }
  .brand-icon i { color: #fff; font-size: .9rem; }
  .brand-logo   { width: 36px; height: 36px; border-radius: var(--radius-sm); object-fit: contain; }
  .brand-name {
    font-size: 1rem; font-weight: 700; letter-spacing: -.3px;
    white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis;
    max-width: clamp(100px, 30vw, 220px);
  }
  @media (min-width: 1024px) {
    .brand-name { max-width: 280px; }
  }
  /* Mobile: sembunyikan nama, cukup logo */
  @media (max-width: 640px) {
    .brand-name { display: none; }
  }

  /* User button */
  .user-menu-wrap { position: relative; }
  .user-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 8px; border: 1px solid var(--border);
    border-radius: var(--radius-sm); background: var(--surface2);
    cursor: pointer; transition: all .15s;
  }
  .user-btn:hover { border-color: var(--primary); }
  .user-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    display: grid; place-items: center;
    font-size: .72rem; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .user-text   { display: flex; flex-direction: column; gap: 0; text-align: left; }
  .user-name   { font-size: .78rem; font-weight: 600; color: var(--text); line-height: 1.2; }
  .user-role   { font-size: .65rem; color: var(--text-muted); text-transform: capitalize; }

  /* Dropdown */
  .user-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow-lg);
    min-width: 200px; z-index: 200; overflow: hidden;
    animation: fadeDown .15s ease;
  }
  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dropdown-header {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; background: var(--surface2);
  }
  .user-avatar-sm {
    width: 32px; height: 32px; border-radius: 50%;
    display: grid; place-items: center;
    font-size: .72rem; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .dd-name { font-size: .85rem; font-weight: 600; color: var(--text); }
  .dd-role { font-size: .7rem; color: var(--text-muted); text-transform: capitalize; }
  .dropdown-divider { height: 1px; background: var(--border); }
  .dropdown-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; font-size: .85rem; color: var(--text);
    text-decoration: none; background: none; border: none;
    cursor: pointer; width: 100%; text-align: left;
    transition: background .12s;
  }
  .dropdown-item:hover { background: var(--surface2); }
  .dropdown-item.danger { color: var(--danger); }
  .dropdown-item.danger:hover { background: var(--danger-l); }

  @media (max-width: 480px) { .hide-mobile { display: none; } }
</style>
