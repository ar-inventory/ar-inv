<script>
  import { onMount }   from 'svelte';
  import { browser }   from '$app/environment';
  import { goto, beforeNavigate } from '$app/navigation';
  import { page }      from '$app/stores';
  import '../app.css';
  import '@fortawesome/fontawesome-free/css/all.min.css';

  import Header    from '$lib/components/Header.svelte';
  import Sidebar   from '$lib/components/Sidebar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';

  import { dbReady, dbError, dbLoading } from '$lib/stores/db.js';
  import { applyTheme, currentUser, unreadCount, notifications, loadCurrentUser } from '$lib/stores/ui.js';

  import { initDatabase }          from '$lib/db/database.js';
  import { seedDefaultData }       from '$lib/db/seed.js';
  import { getTheme, getSetting }  from '$lib/db/settings.js';
  import { hasAnyAdmin }           from '$lib/db/users.js';
  import { isLoggedIn }            from '$lib/auth/session.js';
  import { runNotificationEngine, getUnreadCount, getUnreadNotifications } from '$lib/db/notifications.js';

  function updateFavicon(src) {
    if (typeof document === 'undefined') return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = src;
    // Apple touch icon juga
    let apple = document.querySelector("link[rel='apple-touch-icon']");
    if (apple) apple.href = src;
  }

  // Halaman yang boleh diakses tanpa login
  const PUBLIC_ROUTES = ['/login', '/setup'];

  $: isPublicRoute = PUBLIC_ROUTES.some(r => $page.url.pathname.startsWith(r));

  // Guard navigasi — jalankan setiap perpindahan halaman
  beforeNavigate(({ to }) => {
    if (!browser) return;
    const dest = to?.url.pathname ?? '/';
    const pub  = PUBLIC_ROUTES.some(r => dest.startsWith(r));
    if (!pub && !isLoggedIn()) goto('/login');
  });

  onMount(async () => {
    if (!browser) return;
    try {
      await initDatabase();
      await seedDefaultData();

      // Cek apakah sudah ada admin
      const adminExists = hasAnyAdmin();

      // Load session
      const session = loadCurrentUser();

      // Routing logic berdasarkan kondisi
      const path = window.location.pathname;
      const pub  = PUBLIC_ROUTES.some(r => path.startsWith(r));

      if (!adminExists) {
        // Pertama kali — paksa ke setup
        if (path !== '/setup/') goto('/setup');
      } else if (!session) {
        // Belum login — paksa ke login
        if (!pub) goto('/login');
      }
      // Sudah login — lanjut

      // Load settings & theme
      const savedTheme = getTheme();
      applyTheme(savedTheme);

      // Sync favicon dengan logo perusahaan jika ada
      const logo = getSetting('company_logo');
      if (logo) updateFavicon(logo);

      // Notifikasi engine
      if (session) {
        runNotificationEngine();
        unreadCount.set(getUnreadCount());
        notifications.set(getUnreadNotifications());
      }

      dbLoading.set(false);
      dbReady.set(true);

    } catch (err) {
      console.error('[Layout]', err);
      dbError.set(err.message);
      dbLoading.set(false);
    }
  });
</script>

{#if $dbLoading}
  <div class="splash">
    <div class="splash-inner">
      <div class="splash-icon">
        <i class="fa-solid fa-boxes-stacked"></i>
      </div>
      <p class="splash-text">Memuat aplikasi...</p>
      <div class="spinner spinner-lg" style="margin-top:16px"></div>
    </div>
  </div>

{:else if $dbError}
  <div class="splash">
    <div class="splash-inner">
      <div class="splash-icon error">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <p class="splash-text">Gagal memuat database</p>
      <p class="splash-sub">{$dbError}</p>
      <button class="btn btn-primary" style="margin-top:16px" on:click={() => location.reload()}>
        <i class="fa-solid fa-rotate"></i> Coba Lagi
      </button>
    </div>
  </div>

{:else if isPublicRoute}
  <!-- Halaman publik (login/setup) — tanpa shell -->
  <slot />

{:else}
  <!-- App shell — hanya tampil jika sudah login -->
  <Header />
  <div class="app-layout">
    <Sidebar />
    <main class="main-content">
      <slot />
    </main>
  </div>
  <BottomNav />
{/if}

<style>
  .splash {
    min-height: 100vh; min-height: 100dvh;
    display: grid; place-items: center;
    background: var(--bg);
  }
  .splash-inner {
    display: flex; flex-direction: column;
    align-items: center; gap: 8px; padding: 40px;
  }
  .splash-icon {
    width: 72px; height: 72px;
    background: linear-gradient(135deg, var(--primary), #818cf8);
    border-radius: 20px;
    display: grid; place-items: center; margin-bottom: 8px;
  }
  .splash-icon i     { color: #fff; font-size: 2rem; }
  .splash-icon.error { background: var(--danger); }
  .splash-text { font-size: 1rem; font-weight: 600; color: var(--text); }
  .splash-sub  { font-size: .82rem; color: var(--text-muted); text-align: center; max-width: 280px; }
</style>
