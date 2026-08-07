<script>
  import { page } from '$app/stores';
  import { can }  from '$lib/auth/permissions.js';

  const baseItems = [
    { href: '/',           icon: 'fa-solid fa-house',         label: 'Dashboard',  perm: null },
    { href: '/items',      icon: 'fa-solid fa-boxes-stacked', label: 'Inventory',  perm: null },
    { href: '/scan',       icon: 'fa-solid fa-qrcode',        label: 'Scan QR',    perm: null },
    { href: '/categories', icon: 'fa-solid fa-tags',          label: 'Kategori',   perm: 'canManageCategories' },
    { href: '/locations',  icon: 'fa-solid fa-location-dot',  label: 'Lokasi',     perm: 'canManageLocations' },
    { href: '/reports',    icon: 'fa-solid fa-chart-bar',     label: 'Laporan',    perm: 'canViewReports' },
  ];

  $: navItems = baseItems.filter(i => !i.perm || can(i.perm));

  // Reactive terhadap $page — update setiap navigasi
  $: currentPath = $page.url.pathname.replace(/\/$/, '') || '/';
</script>

<aside class="sidebar">
  <nav class="sidebar-nav">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-item {currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href)) ? 'active' : ''}"
        title={item.label}
      >
        <i class="{item.icon} nav-icon"></i>
        <span class="nav-label">{item.label}</span>
      </a>
    {/each}
  </nav>

  <div class="sidebar-bottom">
    <div class="sidebar-divider"></div>
    {#if can('canSettings')}
      <a
        href="/settings"
        class="nav-item {currentPath === '/settings' || currentPath.startsWith('/settings/') ? 'active' : ''}"
      >
        <i class="fa-solid fa-gear nav-icon"></i>
        <span class="nav-label">Pengaturan</span>
      </a>
    {/if}
  </div>
</aside>

<style>
  .sidebar-nav {
    flex: 1;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar-bottom {
    padding: 8px;
  }

  .sidebar-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 6px 10px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: var(--text-muted);
    font-size: .875rem;
    font-weight: 500;
    transition: all .15s ease;
  }
  .nav-item:hover {
    background: var(--surface2);
    color: var(--text);
  }
  .nav-item.active {
    background: var(--primary-l);
    color: var(--primary);
    font-weight: 600;
  }
  .nav-icon { width: 16px; text-align: center; font-size: .9rem; flex-shrink: 0; }
  .nav-label { flex: 1; }
</style>
