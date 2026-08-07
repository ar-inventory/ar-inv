<script>
  import { dbReady } from '$lib/stores/db.js';
  import { can }     from '$lib/auth/permissions.js';
  import { all, get } from '$lib/db/database.js';
  import { getUnreadNotifications, NOTIF_LABELS, NOTIF_ICONS } from '$lib/db/notifications.js';
  import { markAsRead, markAllAsRead } from '$lib/db/notifications.js';
  import { getAllMaintenance, getTotalMaintenanceCost } from '$lib/db/maintenance.js';
  import { downloadCSV, downloadMaintenanceCSV } from '$lib/utils/export.js';
  import { formatDate, formatDateTime, formatCurrency, timeAgo } from '$lib/utils/format.js';
  import { goto } from '$app/navigation';

  let activeTab  = 'alerts';
  let alerts     = [];
  let assetStats = {};
  let catBreakdown = [];
  let statusBreakdown = [];
  let condBreakdown = [];
  let maintenance = [];
  let maintenanceCost = 0;

  // Filter maintenance
  let filterDateFrom = '';
  let filterDateTo   = '';

  $: if ($dbReady) loadAll();
  $: if ($dbReady) loadMaintenance(filterDateFrom, filterDateTo);

  function loadAll() {
    loadAlerts();
    loadAssetStats();
    loadMaintenance();
  }

  function loadAlerts() {
    alerts = getUnreadNotifications();
  }

  function loadAssetStats() {
    assetStats = {
      total:       get('SELECT COUNT(*) as c FROM items')?.c ?? 0,
      totalValue:  get('SELECT SUM(purchase_price) as s FROM items')?.s ?? 0,
      available:   get("SELECT COUNT(*) as c FROM items WHERE status='available'")?.c ?? 0,
      in_use:      get("SELECT COUNT(*) as c FROM items WHERE status='in_use'")?.c ?? 0,
      maintenance: get("SELECT COUNT(*) as c FROM items WHERE status='maintenance'")?.c ?? 0,
      retired:     get("SELECT COUNT(*) as c FROM items WHERE status='retired'")?.c ?? 0,
      good:        get("SELECT COUNT(*) as c FROM items WHERE condition='good'")?.c ?? 0,
      fair:        get("SELECT COUNT(*) as c FROM items WHERE condition='fair'")?.c ?? 0,
      poor:        get("SELECT COUNT(*) as c FROM items WHERE condition='poor'")?.c ?? 0,
      broken:      get("SELECT COUNT(*) as c FROM items WHERE condition='broken'")?.c ?? 0,
    };
    catBreakdown = all(`
      SELECT c.name, c.icon, c.color, COUNT(i.id) as total,
             SUM(i.purchase_price) as value
      FROM categories c LEFT JOIN items i ON i.category_id = c.id
      GROUP BY c.id ORDER BY total DESC
    `);
  }

  function loadMaintenance() {
    maintenance = getAllMaintenance({ dateFrom: filterDateFrom || null, dateTo: filterDateTo || null, limit: 200 });
    maintenanceCost = getTotalMaintenanceCost({ dateFrom: filterDateFrom || null, dateTo: filterDateTo || null });
  }

  function dismissAlert(notif) {
    markAsRead(notif.id);
    loadAlerts();
    if (notif.item_id) goto(`/items/${notif.item_id}`);
  }

  function dismissAll() {
    markAllAsRead();
    loadAlerts();
  }

  const STATUS_LABEL = { available:'Tersedia', in_use:'Digunakan', maintenance:'Maintenance', retired:'Tidak Aktif' };
  const COND_LABEL   = { good:'Baik', fair:'Cukup', poor:'Buruk', broken:'Rusak' };
  const COND_COLOR   = { good:'var(--accent)', fair:'var(--warning)', poor:'var(--danger)', broken:'#7f1d1d' };
  const STATUS_COLOR = { available:'var(--accent)', in_use:'var(--warning)', maintenance:'var(--info)', retired:'var(--text-muted)' };
</script>

<svelte:head><title>Laporan — Inventory</title></svelte:head>

<div class="page-container">
  <div class="page-header">
    <div>
      <h1 class="page-title">Laporan</h1>
      <p class="page-subtitle">Ringkasan, notifikasi, dan riwayat maintenance</p>
    </div>
  </div>

  <div class="tabs">
    <button class="tab-btn {activeTab==='alerts'?'active':''}" on:click={()=>activeTab='alerts'}>
      <i class="fa-solid fa-bell"></i> Notifikasi
      {#if alerts.length>0}<span class="tab-badge">{alerts.length}</span>{/if}
    </button>
    <button class="tab-btn {activeTab==='assets'?'active':''}" on:click={()=>activeTab='assets'}>
      <i class="fa-solid fa-chart-bar"></i> Rekap Aset
    </button>
    <button class="tab-btn {activeTab==='maintenance'?'active':''}" on:click={()=>activeTab='maintenance'}>
      <i class="fa-solid fa-screwdriver-wrench"></i> Riwayat Maintenance
    </button>
  </div>

  <!-- TAB: ALERTS -->
  {#if activeTab === 'alerts'}
    <div class="tab-content">
      <div class="tab-toolbar">
        <span class="tab-count-label">{alerts.length} notifikasi aktif</span>
        {#if alerts.length > 0}
          <button class="btn btn-ghost btn-sm" on:click={dismissAll}>
            <i class="fa-solid fa-check-double"></i> Tandai Semua Dibaca
          </button>
        {/if}
      </div>
      {#if alerts.length === 0}
        <div class="empty-state-full card">
          <i class="fa-solid fa-check-circle" style="font-size:2.5rem;color:var(--accent)"></i>
          <p class="empty-title">Semua beres!</p>
          <p class="empty-sub">Tidak ada notifikasi yang perlu diperhatikan.</p>
        </div>
      {:else}
        <div class="alert-grid">
          {#each alerts as notif}
            <button class="alert-card card" on:click={() => dismissAlert(notif)}>
              <div class="alert-icon-wrap">
                <i class="{NOTIF_ICONS[notif.type] ?? 'fa-solid fa-bell'}"></i>
              </div>
              <div class="alert-body">
                <p class="alert-type">{NOTIF_LABELS[notif.type] ?? notif.type}</p>
                <p class="alert-msg">{notif.message}</p>
                {#if notif.due_date}
                  <p class="alert-date">
                    <i class="fa-solid fa-calendar-days" style="font-size:.65rem"></i>
                    {formatDate(notif.due_date)}
                  </p>
                {/if}
              </div>
              <i class="fa-solid fa-chevron-right alert-arrow"></i>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- TAB: ASSETS -->
  {#if activeTab === 'assets'}
    <div class="tab-content">
      <!-- Summary row -->
      <div class="summary-row">
        <div class="sum-card card">
          <span class="sum-value">{assetStats.total}</span>
          <span class="sum-label">Total Item</span>
        </div>
        <div class="sum-card card">
          <span class="sum-value" style="color:var(--accent)">{formatCurrency(assetStats.totalValue)}</span>
          <span class="sum-label">Nilai Aset</span>
        </div>
      </div>

      <!-- Status breakdown -->
      <div class="breakdown-card card">
        <div class="breakdown-title"><i class="fa-solid fa-circle-half-stroke"></i> Status Item</div>
        {#each Object.entries(STATUS_LABEL) as [key, lbl]}
          <div class="breakdown-row">
            <span class="br-label">{lbl}</span>
            <div class="br-bar-wrap">
              <div class="br-bar" style="width:{assetStats.total>0?(assetStats[key]/assetStats.total*100).toFixed(1):0}%;background:{STATUS_COLOR[key]}"></div>
            </div>
            <span class="br-count" style="color:{STATUS_COLOR[key]}">{assetStats[key]}</span>
          </div>
        {/each}
      </div>

      <!-- Condition breakdown -->
      <div class="breakdown-card card">
        <div class="breakdown-title"><i class="fa-solid fa-heart-pulse"></i> Kondisi Item</div>
        {#each Object.entries(COND_LABEL) as [key, lbl]}
          <div class="breakdown-row">
            <span class="br-label">{lbl}</span>
            <div class="br-bar-wrap">
              <div class="br-bar" style="width:{assetStats.total>0?(assetStats[key]/assetStats.total*100).toFixed(1):0}%;background:{COND_COLOR[key]}"></div>
            </div>
            <span class="br-count" style="color:{COND_COLOR[key]}">{assetStats[key]}</span>
          </div>
        {/each}
      </div>

      <!-- Category breakdown -->
      {#if catBreakdown.length > 0}
        <div class="breakdown-card card">
          <div class="breakdown-title"><i class="fa-solid fa-tags"></i> Per Kategori</div>
          {#each catBreakdown as cat}
            <div class="cat-row">
              <span class="cat-icon-sm" style="background:{cat.color}20;color:{cat.color}">
                <i class="{cat.icon}"></i>
              </span>
              <span class="cat-name-col">{cat.name}</span>
              <div class="br-bar-wrap">
                <div class="br-bar" style="width:{assetStats.total>0?(cat.total/assetStats.total*100).toFixed(1):0}%;background:{cat.color}"></div>
              </div>
              <span class="br-count">{cat.total}</span>
              {#if cat.value}<span class="cat-value">{formatCurrency(cat.value)}</span>{/if}
            </div>
          {/each}
        </div>
      {/if}

      <div style="display:flex;gap:8px;margin-top:12px">
        {#if can('canExport')}
          <button class="btn btn-secondary btn-sm" on:click={() => downloadCSV()}>
            <i class="fa-solid fa-file-csv"></i> Export CSV Items
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- TAB: MAINTENANCE -->
  {#if activeTab === 'maintenance'}
    <div class="tab-content">
      <div class="maint-toolbar">
        <div class="filter-row">
          <div class="opt-group">
            <label class="opt-label" for="r-from">Dari</label>
            <input id="r-from" class="form-input opt-date" type="date" bind:value={filterDateFrom} on:change={loadMaintenance} />
          </div>
          <div class="opt-group">
            <label class="opt-label" for="r-to">Sampai</label>
            <input id="r-to" class="form-input opt-date" type="date" bind:value={filterDateTo} on:change={loadMaintenance} />
          </div>
          {#if filterDateFrom || filterDateTo}
            <button class="btn btn-ghost btn-sm" on:click={() => { filterDateFrom=''; filterDateTo=''; loadMaintenance(); }}>
              <i class="fa-solid fa-xmark"></i> Reset
            </button>
          {/if}
        </div>
        <div class="maint-summary">
          <span>{maintenance.length} record</span>
          {#if maintenanceCost > 0}
            <span class="cost-badge">
              <i class="fa-solid fa-money-bill-wave"></i>
              Total: {formatCurrency(maintenanceCost)}
            </span>
          {/if}
          {#if can('canExport')}
            <button class="btn btn-secondary btn-sm" on:click={downloadMaintenanceCSV}>
              <i class="fa-solid fa-file-csv"></i> Export CSV
            </button>
          {/if}
        </div>
      </div>

      {#if maintenance.length === 0}
        <div class="empty-state-full card">
          <i class="fa-solid fa-screwdriver-wrench" style="font-size:2rem;color:var(--text-muted)"></i>
          <p class="empty-sub">Belum ada catatan maintenance yang dibuat.</p>
          <p class="empty-sub" style="margin-top:4px;font-size:.75rem">
            <i class="fa-solid fa-circle-info" style="color:var(--info);font-size:.7rem"></i>
            Catatan maintenance dibuat dari halaman detail item → tombol "Catat Maintenance"
          </p>
        </div>
      {:else}
        <div class="maint-table card">
          <div class="mtable-header">
            <span class="mth mth-date">Tanggal</span>
            <span class="mth mth-item">Item</span>
            <span class="mth mth-tech hide-sm">Teknisi</span>
            <span class="mth mth-findings hide-md">Temuan</span>
            <span class="mth mth-cost">Biaya</span>
          </div>
          {#each maintenance as rec}
            <a href="/items/{rec.item_id}" class="mtr">
              <span class="mtd mth-date">{formatDate(rec.created_at)}</span>
              <span class="mtd mth-item">
                <span class="mtr-name">{rec.item_name ?? '—'}</span>
                {#if rec.category_name}<span class="mtr-cat">{rec.category_name}</span>{/if}
              </span>
              <span class="mtd mth-tech hide-sm">{rec.technician_name ?? rec.technician ?? '—'}</span>
              <span class="mtd mth-findings hide-md mtr-truncate">{rec.findings ?? '—'}</span>
              <span class="mtd mth-cost">{rec.cost ? formatCurrency(rec.cost) : '—'}</span>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page-header{margin-bottom:16px}
  .tab-content{padding-bottom:24px}
  .tab-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px}
  .tab-count-label{font-size:.82rem;color:var(--text-muted)}
  .tab-badge{background:var(--danger);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:10px;margin-left:4px}
  .empty-state-full{padding:48px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
  .empty-title{font-size:1rem;font-weight:700;color:var(--text)}
  .empty-sub{font-size:.85rem;color:var(--text-muted)}

  /* Alerts */
  .alert-grid{display:flex;flex-direction:column;gap:8px}
  .alert-card{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;text-align:left;border:none;cursor:pointer;width:100%;transition:all .15s}
  .alert-card:hover{box-shadow:var(--shadow-md)}
  .alert-icon-wrap{width:36px;height:36px;border-radius:50%;background:var(--warning-l);display:grid;place-items:center;font-size:.85rem;color:var(--warning);flex-shrink:0}
  .alert-body{flex:1;min-width:0}
  .alert-type{font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px}
  .alert-msg{font-size:.85rem;font-weight:500;color:var(--text);line-height:1.4}
  .alert-date{font-size:.72rem;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:4px}
  .alert-arrow{color:var(--text-muted);font-size:.75rem;flex-shrink:0;margin-top:4px}

  /* Summary */
  .summary-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .sum-card{padding:16px;text-align:center}
  .sum-value{display:block;font-size:1.5rem;font-weight:800;color:var(--text)}
  .sum-label{display:block;font-size:.75rem;color:var(--text-muted);margin-top:2px}
  @media(max-width:480px){
    .sum-card{padding:10px 6px}
    .sum-value{font-size:.9rem;white-space:nowrap}
    .sum-label{font-size:.62rem}
  }

  /* Breakdown */
  .breakdown-card{padding:14px;margin-bottom:12px}
  .breakdown-title{display:flex;align-items:center;gap:7px;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)}
  .breakdown-row,.cat-row{display:flex;align-items:center;gap:10px;padding:5px 0}
  .br-label,.cat-name-col{font-size:.82rem;color:var(--text);min-width:80px;flex-shrink:0}
  .br-bar-wrap{flex:1;height:8px;background:var(--surface2);border-radius:4px;overflow:hidden}
  .br-bar{height:100%;border-radius:4px;transition:width .3s ease}
  .br-count{font-size:.8rem;font-weight:700;min-width:28px;text-align:right;flex-shrink:0}
  .cat-icon-sm{width:24px;height:24px;border-radius:6px;display:grid;place-items:center;font-size:.7rem;flex-shrink:0}
  .cat-name-col{min-width:100px}
  .cat-value{font-size:.72rem;color:var(--text-muted);flex-shrink:0;white-space:nowrap}

  /* Maintenance */
  .maint-toolbar{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
  .filter-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .opt-group{display:flex;align-items:center;gap:5px}
  .opt-label{font-size:.75rem;color:var(--text-muted);white-space:nowrap}
  .opt-date{padding:5px 10px!important;font-size:.78rem!important;height:32px;width:140px}
  .maint-summary{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:.82rem;color:var(--text-muted)}
  .cost-badge{display:flex;align-items:center;gap:5px;color:var(--accent);font-weight:600}
  .maint-table{overflow:hidden}
  .mtable-header{display:flex;gap:8px;padding:8px 14px;background:var(--surface2);border-bottom:1px solid var(--border);font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted)}
  .mtr{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;transition:background .15s}
  .mtr:last-child{border-bottom:none}
  .mtr:hover{background:var(--surface2)}
  .mth-date{width:90px;flex-shrink:0;font-size:.78rem}
  .mth-item{flex:1;min-width:0}
  .mth-tech{width:100px;flex-shrink:0;font-size:.78rem}
  .mth-findings{flex:1;min-width:0}
  .mth-cost{width:90px;flex-shrink:0;text-align:right;font-size:.78rem}
  .mtd{font-size:.8rem;color:var(--text)}
  .mtr-name{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mtr-cat{display:block;font-size:.7rem;color:var(--text-muted)}
  .mtr-truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-muted);font-size:.78rem}
  @media(max-width:640px){.hide-sm{display:none!important}}
  @media(max-width:768px){.hide-md{display:none!important}}
</style>
