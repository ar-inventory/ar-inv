<script>
  import { onMount } from 'svelte';
  import { page }    from '$app/stores';
  import { goto }    from '$app/navigation';
  import { dbReady } from '$lib/stores/db.js';
  import { can }     from '$lib/auth/permissions.js';

  import ItemCard      from '$lib/components/ItemCard.svelte';
  import BulkActionBar from '$lib/components/BulkActionBar.svelte';
  import EmptyState    from '$lib/components/EmptyState.svelte';

  import {
    getAllItems, bulkUpdateStatus, bulkUpdateCondition,
    bulkDeleteItems, getItemStats
  } from '$lib/db/items.js';
  import { getAllCategories }  from '$lib/db/categories.js';
  import { getAllLocations }   from '$lib/db/locations.js';
  import { confirmDelete, confirmDanger, toastSuccess, toastError } from '$lib/utils/swal.js';

  // ── State ─────────────────────────────────────────────
  let items      = [];
  let categories = [];
  let locations  = [];
  let stats      = { total: 0 };
  let loading    = true;

  // Filters
  let search     = '';
  let filterCat  = '';
  let filterStatus = '';
  let filterCond = '';
  let filterLoc  = '';
  let sortBy     = 'name';
  let sortDir    = 'ASC';

  // View
  let viewMode   = 'grid'; // grid | list
  let showFilter = false;

  // Bulk select
  let selected   = new Set();
  $: selectedCount = selected.size;
  $: allSelected   = items.length > 0 && selected.size === items.length;

  // ── Load data ─────────────────────────────────────────
  $: if ($dbReady) loadData();

  // Juga re-load saat URL params berubah (dari filter di dashboard)
  $: $page.url.searchParams, $dbReady && loadData();

  function loadData() {
    loading    = true;
    categories = getAllCategories();
    locations  = getAllLocations();
    stats      = getItemStats();

    // Ambil filter dari URL jika ada
    const urlCat    = $page.url.searchParams.get('category') ?? '';
    const urlStatus = $page.url.searchParams.get('status')   ?? '';
    if (urlCat && !filterCat)    filterCat    = urlCat;
    if (urlStatus && !filterStatus) filterStatus = urlStatus;

    items   = getAllItems({
      categoryId: filterCat    ? parseInt(filterCat)  : null,
      status:     filterStatus || null,
      condition:  filterCond   || null,
      locationId: filterLoc    ? parseInt(filterLoc)  : null,
      search:     search       || null,
      sortBy,
      sortDir
    });
    loading = false;
  }

  function applyFilters() { selected = new Set(); loadData(); }
  function clearFilters()  {
    search = ''; filterCat = ''; filterStatus = ''; filterCond = ''; filterLoc = '';
    sortBy = 'name'; sortDir = 'ASC';
    goto('/items', { replaceState: true });
    loadData();
  }

  $: hasFilter = search || filterCat || filterStatus || filterCond || filterLoc;

  // ── Bulk select ───────────────────────────────────────
  function toggleSelect(id) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    selected = s;
  }
  function toggleAll() {
    selected = allSelected ? new Set() : new Set(items.map(i => i.id));
  }
  function clearSelected() { selected = new Set(); }

  // ── Bulk actions ──────────────────────────────────────
  async function bulkStatus(status) {
    bulkUpdateStatus([...selected], status);
    toastSuccess(`${selected.size} item diperbarui`);
    clearSelected(); loadData();
  }
  async function bulkCondition(cond) {
    bulkUpdateCondition([...selected], cond);
    toastSuccess(`${selected.size} item diperbarui`);
    clearSelected(); loadData();
  }
  async function bulkDelete() {
    const ok = await confirmDelete(`${selected.size} item yang dipilih`);
    if (!ok) return;
    try {
      bulkDeleteItems([...selected]);
      toastSuccess(`${selected.size} item dihapus`);
      clearSelected(); loadData();
    } catch (e) { toastError(e.message); }
  }
  function bulkPrint() {
    const ids = [...selected].join(',');
    goto(`/items/print?ids=${ids}`);
  }

  // ── Sort ──────────────────────────────────────────────
  function setSort(col) {
    if (sortBy === col) sortDir = sortDir === 'ASC' ? 'DESC' : 'ASC';
    else { sortBy = col; sortDir = 'ASC'; }
    loadData();
  }

  // Debounce search
  let searchTimer;
  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadData(), 300);
  }
</script>

<svelte:head><title>Inventory — Items</title></svelte:head>

<div class="page-container">

  <!-- ── Page Header ── -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Inventory</h1>
      <p class="page-subtitle">{stats.total} item total</p>
    </div>
    <div class="header-actions">
      <a href="/scan" class="btn btn-secondary">
        <i class="fa-solid fa-qrcode"></i>
        <span class="hide-sm">Scan</span>
      </a>
      {#if can('canEdit')}
        <a href="/items/new" class="btn btn-primary">
          <i class="fa-solid fa-plus"></i>
          <span class="hide-sm">Tambah Item</span>
        </a>
      {/if}
    </div>
  </div>

  <!-- ── Toolbar: Search + Filter + View ── -->
  <div class="toolbar card">
    <!-- Search -->
    <div class="search-wrap">
      <i class="fa-solid fa-magnifying-glass search-icon"></i>
      <input
        class="form-input search-input"
        type="text"
        placeholder="Cari nama, serial, brand..."
        bind:value={search}
        on:input={onSearchInput}
      />
      {#if search}
        <button class="search-clear" on:click={() => { search = ''; loadData(); }} aria-label="Hapus pencarian">
          <i class="fa-solid fa-xmark"></i>
        </button>
      {/if}
    </div>

    <!-- Filter toggle -->
    <button
      class="btn btn-secondary btn-sm {showFilter ? 'active-filter' : ''}"
      on:click={() => showFilter = !showFilter}
    >
      <i class="fa-solid fa-filter"></i>
      Filter
      {#if hasFilter}
        <span class="filter-badge"></span>
      {/if}
    </button>

    <!-- View toggle -->
    <div class="view-toggle">
      <button class="view-btn {viewMode === 'grid' ? 'active' : ''}" on:click={() => viewMode = 'grid'} title="Grid">
        <i class="fa-solid fa-grip"></i>
      </button>
      <button class="view-btn {viewMode === 'list' ? 'active' : ''}" on:click={() => viewMode = 'list'} title="List">
        <i class="fa-solid fa-list"></i>
      </button>
    </div>
  </div>

  <!-- ── Filter Panel ── -->
  {#if showFilter}
    <div class="filter-panel card">
      <div class="filter-grid">
        <div class="form-group" style="margin:0">
          <label class="form-label" for="f-cat">Kategori</label>
          <select id="f-cat" class="form-input form-select" bind:value={filterCat} on:change={applyFilters}>
            <option value="">Semua Kategori</option>
            {#each categories as cat}
              <option value={cat.id}>{cat.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="f-status">Status</label>
          <select id="f-status" class="form-input form-select" bind:value={filterStatus} on:change={applyFilters}>
            <option value="">Semua Status</option>
            <option value="available">Tersedia</option>
            <option value="in_use">Digunakan</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Tidak Aktif</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="f-cond">Kondisi</label>
          <select id="f-cond" class="form-input form-select" bind:value={filterCond} on:change={applyFilters}>
            <option value="">Semua Kondisi</option>
            <option value="good">Baik</option>
            <option value="fair">Cukup</option>
            <option value="poor">Buruk</option>
            <option value="broken">Rusak</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="f-loc">Lokasi</label>
          <select id="f-loc" class="form-input form-select" bind:value={filterLoc} on:change={applyFilters}>
            <option value="">Semua Lokasi</option>
            {#each locations as loc}
              <option value={loc.id}>{'—'.repeat(loc.level)} {loc.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="f-sort">Urutkan</label>
          <select id="f-sort" class="form-input form-select" bind:value={sortBy} on:change={applyFilters}>
            <option value="name">Nama</option>
            <option value="created_at">Terbaru</option>
            <option value="updated_at">Diperbarui</option>
            <option value="status">Status</option>
            <option value="condition">Kondisi</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="f-dir">Arah</label>
          <select id="f-dir" class="form-input form-select" bind:value={sortDir} on:change={applyFilters}>
            <option value="ASC">A → Z / Lama → Baru</option>
            <option value="DESC">Z → A / Baru → Lama</option>
          </select>
        </div>
      </div>
      {#if hasFilter}
        <button class="btn btn-ghost btn-sm" style="margin-top:10px" on:click={clearFilters}>
          <i class="fa-solid fa-rotate"></i> Reset Filter
        </button>
      {/if}
    </div>
  {/if}

  <!-- ── Bulk select header ── -->
  {#if items.length > 0}
    <div class="select-header">
      <label class="select-all">
        <input type="checkbox" checked={allSelected} on:change={toggleAll} />
        <span>{allSelected ? 'Batalkan Semua' : 'Pilih Semua'}</span>
      </label>
      <span class="result-count">
        {items.length} item{hasFilter ? ' (difilter)' : ''}
      </span>
    </div>
  {/if}

  <!-- ── Items Grid / List ── -->
  {#if loading}
    <div class="loading-wrap">
      <div class="spinner spinner-lg"></div>
    </div>

  {:else if items.length === 0}
    <EmptyState
      icon="fa-solid fa-boxes-stacked"
      title={hasFilter ? 'Tidak ada item yang sesuai' : 'Belum ada item'}
      message={hasFilter ? 'Coba ubah atau reset filter.' : 'Mulai tambah item pertama Anda.'}
      actionLabel={!hasFilter ? 'Tambah Item' : ''}
      onAction={!hasFilter ? () => goto('/items/new') : null}
    />

  {:else if viewMode === 'grid'}
    <div class="items-grid">
      {#each items as item (item.id)}
        <ItemCard
          {item}
          selected={selected.has(item.id)}
          onSelect={toggleSelect}
          viewMode="grid"
        />
      {/each}
    </div>

  {:else}
    <div class="items-list card">
      <!-- List header -->
      <div class="list-header">
        <span class="lh-check"></span>
        <span class="lh-icon"></span>
        <button class="lh-col lh-main" on:click={() => setSort('name')}>
          Nama
          {#if sortBy === 'name'}<i class="fa-solid fa-sort-{sortDir === 'ASC' ? 'up' : 'down'}"></i>{/if}
        </button>
        <span class="lh-col hide-sm">Kategori</span>
        <span class="lh-col hide-md">Lokasi</span>
        <span class="lh-col">Status / Kondisi</span>
        <span class="lh-act"></span>
      </div>
      {#each items as item (item.id)}
        <ItemCard
          {item}
          selected={selected.has(item.id)}
          onSelect={toggleSelect}
          viewMode="list"
        />
      {/each}
    </div>
  {/if}

</div>

<!-- ── Bulk Action Bar ── -->
{#if selectedCount > 0}
  <BulkActionBar
    count={selectedCount}
    onClear={clearSelected}
    onStatus={bulkStatus}
    onCondition={bulkCondition}
    onDelete={can('canBulkDelete') ? bulkDelete : null}
    onPrint={bulkPrint}
  />
{/if}

<style>
  .page-header {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 12px;
    margin-bottom: 16px; flex-wrap: wrap;
  }
  .header-actions { display: flex; gap: 8px; }

  /* Toolbar */
  .toolbar {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .search-wrap {
    flex: 1; min-width: 180px;
    position: relative; display: flex; align-items: center;
  }
  .search-icon  { position: absolute; left: 12px; color: var(--text-muted); font-size: .8rem; pointer-events: none; }
  .search-input { padding-left: 34px !important; padding-right: 34px !important; }
  .search-clear {
    position: absolute; right: 10px;
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); font-size: .75rem; padding: 2px;
  }
  .active-filter { border-color: var(--primary); color: var(--primary); }
  .filter-badge {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--danger); display: inline-block; margin-left: 2px;
  }

  /* View toggle */
  .view-toggle {
    display: flex; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    padding: 3px; gap: 2px;
  }
  .view-btn {
    padding: 5px 8px; border: none; background: transparent;
    color: var(--text-muted); border-radius: 6px; cursor: pointer;
    transition: all .15s; font-size: .8rem;
  }
  .view-btn.active { background: var(--surface); color: var(--primary); box-shadow: var(--shadow-sm); }

  /* Filter panel */
  .filter-panel { padding: 14px; margin-bottom: 10px; }
  .filter-grid  { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (min-width: 640px)  { .filter-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1024px) { .filter-grid { grid-template-columns: repeat(6, 1fr); } }

  /* Select header */
  .select-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 4px; margin-bottom: 8px;
  }
  .select-all {
    display: flex; align-items: center; gap: 8px;
    font-size: .82rem; color: var(--text-muted); cursor: pointer;
  }
  .select-all input { accent-color: var(--primary); width: 15px; height: 15px; }
  .result-count { font-size: .78rem; color: var(--text-muted); }

  /* Grid layout */
  .items-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  @media (min-width: 480px)  { .items-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 640px)  { .items-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1024px) { .items-grid { grid-template-columns: repeat(4, 1fr); } }

  /* List header */
  .items-list { overflow: hidden; }
  .list-header {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 14px;
    background: var(--surface2); border-bottom: 1px solid var(--border);
    font-size: .72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .04em; color: var(--text-muted);
  }
  .lh-check { width: 15px; flex-shrink: 0; }
  .lh-icon  { width: 34px; flex-shrink: 0; }
  .lh-main  {
    flex: 1; background: none; border: none; cursor: pointer;
    font-size: .72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .04em; color: var(--text-muted); text-align: left;
    display: flex; align-items: center; gap: 5px;
  }
  .lh-col   { min-width: 100px; flex-shrink: 0; }
  .lh-act   { width: 32px; flex-shrink: 0; }

  .loading-wrap {
    display: flex; justify-content: center; padding: 60px 0;
  }

  @media (max-width: 400px) { .hide-sm { display: none; } }
</style>
