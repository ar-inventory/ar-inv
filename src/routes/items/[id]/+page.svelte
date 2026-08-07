<script>
  import { page }    from '$app/stores';
  import { goto }    from '$app/navigation';
  import { dbReady } from '$lib/stores/db.js';
  import { can }     from '$lib/auth/permissions.js';
  import { currentUser } from '$lib/stores/ui.js';

  import StatusBadge      from '$lib/components/StatusBadge.svelte';
  import ConditionBadge   from '$lib/components/ConditionBadge.svelte';
  import MaintenanceModal from '$lib/components/MaintenanceModal.svelte';

  import { getItemById, deleteItem, updateItemStatus, getCustomValues } from '$lib/db/items.js';
  import { getFieldsByCategory } from '$lib/db/categories.js';
  import { getMaintenanceByItem, parseMaintenanceRecord } from '$lib/db/maintenance.js';
  import { getActivityByItem, ACTION_LABELS, ACTION_ICONS } from '$lib/db/activity.js';
  import { getAllLocations, getLocationPath } from '$lib/db/locations.js';
  import { generateQRDataURL, downloadQR } from '$lib/utils/qr.js';
  import { formatDate, formatDateTime, formatCurrency, timeAgo, STATUS_LABELS } from '$lib/utils/format.js';
  import { confirmDelete, confirmAction, toastSuccess, toastError } from '$lib/utils/swal.js';
  import { logActivity } from '$lib/db/activity.js';

  let itemId          = null;
  let item            = null;
  let notFound        = false;
  let activeTab       = 'info';
  let customFields    = [];
  let customValues    = [];
  let maintenanceList = [];
  let activityList    = [];
  let locationPath    = '';
  let qrDataUrl       = '';
  let showMaintModal  = false;
  let locations       = [];

  $: if ($dbReady && $page.params.id) { itemId = parseInt($page.params.id); loadAll(); }

  async function loadAll() {
    locations       = getAllLocations();
    item            = getItemById(itemId);
    if (!item)      { notFound = true; return; }
    customFields    = item.category_id ? getFieldsByCategory(item.category_id) : [];
    customValues    = getCustomValues(itemId);
    maintenanceList = getMaintenanceByItem(itemId).map(parseMaintenanceRecord);
    activityList    = getActivityByItem(itemId, 30);
    locationPath    = item.location_id ? getLocationPath(item.location_id, locations) : '';
    qrDataUrl       = await generateQRDataURL(item.qr_code, 240);
  }

  function getCustomValue(fieldId) {
    const v = customValues.find(v => v.field_id === fieldId);
    return v?.value ?? '—';
  }

  async function handleDelete() {
    if (!await confirmDelete(`"${item.name}"`)) return;
    try { deleteItem(itemId); toastSuccess('Item dihapus'); goto('/items'); }
    catch (e) { toastError(e.message); }
  }

  async function handleStatusChange(status) {
    if (!can('canUpdateStatus')) return;
    const labels = { available:'Tersedia', in_use:'Digunakan', maintenance:'Maintenance', retired:'Tidak Aktif' };
    if (!await confirmAction(`Ubah status menjadi "${labels[status]}"?`, '')) return;
    updateItemStatus(itemId, status);
    logActivity({ item_id: itemId, action: status === 'retired' ? 'retire' : 'update',
      user_id: $currentUser?.id, user_name: $currentUser?.name,
      notes: `Status diubah ke ${labels[status]}` });
    toastSuccess('Status diperbarui'); loadAll();
  }

  function onMaintenanceSaved() { loadAll(); }

  function printQR() {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>QR Label</title>
      <style>body{margin:0;display:flex;flex-direction:column;align-items:center;
      justify-content:center;min-height:100vh;font-family:sans-serif;padding:20px}
      img{width:200px;height:200px}h2{margin:10px 0 4px;font-size:14px;text-align:center}
      p{margin:2px 0;font-size:11px;color:#666;text-align:center}
      @media print{body{padding:0}}</style></head>
      <body><img src="${qrDataUrl}"/>
      <h2>${item.name}</h2>
      ${item.location_name?`<p><b>Lokasi:</b> ${locationPath||item.location_name}</p>`:''}
      ${item.serial_no?`<p><b>S/N:</b> ${item.serial_no}</p>`:''}
      <p style="font-size:9px;color:#aaa;margin-top:6px">${item.qr_code}</p>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }
</script>

<svelte:head><title>{item?.name ?? 'Detail Item'} — Inventory</title></svelte:head>

{#if notFound}
  <div class="page-container">
    <a href="/items" class="btn btn-ghost btn-sm" style="margin-bottom:16px">
      <i class="fa-solid fa-arrow-left"></i> Kembali
    </a>
    <div class="card" style="padding:40px;text-align:center">
      <i class="fa-solid fa-circle-exclamation" style="font-size:2rem;color:var(--danger)"></i>
      <p style="margin-top:12px;color:var(--text-muted)">Item tidak ditemukan.</p>
    </div>
  </div>

{:else if item}
<div class="page-container">

  <!-- Header -->
  <div class="detail-header">
    <a href="/items" class="btn btn-ghost btn-sm">
      <i class="fa-solid fa-arrow-left"></i>
      <span class="hide-xs">Kembali</span>
    </a>
    <div class="detail-actions">
      {#if can('canMaintenance')}
        <button class="btn btn-secondary btn-sm" on:click={() => showMaintModal = true}>
          <i class="fa-solid fa-screwdriver-wrench"></i>
          <span class="hide-xs">Maintenance</span>
        </button>
      {/if}
      {#if can('canEdit')}
        <a href="/items/{itemId}/edit" class="btn btn-secondary btn-sm">
          <i class="fa-solid fa-pen-to-square"></i>
          <span class="hide-xs">Edit</span>
        </a>
      {/if}
      {#if can('canDelete')}
        <button class="btn btn-sm"
          style="background:var(--danger-l);color:var(--danger);border-color:var(--danger-l)"
          on:click={handleDelete} aria-label="Hapus item">
          <i class="fa-solid fa-trash"></i>
        </button>
      {/if}
    </div>
  </div>

  <!-- Hero card -->
  <div class="hero-card card">
    <div class="hero-img-wrap">
      {#if item.image_url}
        <img src={item.image_url} alt={item.name} class="hero-img" />
      {:else}
        <div class="hero-img-placeholder">
          <i class="{item.category_icon ?? 'fa-solid fa-box'}"
             style="font-size:2.5rem;color:{item.category_color ?? 'var(--text-muted)'}"></i>
        </div>
      {/if}
    </div>
    <div class="hero-info">
      {#if item.category_name}
        <span class="hero-cat" style="color:{item.category_color}">
          <i class="{item.category_icon}" style="font-size:.7rem"></i>
          {item.category_name}
        </span>
      {/if}
      <h1 class="hero-name">{item.name}</h1>
      {#if item.brand || item.model}
        <p class="hero-sub">{[item.brand, item.model].filter(Boolean).join(' · ')}</p>
      {/if}
      <div class="hero-badges">
        <StatusBadge status={item.status} />
        <ConditionBadge condition={item.condition} />
      </div>
      {#if locationPath}
        <p class="hero-location">
          <i class="fa-solid fa-location-dot"></i> {locationPath}
          {#if item.location_note}<span class="loc-note"> — {item.location_note}</span>{/if}
        </p>
      {/if}
    </div>
  </div>

  <!-- Highlight custom fields -->
  {#if customValues.filter(v => v.show_on_card && v.value).length > 0}
    <div class="highlight-fields card">
      {#each customValues.filter(v => v.show_on_card && v.value) as cv}
        <div class="hf-item">
          <span class="hf-label">{cv.field_label}</span>
          <span class="hf-value">
            {cv.value}
            {#if cv.field_unit}<span class="hf-unit">{cv.field_unit}</span>{/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Status bar -->
  {#if can('canUpdateStatus')}
    <div class="status-bar card">
      <span class="status-label">Ubah Status:</span>
      <div class="status-btns">
        {#each ['available','in_use','maintenance','retired'] as s}
          <button
            class="status-btn {item.status === s ? 'active-status' : ''}"
            on:click={() => item.status !== s && handleStatusChange(s)}
            disabled={item.status === s}
            title={STATUS_LABELS[s]}
          >
            <i class="fa-solid {s==='available'?'fa-circle-check':s==='in_use'?'fa-person-walking':s==='maintenance'?'fa-screwdriver-wrench':'fa-box-archive'}"></i>
            <span class="hide-xs">{STATUS_LABELS[s]}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab-btn {activeTab==='info'?'active':''}" on:click={() => activeTab='info'}>
      <i class="fa-solid fa-circle-info"></i> Info
    </button>
    <button class="tab-btn {activeTab==='maintenance'?'active':''}" on:click={() => activeTab='maintenance'}>
      <i class="fa-solid fa-screwdriver-wrench"></i> Maintenance
      {#if maintenanceList.length > 0}<span class="tab-count">{maintenanceList.length}</span>{/if}
    </button>
    <button class="tab-btn {activeTab==='activity'?'active':''}" on:click={() => activeTab='activity'}>
      <i class="fa-solid fa-clock-rotate-left"></i> Aktivitas
    </button>
  </div>

  <!-- TAB INFO -->
  {#if activeTab === 'info'}
    <div class="info-grid">
      <div class="info-card card">
        <div class="info-section-title"><i class="fa-solid fa-circle-info"></i> Detail Item</div>
        <div class="info-table">
          <div class="info-row"><span class="info-key">Nama</span><span class="info-val">{item.name}</span></div>
          {#if item.serial_no}<div class="info-row"><span class="info-key">Serial</span><span class="info-val mono">{item.serial_no}</span></div>{/if}
          {#if item.brand}<div class="info-row"><span class="info-key">Brand</span><span class="info-val">{item.brand}</span></div>{/if}
          {#if item.model}<div class="info-row"><span class="info-key">Model</span><span class="info-val">{item.model}</span></div>{/if}
          {#if locationPath}<div class="info-row"><span class="info-key">Lokasi</span><span class="info-val">{locationPath}</span></div>{/if}
          {#if item.location_note}<div class="info-row"><span class="info-key">Ket. Lokasi</span><span class="info-val">{item.location_note}</span></div>{/if}
          <div class="info-row"><span class="info-key">Dibuat</span><span class="info-val">{formatDateTime(item.created_at)}</span></div>
          <div class="info-row"><span class="info-key">Diperbarui</span><span class="info-val">{formatDateTime(item.updated_at)}</span></div>
        </div>
      </div>

      <div class="info-card card">
        <div class="info-section-title"><i class="fa-solid fa-receipt"></i> Pembelian</div>
        <div class="info-table">
          {#if item.purchase_date}<div class="info-row"><span class="info-key">Tgl Beli</span><span class="info-val">{formatDate(item.purchase_date)}</span></div>{/if}
          {#if item.purchase_price}<div class="info-row"><span class="info-key">Harga</span><span class="info-val">{formatCurrency(item.purchase_price)}</span></div>{/if}
          {#if item.warranty_expiry}
            <div class="info-row">
              <span class="info-key">Garansi s/d</span>
              <span class="info-val {new Date(item.warranty_expiry) < new Date() ? 'text-danger' : ''}">
                {formatDate(item.warranty_expiry)}
                {#if new Date(item.warranty_expiry) < new Date()}
                  <span class="expired-badge"><i class="fa-solid fa-triangle-exclamation"></i> Habis</span>
                {/if}
              </span>
            </div>
          {/if}
          {#if !item.purchase_date && !item.purchase_price && !item.warranty_expiry}
            <p class="info-empty">Belum ada data pembelian.</p>
          {/if}
        </div>
        {#if item.notes}
          <div class="info-section-title" style="margin-top:14px"><i class="fa-solid fa-note-sticky"></i> Catatan</div>
          <p class="info-notes">{item.notes}</p>
        {/if}
      </div>

      {#if customFields.length > 0}
        <div class="info-card card full-width">
          <div class="info-section-title"><i class="fa-solid fa-sliders"></i> Informasi Tambahan</div>
          <div class="custom-grid">
            {#each customFields as field}
              <div class="custom-item">
                <span class="custom-key">{field.field_label}</span>
                <span class="custom-val">
                  {getCustomValue(field.id)}
                  {#if field.field_unit && getCustomValue(field.id) !== '—'}
                    <span class="custom-unit">{field.field_unit}</span>
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div class="info-card card qr-section">
        <div class="info-section-title"><i class="fa-solid fa-qrcode"></i> QR Code</div>
        {#if qrDataUrl}
          <img src={qrDataUrl} alt="QR Code" class="qr-img" />
        {:else}
          <div class="spinner" style="margin:20px auto"></div>
        {/if}
        <p class="qr-text">{item.qr_code}</p>
        <div class="qr-btns">
          <button class="btn btn-secondary btn-sm" on:click={() => downloadQR(item.qr_code, item.name)}>
            <i class="fa-solid fa-download"></i> Download
          </button>
          <button class="btn btn-secondary btn-sm" on:click={printQR}>
            <i class="fa-solid fa-print"></i> Print
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- TAB MAINTENANCE -->
  {#if activeTab === 'maintenance'}
    <div class="tab-content">
      <div class="tab-top">
        <p class="tab-count-label">{maintenanceList.length} catatan</p>
        {#if can('canMaintenance')}
          <button class="btn btn-primary btn-sm" on:click={() => showMaintModal = true}>
            <i class="fa-solid fa-plus"></i> Catat Maintenance
          </button>
        {/if}
      </div>
      {#if maintenanceList.length === 0}
        <div class="card" style="padding:40px;text-align:center">
          <i class="fa-solid fa-screwdriver-wrench" style="font-size:2rem;color:var(--text-muted)"></i>
          <p style="margin-top:12px;color:var(--text-muted)">Belum ada catatan maintenance.</p>
        </div>
      {:else}
        <div class="maint-list">
          {#each maintenanceList as rec}
            <div class="maint-card card">
              <div class="maint-header">
                <div class="maint-meta">
                  <i class="fa-solid fa-calendar-days" style="color:var(--info);font-size:.8rem"></i>
                  <span class="maint-date">{formatDateTime(rec.created_at)}</span>
                  {#if rec.technician}
                    <span class="maint-tech">
                      <i class="fa-solid fa-user" style="font-size:.65rem"></i> {rec.technician}
                    </span>
                  {/if}
                </div>
                {#if rec.cost}
                  <span class="maint-cost">
                    <i class="fa-solid fa-money-bill-wave" style="font-size:.7rem"></i>
                    {formatCurrency(rec.cost)}
                  </span>
                {/if}
              </div>
              {#if rec.findings}
                <div class="maint-section">
                  <span class="maint-label"><i class="fa-solid fa-magnifying-glass"></i> Temuan</span>
                  <p class="maint-text">{rec.findings}</p>
                </div>
              {/if}
              {#if rec.actions_taken}
                <div class="maint-section">
                  <span class="maint-label"><i class="fa-solid fa-wrench"></i> Tindakan</span>
                  <p class="maint-text">{rec.actions_taken}</p>
                </div>
              {/if}
              {#if rec.checklist_snapshot?.length > 0}
                <div class="maint-section">
                  <span class="maint-label"><i class="fa-solid fa-list-check"></i> Checklist</span>
                  <div class="snap-checklist">
                    {#each rec.checklist_snapshot as c}
                      <span class="snap-check-item"><i class="fa-solid fa-check" style="color:var(--accent);font-size:.65rem"></i> {c}</span>
                    {/each}
                  </div>
                </div>
              {/if}
              {#if rec.photos?.length > 0}
                <div class="maint-section">
                  <span class="maint-label"><i class="fa-solid fa-images"></i> Dokumentasi</span>
                  <div class="snap-photos">
                    {#each rec.photos as photo}
                      <a href={photo} target="_blank" rel="noopener">
                        <img src={photo} alt="Dokumentasi" class="snap-photo" />
                      </a>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- TAB AKTIVITAS -->
  {#if activeTab === 'activity'}
    <div class="tab-content">
      {#if activityList.length === 0}
        <div class="card" style="padding:40px;text-align:center">
          <i class="fa-solid fa-clock-rotate-left" style="font-size:2rem;color:var(--text-muted)"></i>
          <p style="margin-top:12px;color:var(--text-muted)">Belum ada aktivitas.</p>
        </div>
      {:else}
        <div class="activity-timeline">
          {#each activityList as log}
            <div class="timeline-item">
              <div class="timeline-dot">
                <i class="{ACTION_ICONS[log.action] ?? 'fa-solid fa-circle'}"
                   style="font-size:.65rem;color:{log.action==='create'?'var(--accent)':log.action==='maintenance'?'var(--info)':'var(--primary)'}">
                </i>
              </div>
              <div class="timeline-body">
                <div class="timeline-top">
                  <span class="timeline-action">{ACTION_LABELS[log.action] ?? log.action}</span>
                  {#if log.user_name}
                    <span class="timeline-user"><i class="fa-solid fa-user" style="font-size:.6rem"></i> {log.user_name}</span>
                  {/if}
                  <span class="timeline-time">{timeAgo(log.created_at)}</span>
                </div>
                {#if log.notes}<p class="timeline-notes">{log.notes}</p>{/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

</div>
{/if}

{#if showMaintModal && item}
  <MaintenanceModal
    {item}
    customFields={customFields}
    onClose={() => showMaintModal = false}
    onSaved={onMaintenanceSaved}
  />
{/if}

<style>
  .detail-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:8px}
  .detail-actions{display:flex;gap:6px}
  .hero-card{display:flex;gap:0;overflow:hidden;margin-bottom:12px}
  .hero-img-wrap{width:120px;min-height:120px;flex-shrink:0;background:var(--surface2)}
  .hero-img{width:100%;height:100%;object-fit:contain;background:var(--surface2);display:block}
  .hero-img-placeholder{width:100%;height:120px;display:grid;place-items:center}
  .hero-info{padding:14px;flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
  .hero-cat{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;gap:4px}
  .hero-name{font-size:1.1rem;font-weight:800;color:var(--text);line-height:1.3}
  .hero-sub{font-size:.78rem;color:var(--text-muted)}
  .hero-badges{display:flex;gap:5px;flex-wrap:wrap}
  .hero-location{font-size:.75rem;color:var(--text-muted);display:flex;align-items:center;gap:5px}
  .loc-note{font-style:italic}
  .highlight-fields{display:flex;flex-wrap:wrap;gap:0;overflow:hidden;margin-bottom:12px}
  .hf-item{padding:10px 16px;border-right:1px solid var(--border);min-width:100px}
  .hf-item:last-child{border-right:none}
  .hf-label{display:block;font-size:.68rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:2px}
  .hf-value{font-size:1rem;font-weight:700;color:var(--text)}
  .hf-unit{font-size:.72rem;color:var(--text-muted);margin-left:3px}
  .status-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:16px;flex-wrap:wrap}
  .status-label{font-size:.78rem;font-weight:600;color:var(--text-muted);flex-shrink:0}
  .status-btns{display:flex;gap:5px;flex-wrap:wrap}
  .status-btn{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;border:1.5px solid var(--border);background:var(--surface2);font-size:.75rem;cursor:pointer;transition:all .15s;color:var(--text-muted)}
  .status-btn:hover:not(:disabled){border-color:var(--primary);color:var(--primary)}
  .status-btn.active-status{background:var(--primary);color:#fff;border-color:var(--primary);cursor:default}
  .tab-content{padding-bottom:24px}
  .tab-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .tab-count-label{font-size:.82rem;color:var(--text-muted)}
  .tab-count{background:var(--primary-l);color:var(--primary);font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:10px;margin-left:4px}
  .info-grid{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:24px}
  @media(min-width:640px){.info-grid{grid-template-columns:1fr 1fr}}
  .full-width{grid-column:1/-1}
  .info-card{padding:14px}
  .info-section-title{display:flex;align-items:center;gap:7px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:10px}
  .info-table{display:flex;flex-direction:column}
  .info-row{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)}
  .info-row:last-child{border-bottom:none}
  .info-key{font-size:.78rem;color:var(--text-muted);min-width:90px;flex-shrink:0}
  .info-val{font-size:.82rem;color:var(--text);font-weight:500;flex:1;word-break:break-word}
  .info-val.mono{font-family:var(--font-mono);font-size:.75rem}
  .info-empty{font-size:.82rem;color:var(--text-muted);padding:8px 0}
  .info-notes{font-size:.85rem;color:var(--text);line-height:1.6;white-space:pre-wrap}
  .text-danger{color:var(--danger)!important}
  .expired-badge{background:var(--danger-l);color:var(--danger);font-size:.65rem;padding:1px 6px;border-radius:10px;margin-left:4px}
  .custom-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  @media(min-width:640px){.custom-grid{grid-template-columns:repeat(3,1fr)}}
  .custom-item{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px}
  .custom-key{display:block;font-size:.68rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:4px}
  .custom-val{font-size:.9rem;font-weight:600;color:var(--text)}
  .custom-unit{font-size:.7rem;color:var(--text-muted);margin-left:2px;font-weight:400}
  .qr-section{text-align:center}
  .qr-img{width:160px;height:160px;margin:0 auto 8px;border:1px solid var(--border);border-radius:var(--radius-sm);display:block}
  .qr-text{font-family:var(--font-mono);font-size:.6rem;color:var(--text-muted);word-break:break-all;margin-bottom:10px}
  .qr-btns{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
  .maint-list{display:flex;flex-direction:column;gap:12px}
  .maint-card{padding:14px}
  .maint-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .maint-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .maint-date{font-size:.82rem;font-weight:600;color:var(--text)}
  .maint-tech{font-size:.75rem;color:var(--text-muted);display:flex;align-items:center;gap:4px}
  .maint-cost{font-size:.78rem;font-weight:600;color:var(--accent);display:flex;align-items:center;gap:4px}
  .maint-section{margin-bottom:10px}
  .maint-label{display:flex;align-items:center;gap:6px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);margin-bottom:5px}
  .maint-text{font-size:.85rem;color:var(--text);line-height:1.6;white-space:pre-wrap}
  .snap-checklist{display:flex;flex-direction:column;gap:3px}
  .snap-check-item{font-size:.8rem;color:var(--text);display:flex;align-items:center;gap:6px}
  .snap-photos{display:flex;gap:8px;flex-wrap:wrap}
  .snap-photo{width:80px;height:80px;object-fit:cover;border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer}
  .activity-timeline{display:flex;flex-direction:column}
  .timeline-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
  .timeline-item:last-child{border-bottom:none}
  .timeline-dot{width:28px;height:28px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:grid;place-items:center;flex-shrink:0;margin-top:2px}
  .timeline-body{flex:1;min-width:0}
  .timeline-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .timeline-action{font-size:.85rem;font-weight:600;color:var(--text)}
  .timeline-user{font-size:.72rem;color:var(--text-muted);display:flex;align-items:center;gap:3px}
  .timeline-time{font-size:.7rem;color:var(--text-muted);margin-left:auto;white-space:nowrap}
  .timeline-notes{font-size:.78rem;color:var(--text-muted);margin-top:3px;line-height:1.5}
  @media(max-width:400px){.hide-xs{display:none}}
</style>
