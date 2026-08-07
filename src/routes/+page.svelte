<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { dbReady } from '$lib/stores/db.js';
  import { currentUser, unreadCount } from '$lib/stores/ui.js';
  import { getItemStats, getStatsByCategory } from '$lib/db/items.js';
  import { getRecentActivity, ACTION_LABELS, ACTION_ICONS } from '$lib/db/activity.js';
  import { getUnreadNotifications, NOTIF_ICONS, NOTIF_LABELS } from '$lib/db/notifications.js';
  import { markAsRead } from '$lib/db/notifications.js';
  import { formatCurrency, timeAgo, STATUS_COLORS } from '$lib/utils/format.js';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let stats         = { total: 0, available: 0, inUse: 0, maintenance: 0, retired: 0, totalValue: 0 };
  let recentActivity = [];
  let alertNotifs   = [];
  let categoryStats = [];

  $: if ($dbReady) loadDashboard();

  function loadDashboard() {
    stats          = getItemStats();
    recentActivity = getRecentActivity(7);
    alertNotifs    = getUnreadNotifications().slice(0, 5);
    categoryStats  = getStatsByCategory().slice(0, 6);
  }

  function handleNotifClick(notif) {
    markAsRead(notif.id);
    unreadCount.update(n => Math.max(0, n - 1));
    alertNotifs = alertNotifs.filter(n => n.id !== notif.id);
    goto(`/items/${notif.item_id}`);
  }

  const summaryCards = [
    { key: 'total',       label: 'Total Item',   icon: 'fa-solid fa-boxes-stacked', color: 'var(--primary)',   bg: 'var(--primary-l)' },
    { key: 'available',   label: 'Tersedia',     icon: 'fa-solid fa-circle-check',  color: 'var(--accent)',    bg: 'var(--accent-l)'  },
    { key: 'inUse',       label: 'Digunakan',    icon: 'fa-solid fa-person-walking', color: 'var(--warning)',  bg: 'var(--warning-l)' },
    { key: 'maintenance', label: 'Maintenance',  icon: 'fa-solid fa-screwdriver-wrench', color: 'var(--info)', bg: 'var(--info-l)'   },
  ];
</script>

<svelte:head><title>Dashboard — Inventory</title></svelte:head>

<div class="page-container">

  <!-- Page header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">
        {#if $currentUser}
          Halo, {$currentUser.name.split(' ')[0]}
        {:else}
          Dashboard
        {/if}
      </h1>
      <p class="page-subtitle">Ringkasan inventory Anda hari ini</p>
    </div>
    <div class="header-actions">
      <a href="/scan" class="btn btn-primary">
        <i class="fa-solid fa-qrcode"></i>
        <span class="hide-sm">Scan QR</span>
      </a>
      <a href="/items/new" class="btn btn-secondary">
        <i class="fa-solid fa-plus"></i>
        <span class="hide-sm">Tambah Item</span>
      </a>
    </div>
  </div>

  <!-- Summary cards -->
  <div class="summary-grid">
    {#each summaryCards as card}
      <a href="/items{card.key !== 'total' ? '?status=' + (card.key === 'inUse' ? 'in_use' : card.key) : ''}" class="summary-card card card-hover">
        <div class="card-icon" style="background:{card.bg}; color:{card.color}">
          <i class="{card.icon}"></i>
        </div>
        <div class="card-body">
          <span class="card-value">{stats[card.key]}</span>
          <span class="card-label">{card.label}</span>
        </div>
      </a>
    {/each}
  </div>

  <!-- Nilai aset -->
  {#if stats.totalValue > 0}
    <div class="asset-value-bar card">
      <i class="fa-solid fa-money-bill-wave" style="color:var(--accent)"></i>
      <span>Estimasi Total Nilai Aset</span>
      <strong class="ml-auto" style="color:var(--accent)">{formatCurrency(stats.totalValue)}</strong>
    </div>
  {/if}

  <div class="dashboard-grid">

    <!-- Notifikasi perlu perhatian -->
    {#if alertNotifs.length > 0}
      <section class="dash-section full-width">
        <div class="section-header">
          <h2 class="section-title">
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--warning)"></i>
            Perlu Perhatian
          </h2>
          <a href="/reports" class="section-link">Lihat semua</a>
        </div>
        <div class="alert-list">
          {#each alertNotifs as notif}
            <button class="alert-item card" on:click={() => handleNotifClick(notif)}>
              <div class="alert-icon">
                <i class="{NOTIF_ICONS[notif.type] ?? 'fa-solid fa-bell'}"></i>
              </div>
              <div class="alert-body">
                <p class="alert-msg">{notif.message}</p>
                {#if notif.item_name}
                  <span class="alert-sub">
                    {#if notif.category_icon}
                      <i class="{notif.category_icon}" style="font-size:.7rem"></i>
                    {/if}
                    {notif.item_name}
                  </span>
                {/if}
              </div>
              <i class="fa-solid fa-chevron-right" style="color:var(--text-muted);font-size:.75rem;flex-shrink:0"></i>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Aktivitas terbaru -->
    <section class="dash-section">
      <div class="section-header">
        <h2 class="section-title">
          <i class="fa-solid fa-clock-rotate-left" style="color:var(--primary)"></i>
          Aktivitas Terbaru
        </h2>
      </div>
      {#if recentActivity.length === 0}
        <EmptyState
          icon="fa-solid fa-clock-rotate-left"
          title="Belum ada aktivitas"
          message="Aktivitas akan muncul setelah Anda menambah atau mengubah item."
        />
      {:else}
        <div class="activity-list">
          {#each recentActivity as log}
            <a href="/items/{log.item_id}" class="activity-item">
              <div class="act-icon" style="background:var(--surface2)">
                <i class="{ACTION_ICONS[log.action] ?? 'fa-solid fa-circle'}"
                   style="color:{log.action === 'maintenance' ? 'var(--info)' : log.action === 'create' ? 'var(--accent)' : 'var(--text-muted)'}">
                </i>
              </div>
              <div class="act-body">
                <p class="act-text">
                  <strong>{log.item_name ?? 'Item'}</strong>
                  <span class="act-action">{ACTION_LABELS[log.action] ?? log.action}</span>
                </p>
                {#if log.user_name}
                  <span class="act-sub">
                    <i class="fa-solid fa-user" style="font-size:.6rem"></i>
                    {log.user_name}
                  </span>
                {/if}
              </div>
              <span class="act-time">{timeAgo(log.created_at)}</span>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Distribusi per kategori -->
    {#if categoryStats.length > 0}
      <section class="dash-section">
        <div class="section-header">
          <h2 class="section-title">
            <i class="fa-solid fa-tags" style="color:var(--primary)"></i>
            Per Kategori
          </h2>
          <a href="/categories" class="section-link">Kelola</a>
        </div>
        <div class="category-list">
          {#each categoryStats as cat}
            <a href="/items?category={cat.id}" class="cat-item">
              <span class="cat-icon" style="background:{cat.color}20; color:{cat.color}">
                <i class="{cat.icon}"></i>
              </span>
              <span class="cat-name">{cat.name}</span>
              <span class="cat-count">{cat.total}</span>
            </a>
          {/each}
        </div>
      </section>
    {/if}

  </div><!-- /dashboard-grid -->

  <!-- Quick links -->
  <div class="quick-links">
    <p class="quick-title">Akses Cepat</p>
    <div class="quick-grid">
      <a href="/items/new"   class="quick-btn">
        <i class="fa-solid fa-plus"></i> Tambah Item
      </a>
      <a href="/scan"        class="quick-btn">
        <i class="fa-solid fa-qrcode"></i> Scan QR
      </a>
      <a href="/reports"     class="quick-btn">
        <i class="fa-solid fa-chart-bar"></i> Laporan
      </a>
      <a href="/categories"  class="quick-btn">
        <i class="fa-solid fa-tags"></i> Kategori
      </a>
    </div>
  </div>

</div>

<style>
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .header-actions { display: flex; gap: 8px; flex-shrink: 0; }

  /* Summary grid */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 12px;
  }
  @media (min-width: 640px) {
    .summary-grid { grid-template-columns: repeat(4, 1fr); }
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    text-decoration: none;
    color: inherit;
    transition: all .2s;
  }
  .card-icon {
    width: 44px; height: 44px;
    border-radius: 10px;
    display: grid; place-items: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  .card-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .card-value { font-size: 1.5rem; font-weight: 800; color: var(--text); line-height: 1; }
  .card-label { font-size: .75rem; color: var(--text-muted); font-weight: 500; }

  /* Asset value bar */
  .asset-value-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: .85rem;
    color: var(--text-muted);
  }

  /* Dashboard grid */
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  @media (min-width: 768px) {
    .dashboard-grid { grid-template-columns: 1fr 1fr; }
    .full-width { grid-column: 1 / -1; }
  }

  .dash-section { display: flex; flex-direction: column; gap: 0; }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .section-title {
    font-size: .9rem;
    font-weight: 700;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-link {
    font-size: .78rem;
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
  }
  .section-link:hover { text-decoration: underline; }

  /* Alert list */
  .alert-list { display: flex; flex-direction: column; gap: 8px; }
  .alert-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    text-align: left;
    cursor: pointer;
    border: none;
    width: 100%;
    background: var(--surface);
    transition: all .2s;
  }
  .alert-item:hover { box-shadow: var(--shadow-md); }
  .alert-icon {
    width: 36px; height: 36px;
    background: var(--warning-l);
    border-radius: 50%;
    display: grid; place-items: center;
    flex-shrink: 0;
    font-size: .85rem;
    color: var(--warning);
  }
  .alert-body { flex: 1; min-width: 0; }
  .alert-msg  { font-size: .82rem; font-weight: 500; color: var(--text); line-height: 1.4; }
  .alert-sub  { font-size: .72rem; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 4px; }

  /* Activity list */
  .activity-list { display: flex; flex-direction: column; }
  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    text-decoration: none;
    color: inherit;
    transition: opacity .15s;
    flex-wrap: wrap;
  }
  .activity-item:last-child { border-bottom: none; }
  .activity-item:hover { opacity: .8; }
  .act-icon {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: grid; place-items: center;
    font-size: .8rem;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .act-body { flex: 1; min-width: 0; }
  .act-text  { font-size: .82rem; color: var(--text); line-height: 1.4;
               overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .act-action{ color: var(--text-muted); font-weight: 400; margin-left: 4px; }
  .act-sub   { font-size: .72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 1px; }
  .act-time  {
    font-size: .7rem; color: var(--text-muted);
    white-space: nowrap; flex-shrink: 0;
    margin-top: 3px;
  }

  /* Category list */
  .category-list { display: flex; flex-direction: column; gap: 4px; }
  .cat-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: var(--radius-sm);
    text-decoration: none; color: inherit;
    transition: background .15s;
  }
  .cat-item:hover { background: var(--surface2); }
  .cat-icon {
    width: 30px; height: 30px;
    border-radius: 7px;
    display: grid; place-items: center;
    font-size: .8rem; flex-shrink: 0;
  }
  .cat-name  { flex: 1; font-size: .85rem; color: var(--text); }
  .cat-count {
    font-size: .8rem; font-weight: 700;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 12px; padding: 2px 8px;
    color: var(--text-muted);
  }

  /* Quick links */
  .quick-links { margin-top: 4px; }
  .quick-title { font-size: .75rem; font-weight: 700; text-transform: uppercase;
                 letter-spacing: .05em; color: var(--text-muted); margin-bottom: 10px; }
  .quick-grid  { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  @media (min-width: 480px) { .quick-grid { grid-template-columns: repeat(4, 1fr); } }

  .quick-btn {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 16px 10px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); text-decoration: none;
    color: var(--text-muted); font-size: .78rem; font-weight: 500;
    transition: all .2s; text-align: center;
  }
  .quick-btn i   { font-size: 1.1rem; color: var(--primary); }
  .quick-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  @media (max-width: 400px) {
    .hide-sm { display: none; }
  }
</style>
