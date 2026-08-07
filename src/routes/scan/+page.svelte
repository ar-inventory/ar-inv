<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { Html5Qrcode } from 'html5-qrcode';
  import Swal from 'sweetalert2';
  import { dbReady } from '$lib/stores/db.js';
  import { currentUser } from '$lib/stores/ui.js';
  import { getItemByQRCode, updateItemStatus } from '$lib/db/items.js';
  import { logActivity } from '$lib/db/activity.js';
  import { STATUS_LABELS, STATUS_ICONS } from '$lib/utils/format.js';
  import { toastSuccess, toastError } from '$lib/utils/swal.js';

  // ── State ──────────────────────────────────────────
  let scannerEl     = null;   // div target html5-qrcode
  let scanner       = null;   // Html5Qrcode instance
  let scanning      = false;
  let paused        = false;
  let torchOn       = false;
  let torchSupported = false;
  let facingMode    = 'environment';  // environment | user
  let error         = '';
  let lastScanned   = '';
  let scanCount     = 0;

  // Mode: 'navigate' (buka detail) | 'quick' (update status langsung)
  let mode          = 'navigate';

  // Quick mode result panel
  let quickItem     = null;
  let quickStatus   = '';
  let quickSaving   = false;

  // Cooldown antar scan (ms) — cegah double scan
  const SCAN_COOLDOWN = 2500;
  let lastScanTime  = 0;

  // ── Init Scanner ──────────────────────────────────
  onMount(async () => {
    if (!$dbReady) return;
    await startScanner();
  });

  onDestroy(() => {
    stopScanner();
  });

  async function startScanner() {
    error = '';
    try {
      scanner   = new Html5Qrcode('qr-reader');
      scanning  = true;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        supportedScanTypes: [0]  // QR_CODE only
      };

      await scanner.start(
        { facingMode },
        config,
        onScanSuccess,
        () => {}  // silently ignore errors
      );

      // Cek torch support
      try {
        const caps = scanner.getRunningTrackCapabilities();
        torchSupported = !!(caps?.torch);
      } catch { torchSupported = false; }

    } catch (e) {
      scanning = false;
      if (e.name === 'NotAllowedError' || e.message?.includes('permission')) {
        error = 'permission';
      } else if (e.message?.includes('NotFound') || e.message?.includes('no cameras')) {
        error = 'nocamera';
      } else {
        error = 'generic';
        console.error('[Scanner]', e);
      }
    }
  }

  async function stopScanner() {
    if (scanner && scanning) {
      try { await scanner.stop(); } catch {}
      try { scanner.clear(); }    catch {}
    }
    scanning = false;
    scanner  = null;
  }

  // ── Scan success handler ──────────────────────────
  async function onScanSuccess(decodedText) {
    const now = Date.now();
    if (now - lastScanTime < SCAN_COOLDOWN) return;
    if (decodedText === lastScanned && now - lastScanTime < 5000) return;
    lastScanTime = now;
    lastScanned  = decodedText;
    scanCount++;

    // Pause visual feedback
    paused = true;
    setTimeout(() => { paused = false; }, SCAN_COOLDOWN);

    if (!$dbReady) return;

    // Cek format INV-
    if (!decodedText.startsWith('INV-')) {
      showNotFound(decodedText, 'Format QR tidak dikenal (bukan item inventory)');
      return;
    }

    const item = getItemByQRCode(decodedText);
    if (!item) {
      showNotFound(decodedText, 'QR Code tidak terdaftar di database');
      return;
    }

    if (mode === 'navigate') {
      await stopScanner();
      goto(`/items/${item.id}`);
    } else {
      // Quick mode — tampilkan panel update status
      quickItem   = item;
      quickStatus = item.status;
    }
  }

  function showNotFound(qr, msg) {
    Swal.fire({
      toast: true, position: 'top',
      icon: 'warning',
      title: msg,
      html: `<small style="color:#aaa;font-family:monospace;font-size:.7rem">${qr.slice(0,40)}</small>`,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true
    });
  }

  // ── Controls ──────────────────────────────────────
  async function toggleTorch() {
    if (!scanner || !torchSupported) return;
    try {
      torchOn = !torchOn;
      await scanner.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
    } catch { torchOn = !torchOn; }
  }

  async function flipCamera() {
    await stopScanner();
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    torchOn    = false;
    await startScanner();
  }

  function toggleMode() {
    mode      = mode === 'navigate' ? 'quick' : 'navigate';
    quickItem = null;
  }

  // ── Quick mode: simpan status ─────────────────────
  async function saveQuickStatus() {
    if (!quickItem || !quickStatus) return;
    quickSaving = true;
    try {
      updateItemStatus(quickItem.id, quickStatus);
      logActivity({
        item_id:   quickItem.id, action: 'update',
        user_id:   $currentUser?.id,
        user_name: $currentUser?.name,
        notes:     `Status diubah ke ${STATUS_LABELS[quickStatus]} via Scan QR`
      });
      toastSuccess(`Status "${quickItem.name}" diperbarui`);
      quickItem = null;
    } catch (e) {
      toastError(e.message);
    } finally {
      quickSaving = false;
    }
  }

  function dismissQuick() { quickItem = null; }
  function openDetail()   { goto(`/items/${quickItem.id}`); }
</script>

<svelte:head><title>Scan QR — Inventory</title></svelte:head>

<div class="scan-page">

  <!-- Header -->
  <div class="scan-header">
    <a href="/" class="btn-icon" aria-label="Kembali ke Dashboard">
      <i class="fa-solid fa-arrow-left"></i>
    </a>
    <h1 class="scan-title">Scan QR Code</h1>
    <!-- Mode toggle -->
    <button class="mode-toggle {mode === 'quick' ? 'mode-active' : ''}" on:click={toggleMode}
            title="{mode === 'navigate' ? 'Aktifkan mode cepat' : 'Nonaktifkan mode cepat'}">
      <i class="fa-solid fa-bolt"></i>
      <span>{mode === 'quick' ? 'Mode Cepat' : 'Mode Normal'}</span>
    </button>
  </div>

  <!-- Mode info -->
  <div class="mode-info {mode === 'quick' ? 'mode-quick' : 'mode-nav'}">
    {#if mode === 'navigate'}
      <i class="fa-solid fa-arrow-pointer"></i>
      Scan untuk membuka detail item
    {:else}
      <i class="fa-solid fa-bolt"></i>
      Mode Cepat — scan untuk update status langsung tanpa membuka detail
    {/if}
  </div>

  <!-- Scanner area -->
  {#if error === 'permission'}
    <div class="error-state card">
      <i class="fa-solid fa-camera-slash error-icon"></i>
      <h2>Akses Kamera Ditolak</h2>
      <p>Izinkan akses kamera di pengaturan browser, lalu muat ulang halaman.</p>
      <div class="error-actions">
        <button class="btn btn-primary" on:click={() => location.reload()}>
          <i class="fa-solid fa-rotate"></i> Coba Lagi
        </button>
      </div>
    </div>

  {:else if error === 'nocamera'}
    <div class="error-state card">
      <i class="fa-solid fa-video-slash error-icon"></i>
      <h2>Kamera Tidak Ditemukan</h2>
      <p>Perangkat ini tidak memiliki kamera yang dapat digunakan.</p>
    </div>

  {:else if error === 'generic'}
    <div class="error-state card">
      <i class="fa-solid fa-circle-exclamation error-icon"></i>
      <h2>Gagal Memulai Scanner</h2>
      <p>Terjadi kesalahan saat mengakses kamera.</p>
      <button class="btn btn-primary" on:click={startScanner}>
        <i class="fa-solid fa-rotate"></i> Coba Lagi
      </button>
    </div>

  {:else}
    <!-- Scanner viewfinder -->
    <div class="scanner-wrap {paused ? 'scan-paused' : ''}">
      <div id="qr-reader" bind:this={scannerEl}></div>

      <!-- Overlay frame -->
      <div class="scan-overlay" aria-hidden="true">
        <div class="scan-corner tl"></div>
        <div class="scan-corner tr"></div>
        <div class="scan-corner bl"></div>
        <div class="scan-corner br"></div>
        {#if paused}
          <div class="scan-success-anim">
            <i class="fa-solid fa-check"></i>
          </div>
        {:else}
          <div class="scan-line"></div>
        {/if}
      </div>

      <!-- Controls overlay -->
      <div class="scanner-controls">
        {#if torchSupported}
          <button class="ctrl-btn {torchOn ? 'ctrl-active' : ''}" on:click={toggleTorch}
                  aria-label="{torchOn ? 'Matikan' : 'Nyalakan'} flash">
            <i class="fa-solid fa-bolt"></i>
          </button>
        {/if}
        <button class="ctrl-btn" on:click={flipCamera} aria-label="Balik kamera">
          <i class="fa-solid fa-camera-rotate"></i>
        </button>
      </div>

      {#if !scanning && !error}
        <div class="scanner-loading">
          <div class="spinner"></div>
          <span>Memulai kamera...</span>
        </div>
      {/if}
    </div>

    <!-- Scan count -->
    {#if scanCount > 0}
      <p class="scan-count">
        <i class="fa-solid fa-check-circle" style="color:var(--accent)"></i>
        {scanCount} item berhasil discan
      </p>
    {:else}
      <p class="scan-hint">Arahkan kamera ke QR Code pada label item</p>
    {/if}
  {/if}

  <!-- Quick mode result panel -->
  {#if quickItem}
    <div class="quick-panel card">
      <div class="quick-item-info">
        <div class="quick-icon" style="background:{quickItem.category_color ?? 'var(--border)'}20; color:{quickItem.category_color ?? 'var(--text-muted)'}">
          <i class="{quickItem.category_icon ?? 'fa-solid fa-box'}"></i>
        </div>
        <div class="quick-details">
          <p class="quick-name">{quickItem.name}</p>
          {#if quickItem.location_name}
            <p class="quick-loc">
              <i class="fa-solid fa-location-dot" style="font-size:.65rem"></i>
              {quickItem.location_name}
            </p>
          {/if}
        </div>
        <button class="btn-icon" on:click={dismissQuick} aria-label="Tutup panel">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="quick-status-grid">
        {#each ['available','in_use','maintenance','retired'] as s}
          <button
            class="quick-status-btn {quickStatus === s ? 'qs-active' : ''}"
            on:click={() => quickStatus = s}
          >
            <i class="fa-solid {s === 'available' ? 'fa-circle-check' : s === 'in_use' ? 'fa-person-walking' : s === 'maintenance' ? 'fa-screwdriver-wrench' : 'fa-box-archive'}"></i>
            {STATUS_LABELS[s]}
          </button>
        {/each}
      </div>

      <div class="quick-actions">
        <button class="btn btn-ghost btn-sm" on:click={openDetail}>
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Detail
        </button>
        <button class="btn btn-primary" on:click={saveQuickStatus} disabled={quickSaving}>
          {#if quickSaving}
            <span class="spinner" style="width:13px;height:13px;border-width:2px"></span>
          {:else}
            <i class="fa-solid fa-floppy-disk"></i>
          {/if}
          Simpan Status
        </button>
      </div>
    </div>
  {/if}

  <!-- Manual input fallback -->
  <details class="manual-input">
    <summary>
      <i class="fa-solid fa-keyboard"></i> Input QR Code manual
    </summary>
    <div class="manual-form">
      <input id="manual-qr" class="form-input" type="text"
             placeholder="Ketik atau paste QR Code (INV-...)" />
      <button class="btn btn-primary btn-sm" on:click={() => {
        const val = document.getElementById('manual-qr').value.trim();
        if (val) onScanSuccess(val);
      }}>
        <i class="fa-solid fa-magnifying-glass"></i> Cari
      </button>
    </div>
  </details>

</div>

<style>
  .scan-page {
    max-width: 480px;
    margin: 0 auto;
    padding: 16px 16px calc(var(--bottomnav-h) + 20px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: calc(100vh - var(--header-h));
    min-height: calc(100dvh - var(--header-h));
  }

  /* Desktop: lebih lebar dan scanner lebih besar */
  @media (min-width: 1024px) {
    .scan-page {
      max-width: 560px;
      padding: 24px 24px 32px;
    }
  }

  /* Header */
  .scan-header {
    display: flex; align-items: center; gap: 10px;
  }
  .scan-title {
    flex: 1; font-size: 1.1rem; font-weight: 700; color: var(--text);
  }
  .mode-toggle {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 10px; border-radius: 20px;
    border: 1px solid var(--border); background: var(--surface2);
    font-size: .75rem; font-weight: 600; cursor: pointer;
    color: var(--text-muted); transition: all .15s; white-space: nowrap;
  }
  .mode-toggle.mode-active { background: var(--warning-l); color: #92400e; border-color: var(--warning); }

  /* Mode info */
  .mode-info {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 12px; border-radius: var(--radius-sm);
    font-size: .8rem; font-weight: 500;
  }
  .mode-nav  { background: var(--primary-l); color: var(--primary); }
  .mode-quick{ background: var(--warning-l); color: #92400e; }

  /* Scanner wrap */
  .scanner-wrap {
    position: relative;
    border-radius: var(--radius);
    overflow: hidden;
    background: #000;
    aspect-ratio: 1;
    max-height: 340px;
  }

  /* Desktop: biarkan scanner lebih tinggi dan memanjang */
  @media (min-width: 1024px) {
    .scanner-wrap {
      max-height: 520px;
      aspect-ratio: 3 / 4;   /* sedikit portrait agar frame scan pas di tengah */
    }
  }
  .scanner-wrap :global(#qr-reader) {
    width: 100% !important;
    border: none !important;
  }
  .scanner-wrap :global(#qr-reader video) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    border-radius: 0 !important;
  }
  /* Hide html5-qrcode default UI */
  .scanner-wrap :global(#qr-reader__dashboard),
  .scanner-wrap :global(#qr-reader__header_message),
  .scanner-wrap :global(#qr-reader__status_span) {
    display: none !important;
  }

  .scan-paused { opacity: .7; }

  /* Overlay corners */
  .scan-overlay {
    position: absolute; inset: 0;
    display: grid; place-items: center;
    pointer-events: none;
  }
  .scan-corner {
    position: absolute;
    width: 28px; height: 28px;
    border-color: #fff;
    border-style: solid;
    border-width: 0;
  }
  .tl { top: 20%;    left: 15%;  border-top-width: 3px;    border-left-width: 3px;  border-radius: 4px 0 0 0; }
  .tr { top: 20%;    right: 15%; border-top-width: 3px;    border-right-width: 3px; border-radius: 0 4px 0 0; }
  .bl { bottom: 20%; left: 15%;  border-bottom-width: 3px; border-left-width: 3px;  border-radius: 0 0 0 4px; }
  .br { bottom: 20%; right: 15%; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 4px 0; }

  /* Scan line animation — mobile */
  .scan-line {
    position: absolute;
    left: 15%; right: 15%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--primary), transparent);
    animation: scanMove 2s ease-in-out infinite;
    top: 20%;
  }
  @keyframes scanMove {
    0%   { top: 20%; }
    50%  { top: 76%; }
    100% { top: 20%; }
  }

  /* Desktop: scanner portrait 3/4 — frame & scan line diperluas ke atas-bawah */
  @media (min-width: 1024px) {
    .tl { top: 10%;    left: 12%;  }
    .tr { top: 10%;    right: 12%; }
    .bl { bottom: 10%; left: 12%;  }
    .br { bottom: 10%; right: 12%; }
    .scan-line { left: 12%; right: 12%; animation: scanMoveDesktop 2s ease-in-out infinite; }
  }
  @keyframes scanMoveDesktop {
    0%   { top: 10%; }
    50%  { top: 87%; }
    100% { top: 10%; }
  }

  /* Success checkmark */
  .scan-success-anim {
    width: 56px; height: 56px;
    background: var(--accent);
    border-radius: 50%;
    display: grid; place-items: center;
    animation: popIn .3s ease;
  }
  .scan-success-anim i { color: #fff; font-size: 1.4rem; }
  @keyframes popIn {
    from { transform: scale(.5); opacity: 0; }
    to   { transform: scale(1);  opacity: 1; }
  }

  /* Controls overlay */
  .scanner-controls {
    position: absolute; bottom: 12px; right: 12px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .ctrl-btn {
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.2);
    color: #fff; cursor: pointer; display: grid; place-items: center;
    font-size: .9rem; transition: all .15s; backdrop-filter: blur(4px);
  }
  .ctrl-btn:hover  { background: rgba(0,0,0,.7); }
  .ctrl-btn.ctrl-active { background: rgba(255,200,0,.3); color: #ffd700; }

  /* Loading */
  .scanner-loading {
    position: absolute; inset: 0;
    background: rgba(0,0,0,.6);
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; color: #fff; font-size: .85rem;
  }

  /* Error state */
  .error-state {
    padding: 40px 24px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
  }
  .error-icon { font-size: 2.5rem; color: var(--danger); }
  .error-state h2 { font-size: 1rem; font-weight: 700; }
  .error-state p  { font-size: .85rem; color: var(--text-muted); }
  .error-actions  { display: flex; gap: 8px; }

  .scan-hint  { font-size: .82rem; color: var(--text-muted); text-align: center; padding: 4px 0; }
  .scan-count { font-size: .82rem; color: var(--text); text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; }

  /* Quick panel */
  .quick-panel { padding: 14px; animation: slideUp .2s ease; }
  @keyframes slideUp {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  .quick-item-info {
    display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
  }
  .quick-icon {
    width: 36px; height: 36px; border-radius: 8px;
    display: grid; place-items: center; font-size: .9rem; flex-shrink: 0;
  }
  .quick-details { flex: 1; min-width: 0; }
  .quick-name    { font-size: .9rem; font-weight: 700; color: var(--text); }
  .quick-loc     { font-size: .72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }

  .quick-status-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;
  }
  .quick-status-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px; border-radius: var(--radius-sm);
    border: 1.5px solid var(--border); background: var(--surface2);
    font-size: .82rem; font-weight: 500; cursor: pointer;
    color: var(--text-muted); transition: all .15s;
  }
  .quick-status-btn:hover { border-color: var(--primary); color: var(--primary); }
  .quick-status-btn.qs-active {
    background: var(--primary-l); border-color: var(--primary);
    color: var(--primary); font-weight: 600;
  }
  .quick-actions { display: flex; justify-content: flex-end; gap: 8px; }

  /* Manual input */
  .manual-input {
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .manual-input summary {
    padding: 10px 14px; cursor: pointer;
    font-size: .82rem; color: var(--text-muted);
    display: flex; align-items: center; gap: 7px;
    list-style: none; user-select: none;
  }
  .manual-input summary:hover { color: var(--text); background: var(--surface2); }
  .manual-form {
    display: flex; gap: 8px; padding: 10px 14px;
    border-top: 1px solid var(--border);
    background: var(--surface2);
  }
  .manual-form .form-input { flex: 1; }
</style>
