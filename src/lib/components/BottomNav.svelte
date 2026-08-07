<script>
  import { page }        from '$app/stores';
  import { unreadCount } from '$lib/stores/ui.js';
  import { can }         from '$lib/auth/permissions.js';

  const baseItems = [
    { href: '/',        icon: 'fa-solid fa-house',         label: 'Dashboard', perm: null },
    { href: '/items',   icon: 'fa-solid fa-boxes-stacked', label: 'Inventory', perm: null },
    { href: '/scan',    icon: 'fa-solid fa-qrcode',        label: 'Scan',      perm: null, center: true },
    { href: '/reports', icon: 'fa-solid fa-chart-bar',     label: 'Laporan',   perm: 'canViewReports' },
    { href: '/settings',icon: 'fa-solid fa-gear',          label: 'Pengaturan',perm: 'canSettings' },
  ];

  $: navItems = baseItems.filter(i => !i.perm || can(i.perm));

  $: currentPath = $page.url.pathname.replace(/\/$/, '') || '/';
</script>

<nav class="bottom-nav">
  {#each navItems as item}
    {#if item.center}
      <a href={item.href} class="nav-center-wrap">
        <span class="nav-center-btn {currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href)) ? 'active-scan' : ''}">
          <i class="{item.icon}"></i>
        </span>
        <span class="nav-center-label">{item.label}</span>
      </a>
    {:else}
      <a href={item.href} class="nav-item {currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href)) ? 'active' : ''}">
        <span class="nav-icon-wrap">
          <i class="{item.icon}"></i>
          {#if item.href === '/' && $unreadCount > 0}
            <span class="nav-badge">{$unreadCount > 9 ? '9+' : $unreadCount}</span>
          {/if}
        </span>
        <span class="nav-label">{item.label}</span>
      </a>
    {/if}
  {/each}
</nav>

<style>
  .bottom-nav {
    align-items: stretch;
    justify-content: space-around;
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 8px 4px;
    text-decoration: none;
    color: var(--text-muted);
    font-size: .65rem;
    font-weight: 500;
    transition: color .15s;
    position: relative;
  }
  .nav-item.active { color: var(--primary); }
  .nav-item.active i { font-size: 1.1rem; }

  .nav-icon-wrap { position: relative; display: grid; place-items: center; }
  .nav-icon-wrap i { font-size: 1rem; }
  .nav-badge {
    position: absolute; top: -5px; right: -7px;
    background: var(--danger); color: #fff;
    font-size: .55rem; font-weight: 700;
    min-width: 14px; height: 14px;
    border-radius: 7px; padding: 0 3px;
    display: grid; place-items: center;
  }
  .nav-label { line-height: 1; }

  /* Tombol Scan menonjol di tengah */
  .nav-center-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding-bottom: 8px;
    gap: 3px;
    text-decoration: none;
    position: relative;
  }
  .nav-center-btn {
    width: 50px; height: 50px;
    background: var(--primary);
    border-radius: 50%;
    display: grid; place-items: center;
    box-shadow: 0 4px 12px rgba(99,102,241,.4);
    position: absolute;
    top: -16px;
    transition: all .2s;
  }
  .nav-center-btn i { color: #fff; font-size: 1.2rem; }
  .nav-center-btn.active-scan { background: var(--primary-h); transform: scale(1.05); }
  .nav-center-btn:hover { transform: scale(1.08); }

  .nav-center-label {
    font-size: .65rem;
    font-weight: 500;
    color: var(--text-muted);
    margin-top: 36px;
  }
</style>
