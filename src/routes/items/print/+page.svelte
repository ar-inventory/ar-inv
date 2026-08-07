<script>
  import { onMount } from 'svelte';
  import { page }    from '$app/stores';
  import { goto }    from '$app/navigation';
  import { dbReady } from '$lib/stores/db.js';
  import { getItemById, getAllItems } from '$lib/db/items.js';
  import { getAllLocations, getLocationPath } from '$lib/db/locations.js';
  import { getSetting } from '$lib/db/settings.js';
  import { generateQRDataURL } from '$lib/utils/qr.js';

  let items        = [];
  let qrUrls       = {};      // { item.id: dataUrl }
  let locations    = [];
  let companyName  = '';
  let loading      = true;
  let generating   = false;
  let ready        = false;   // semua QR sudah di-generate

  // Layout options
  let labelsPerRow = 4;       // 2 | 3 | 4
  let showSerial   = true;
  let showLocation = true;
  let showCategory = true;
  let labelSize    = 'md';    // sm | md | lg

  const SIZE_PX = { sm: 90, md: 120, lg: 150 };

  $: if ($dbReady && $page.url) loadItems();

  async function loadItems() {
    loading    = true;
    locations  = getAllLocations();
    companyName = getSetting('company_name', '');

    const idsParam = $page.url.searchParams.get('ids');

    if (idsParam) {
      // Dari bulk select — ambil item by ID
      const ids = idsParam.split(',').map(Number).filter(Boolean);
      items = ids.map(id => getItemById(id)).filter(Boolean);
    } else {
      // Semua item
      items = getAllItems();
    }

    loading = false;
    if (items.length > 0) await generateAllQR();
  }

  async function generateAllQR() {
    generating = true;
    ready      = false;
    qrUrls     = {};
    const qrSize = SIZE_PX[labelSize];

    // Generate dalam batch kecil agar tidak block UI
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        qrUrls[item.id] = await generateQRDataURL(item.qr_code, qrSize * 2); // 2x untuk kualitas print
      } catch {
        qrUrls[item.id] = '';
      }
      // Yield ke browser setiap 5 item
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 0));
    }

    generating = false;
    ready      = true;
  }

  // Re-generate saat ukuran berubah
  $: if (labelSize && items.length > 0 && $dbReady) generateAllQR();

  function getPath(item) {
    if (!item.location_id) return item.location_name ?? '';
    return getLocationPath(item.location_id, locations);
  }

  function doPrint() {
    window.print();
  }

  function goBack() {
    const idsParam = $page.url.searchParams.get('ids');
    goto(idsParam ? '/items' : '/items');
  }
</script>

<svelte:head>
  <title>Print Label QR — Inventory</title>
</svelte:head>

<!-- ── Toolbar (no-print) ── -->
<div class="print-toolbar no-print">
  <div class="toolbar-left">
    <button class="btn btn-ghost btn-sm" on:click={goBack}>
      <i class="fa-solid fa-arrow-left"></i> Kembali
    </button>
    <div class="toolbar-info">
      <i class="fa-solid fa-tags" style="color:var(--primary)"></i>
      <span><strong>{items.length}</strong> label akan dicetak</span>
    </div>
  </div>

  <div class="toolbar-options">
    <!-- Labels per row -->
    <div class="opt-group">
      <label class="opt-label" for="per-row">Per baris</label>
      <select id="per-row" class="form-input form-select opt-select"
              bind:value={labelsPerRow} on:change={generateAllQR}>
        <option value={2}>2</option>
        <option value={3}>3</option>
        <option value={4}>4</option>
      </select>
    </div>

    <!-- Label size -->
    <div class="opt-group">
      <label class="opt-label" for="lbl-size">Ukuran</label>
      <select id="lbl-size" class="form-input form-select opt-select" bind:value={labelSize}>
        <option value="sm">Kecil</option>
        <option value="md">Sedang</option>
        <option value="lg">Besar</option>
      </select>
    </div>

    <!-- Toggles -->
    <label class="opt-check">
      <input type="checkbox" bind:checked={showSerial} />
      S/N
    </label>
    <label class="opt-check">
      <input type="checkbox" bind:checked={showLocation} />
      Lokasi
    </label>
    <label class="opt-check">
      <input type="checkbox" bind:checked={showCategory} />
      Kategori
    </label>

    <button class="btn btn-primary" on:click={doPrint} disabled={!ready || generating}>
      {#if generating}
        <span class="spinner" style="width:13px;height:13px;border-width:2px"></span>
        Menyiapkan...
      {:else}
        <i class="fa-solid fa-print"></i> Print
      {/if}
    </button>
  </div>
</div>

<!-- ── Print content ── -->
<div class="print-page">

  {#if loading}
    <div class="gen-loading no-print">
      <div class="spinner spinner-lg"></div>
      <p>Memuat data item...</p>
    </div>

  {:else if items.length === 0}
    <div class="gen-loading no-print">
      <i class="fa-solid fa-box-open" style="font-size:2rem;color:var(--text-muted)"></i>
      <p>Tidak ada item untuk dicetak.</p>
      <button class="btn btn-primary" on:click={goBack}>
        <i class="fa-solid fa-arrow-left"></i> Kembali
      </button>
    </div>

  {:else}
    <!-- Company header (hanya saat print) -->
    <div class="company-header print-only">
      {#if companyName}
        <p class="company-name">{companyName}</p>
      {/if}
      <p class="print-date">Dicetak: {new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}</p>
    </div>

    <!-- Generating overlay -->
    {#if generating}
      <div class="gen-loading no-print">
        <div class="spinner spinner-lg"></div>
        <p>Menyiapkan {items.length} QR Code...</p>
      </div>
    {/if}

    <!-- Labels grid -->
    <div
      class="labels-grid"
      style="--cols:{labelsPerRow}; --qr-size:{SIZE_PX[labelSize]}px"
      class:opacity-0={generating}
    >
      {#each items as item (item.id)}
        <div class="label-card size-{labelSize}">
          <!-- QR Code -->
          <div class="label-qr">
            {#if qrUrls[item.id]}
              <img src={qrUrls[item.id]} alt="QR {item.name}" />
            {:else}
              <div class="qr-placeholder">
                <i class="fa-solid fa-qrcode"></i>
              </div>
            {/if}
          </div>

          <!-- Label info -->
          <div class="label-info">
            <p class="label-name">{item.name}</p>

            {#if showCategory && item.category_name}
              <p class="label-meta label-category">{item.category_name}</p>
            {/if}

            {#if showLocation && (item.location_name || item.location_id)}
              <p class="label-meta">
                <span class="label-icon">&#9679;</span>
                {getPath(item) || item.location_name || ''}
              </p>
            {/if}

            {#if showSerial && item.serial_no}
              <p class="label-meta label-serial">S/N: {item.serial_no}</p>
            {/if}

            <p class="label-id">{item.qr_code.slice(4, 12).toUpperCase()}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}

</div>

<style>
  /* ── Screen styles ── */
  .print-toolbar {
    position: sticky; top: var(--header-h);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    padding: 10px 20px;
    display: flex; align-items: center;
    justify-content: space-between; gap: 12px;
    flex-wrap: wrap;
    z-index: 30;
  }
  @media (min-width: 1024px) {
    .print-toolbar { left: var(--sidebar-w); }
  }

  .toolbar-left  { display: flex; align-items: center; gap: 12px; }
  .toolbar-info  { display: flex; align-items: center; gap: 6px; font-size: .85rem; color: var(--text-muted); }
  .toolbar-options { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  .opt-group  { display: flex; align-items: center; gap: 5px; }
  .opt-label  { font-size: .75rem; color: var(--text-muted); white-space: nowrap; }
  .opt-select { padding: 5px 24px 5px 8px !important; font-size: .78rem !important; height: 32px; }
  .opt-check  {
    display: flex; align-items: center; gap: 4px;
    font-size: .78rem; color: var(--text-muted); cursor: pointer;
    white-space: nowrap;
  }
  .opt-check input { accent-color: var(--primary); width: 13px; height: 13px; }

  .print-page {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .gen-loading {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 60px 20px; text-align: center;
    color: var(--text-muted); font-size: .85rem;
  }

  .opacity-0 { opacity: 0; pointer-events: none; }

  /* Labels grid — screen preview */
  .labels-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 4), 1fr);
    gap: 12px;
  }

  .label-card {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: var(--shadow-sm);
  }

  .label-qr {
    padding: 8px 8px 4px;
    display: flex; align-items: center; justify-content: center;
  }
  .label-qr img {
    width: var(--qr-size, 120px);
    height: var(--qr-size, 120px);
    image-rendering: pixelated;
  }
  .qr-placeholder {
    width: var(--qr-size, 120px); height: var(--qr-size, 120px);
    display: grid; place-items: center;
    background: var(--surface2); color: var(--text-muted);
    font-size: 2rem;
  }

  .label-info {
    padding: 2px 8px 8px;
    width: 100%; text-align: center;
  }

  .label-name {
    font-size: .75rem; font-weight: 700; color: #111;
    line-height: 1.3; margin-bottom: 2px;
    word-break: break-word;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .label-meta {
    font-size: .62rem; color: #555; line-height: 1.4;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    width: 100%;
  }
  .label-category { color: #777; }
  .label-serial   { font-family: monospace; font-size: .58rem; color: #888; }
  .label-icon     { color: #999; font-size: .55rem; }
  .label-id {
    font-family: monospace; font-size: .58rem;
    color: #bbb; margin-top: 3px;
    letter-spacing: .05em;
  }

  /* Sizes */
  .size-sm .label-name { font-size: .65rem; }
  .size-lg .label-name { font-size: .85rem; }
  .size-lg .label-meta { font-size: .7rem; }

  /* ── PRINT styles ── */
  @media print {
    :global(body) {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .no-print { display: none !important; }
    .print-only { display: block !important; }

    .print-page {
      padding: 0 !important;
      max-width: none !important;
    }

    .company-header {
      text-align: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }
    .company-name { font-size: 12pt; font-weight: 700; }
    .print-date   { font-size: 8pt; color: #888; }

    .labels-grid {
      gap: 6px !important;
      padding: 6px;
    }

    .label-card {
      border: 1px solid #ccc !important;
      box-shadow: none !important;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .opacity-0 { opacity: 1 !important; }
  }

  .print-only { display: none; }

  @media (max-width: 480px) {
    .labels-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
</style>
