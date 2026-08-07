<script>
  import { currentUser } from '$lib/stores/ui.js';
  import { getChecklistByCategory } from '$lib/db/categories.js';
  import { createMaintenanceRecord } from '$lib/db/maintenance.js';
  import { setCustomValues, getCustomValues } from '$lib/db/items.js';
  import { compressImage } from '$lib/utils/format.js';
  import { toastSuccess, toastError } from '$lib/utils/swal.js';
  import CustomFieldForm from './CustomFieldForm.svelte';

  export let item        = null;
  export let customFields = [];
  export let onClose     = () => {};
  export let onSaved     = () => {};

  let saving      = false;
  let findings    = '';
  let actionsTaken = '';
  let cost        = '';
  let checklist   = [];      // [{ id, item_text, checked }]
  let customValues = {};
  let photos      = [];      // base64 strings

  // Load checklist & existing custom values saat modal buka
  $: if (item) {
    const tpl = getChecklistByCategory(item.category_id ?? 0);
    checklist = tpl.map(t => ({ ...t, checked: false }));
    const existing = getCustomValues(item.id);
    customValues = {};
    existing.forEach(v => { customValues[v.field_id] = v.value ?? ''; });
  }

  function onCustomChange(fieldId, value) {
    customValues = { ...customValues, [fieldId]: value };
  }

  async function onPhotoChange(e) {
    const files = [...e.target.files];
    if (photos.length + files.length > 10) {
      toastError('Maksimal 10 foto'); return;
    }
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toastError('Foto maks 5MB'); continue; }
      try {
        const compressed = await compressImage(file, 600, 0.7);
        photos = [...photos, compressed];
      } catch { toastError('Gagal memproses foto'); }
    }
    e.target.value = '';
  }

  function removePhoto(i) {
    photos = photos.filter((_, idx) => idx !== i);
  }

  async function handleSave() {
    if (!findings.trim() && !actionsTaken.trim()) {
      toastError('Isi minimal temuan atau tindakan yang dilakukan');
      return;
    }
    saving = true;
    try {
      // Snapshot custom values saat ini
      const fieldSnapshot = {};
      customFields.forEach(f => {
        fieldSnapshot[f.field_key] = customValues[f.id] ?? '';
      });

      // Snapshot checklist
      const checklistSnapshot = checklist
        .filter(c => c.checked)
        .map(c => c.item_text);

      // Simpan maintenance record
      createMaintenanceRecord({
        item_id:           item.id,
        technician_id:     $currentUser?.id   ?? null,
        technician:        $currentUser?.name ?? null,
        findings:          findings.trim()     || null,
        actions_taken:     actionsTaken.trim() || null,
        field_snapshot:    fieldSnapshot,
        checklist_snapshot: checklistSnapshot,
        photos:            photos.length > 0 ? photos : null,
        cost:              cost ? parseFloat(cost) : null,
        user_id:           $currentUser?.id   ?? null,
        user_name:         $currentUser?.name ?? null,
      });

      // Update custom values ke nilai terbaru
      if (Object.keys(customValues).length > 0) {
        setCustomValues(item.id, customValues);
      }

      toastSuccess('Catatan maintenance disimpan');
      onSaved();
      onClose();
    } catch (err) {
      toastError('Gagal simpan: ' + err.message);
    } finally {
      saving = false;
    }
  }
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="modal-backdrop" on:click|self={onClose} on:keydown={(e) => e.key === 'Escape' && onClose()} role="dialog" aria-modal="true" aria-label="Catat Maintenance" tabindex="-1">
  <div class="modal-box">

    <!-- Header -->
    <div class="modal-header">
      <div class="modal-title">
        <i class="fa-solid fa-screwdriver-wrench" style="color:var(--info)"></i>
        Catat Maintenance
      </div>
      <button class="btn-icon" on:click={onClose} aria-label="Tutup modal">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <!-- Item info strip -->
    <div class="modal-item-info">
      <div class="item-icon" style="background:{item?.category_color ?? 'var(--border)'}20; color:{item?.category_color ?? 'var(--text-muted)'}">
        <i class="{item?.category_icon ?? 'fa-solid fa-box'}"></i>
      </div>
      <div>
        <p class="item-name">{item?.name}</p>
        {#if item?.location_name}
          <p class="item-loc">
            <i class="fa-solid fa-location-dot" style="font-size:.65rem"></i>
            {item.location_name}
          </p>
        {/if}
      </div>
      <div class="item-tech">
        <i class="fa-solid fa-user" style="color:var(--text-muted);font-size:.75rem"></i>
        <span>{$currentUser?.name ?? 'Teknisi'}</span>
      </div>
    </div>

    <!-- Body -->
    <div class="modal-body">

      <!-- Checklist -->
      {#if checklist.length > 0}
        <div class="modal-section">
          <div class="modal-section-title">
            <i class="fa-solid fa-list-check"></i> Checklist Pemeriksaan
          </div>
          <div class="checklist-list">
            {#each checklist as item, i}
              <label class="check-item">
                <input type="checkbox" bind:checked={checklist[i].checked} />
                <span class="check-text {checklist[i].checked ? 'checked' : ''}">{item.item_text}</span>
              </label>
            {/each}
          </div>
          <p class="checklist-summary">
            {checklist.filter(c => c.checked).length} / {checklist.length} item selesai
          </p>
        </div>
      {/if}

      <!-- Temuan & Tindakan -->
      <div class="modal-section">
        <div class="modal-section-title">
          <i class="fa-solid fa-clipboard-list"></i> Laporan Pekerjaan
        </div>
        <div class="form-group">
          <label class="form-label" for="maint-findings">Temuan / Kondisi Saat Ini</label>
          <textarea id="maint-findings" class="form-input" rows="3" bind:value={findings}
            placeholder="Jelaskan kondisi item saat diperiksa..."></textarea>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label" for="maint-actions">Tindakan yang Dilakukan</label>
          <textarea id="maint-actions" class="form-input" rows="3" bind:value={actionsTaken}
            placeholder="Jelaskan tindakan perbaikan / perawatan yang dilakukan..."></textarea>
        </div>
      </div>

      <!-- Update Custom Fields -->
      {#if customFields.length > 0}
        <div class="modal-section">
          <div class="modal-section-title">
            <i class="fa-solid fa-sliders"></i> Update Nilai Teknis
          </div>
          <p class="form-hint" style="margin-bottom:10px">
            <i class="fa-solid fa-circle-info" style="font-size:.65rem"></i>
            Nilai di bawah akan diperbarui dan disimpan sebagai snapshot pada record ini.
          </p>
          <CustomFieldForm
            fields={customFields}
            values={customValues}
            onChange={onCustomChange}
          />
        </div>
      {/if}

      <!-- Biaya & Foto -->
      <div class="modal-section">
        <div class="modal-section-title">
          <i class="fa-solid fa-money-bill-wave"></i> Biaya & Dokumentasi
        </div>
        <div class="form-group">
          <label class="form-label" for="maint-cost">Biaya Maintenance (Rp)</label>
          <input id="maint-cost" class="form-input" type="number" bind:value={cost}
            placeholder="0" min="0" step="1000" />
        </div>

        <!-- Foto dokumentasi -->
        <div class="form-group" style="margin:0">
          <label class="form-label" for="photo-upload">
            Foto Dokumentasi
            <span class="cf-unit">{photos.length}/10</span>
          </label>
          <div class="photo-grid">
            {#each photos as photo, i}
              <div class="photo-item">
                <img src={photo} alt="Foto {i+1}" />
                <button type="button" class="photo-remove" on:click={() => removePhoto(i)} aria-label="Hapus foto {i+1}">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            {/each}
            {#if photos.length < 10}
              <label class="photo-add" for="photo-upload">
                <i class="fa-solid fa-camera"></i>
                <span>Tambah</span>
              </label>
              <input id="photo-upload" type="file" accept="image/*" multiple hidden on:change={onPhotoChange} />
            {/if}
          </div>
        </div>
      </div>

    </div><!-- /modal-body -->

    <!-- Footer -->
    <div class="modal-footer">
      <button class="btn btn-ghost" on:click={onClose}>Batal</button>
      <button class="btn btn-primary" on:click={handleSave} disabled={saving}>
        {#if saving}
          <span class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          Menyimpan...
        {:else}
          <i class="fa-solid fa-floppy-disk"></i> Simpan Record
        {/if}
      </button>
    </div>

  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.5);
    display: flex; align-items: flex-end;
    z-index: 100;
    animation: fadeIn .2s ease;
  }
  @media (min-width: 640px) {
    .modal-backdrop { align-items: center; justify-content: center; }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal-box {
    background: var(--surface);
    width: 100%; max-width: 600px;
    border-radius: var(--radius) var(--radius) 0 0;
    max-height: 90vh;
    display: flex; flex-direction: column;
    animation: slideUp .25s ease;
  }
  @media (min-width: 640px) {
    .modal-box { border-radius: var(--radius); max-height: 85vh; }
  }
  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .modal-title {
    font-size: .95rem; font-weight: 700;
    display: flex; align-items: center; gap: 8px;
  }

  .modal-item-info {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 16px;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .item-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: grid; place-items: center; font-size: .85rem; flex-shrink: 0;
  }
  .item-name { font-size: .85rem; font-weight: 600; color: var(--text); }
  .item-loc  { font-size: .72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 1px; }
  .item-tech { margin-left: auto; display: flex; align-items: center; gap: 5px;
               font-size: .78rem; color: var(--text-muted); flex-shrink: 0; }

  .modal-body {
    flex: 1; overflow-y: auto;
    padding: 16px;
    display: flex; flex-direction: column; gap: 0;
  }

  .modal-section { margin-bottom: 20px; }
  .modal-section:last-child { margin-bottom: 0; }
  .modal-section-title {
    display: flex; align-items: center; gap: 7px;
    font-size: .78rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .05em;
    color: var(--text-muted);
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  /* Checklist */
  .checklist-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
  .check-item {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 10px; border-radius: var(--radius-sm);
    background: var(--surface2); cursor: pointer;
    transition: background .15s;
  }
  .check-item:hover { background: var(--primary-l); }
  .check-item input { width: 15px; height: 15px; accent-color: var(--primary); flex-shrink: 0; }
  .check-text { font-size: .85rem; color: var(--text); transition: all .15s; }
  .check-text.checked { text-decoration: line-through; color: var(--text-muted); }
  .checklist-summary { font-size: .75rem; color: var(--text-muted); text-align: right; }

  /* Photos */
  .photo-grid {
    display: flex; gap: 8px; flex-wrap: wrap;
  }
  .photo-item {
    position: relative; width: 80px; height: 80px;
  }
  .photo-item img {
    width: 100%; height: 100%; object-fit: cover;
    border-radius: var(--radius-sm); border: 1px solid var(--border);
  }
  .photo-remove {
    position: absolute; top: -6px; right: -6px;
    width: 20px; height: 20px; border-radius: 50%;
    background: var(--danger); color: #fff; border: none;
    cursor: pointer; display: grid; place-items: center; font-size: .6rem;
  }
  .photo-add {
    width: 80px; height: 80px;
    border: 2px dashed var(--border); border-radius: var(--radius-sm);
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 4px; cursor: pointer;
    color: var(--text-muted); font-size: .65rem;
    transition: all .15s;
  }
  .photo-add:hover { border-color: var(--primary); color: var(--primary); }
  .photo-add i { font-size: 1.1rem; }

  .cf-unit {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 1px 5px;
    font-size: .65rem; color: var(--text-muted);
    margin-left: 4px; font-weight: 400;
  }

  .modal-footer {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
</style>
