<script>
  import { page }    from '$app/stores';
  import { goto }    from '$app/navigation';
  import { dbReady } from '$lib/stores/db.js';
  import { currentUser } from '$lib/stores/ui.js';

  import CustomFieldForm from '$lib/components/CustomFieldForm.svelte';
  import LocationPicker  from '$lib/components/LocationPicker.svelte';

  import { getItemById, updateItem, getCustomValues, setCustomValues } from '$lib/db/items.js';
  import { getAllCategories, getFieldsByCategory } from '$lib/db/categories.js';
  import { logActivity }   from '$lib/db/activity.js';
  import { compressImage } from '$lib/utils/format.js';
  import { toastSuccess, toastError, alertError } from '$lib/utils/swal.js';

  let itemId     = null;
  let item       = null;
  let categories = [];
  let customFields  = [];
  let customValues  = {};
  let saving     = false;
  let imagePreview = '';
  let notFound   = false;

  let form = {
    name: '', category_id: '', brand: '', model: '',
    serial_no: '', location_id: null, location_note: '',
    condition: 'good', status: 'available',
    purchase_date: '', purchase_price: '',
    warranty_expiry: '', notes: '', image_url: ''
  };

  // Load item saat db siap dan ID tersedia
  $: if ($dbReady && $page.params.id) {
    itemId = parseInt($page.params.id);
    loadItem();
  }

  function loadItem() {
    categories = getAllCategories();
    item       = getItemById(itemId);

    if (!item) { notFound = true; return; }

    // Isi form dari data item
    form = {
      name:           item.name           ?? '',
      category_id:    item.category_id    ? String(item.category_id) : '',
      brand:          item.brand          ?? '',
      model:          item.model          ?? '',
      serial_no:      item.serial_no      ?? '',
      location_id:    item.location_id    ?? null,
      location_note:  item.location_note  ?? '',
      condition:      item.condition      ?? 'good',
      status:         item.status         ?? 'available',
      purchase_date:  item.purchase_date  ?? '',
      purchase_price: item.purchase_price != null ? String(item.purchase_price) : '',
      warranty_expiry:item.warranty_expiry ?? '',
      notes:          item.notes          ?? '',
      image_url:      item.image_url      ?? ''
    };

    imagePreview = item.image_url ?? '';
    loadCustomFields();
  }

  function loadCustomFields() {
    if (!form.category_id) { customFields = []; customValues = {}; return; }
    customFields = getFieldsByCategory(parseInt(form.category_id));

    // Load existing values
    const existing = getCustomValues(itemId);
    customValues = {};
    existing.forEach(v => { customValues[v.field_id] = v.value ?? ''; });
  }

  // Saat kategori berubah — reload fields tapi pertahankan nilai yang masih relevan
  function onCategoryChange() {
    const prevValues = { ...customValues };
    loadCustomFields();
    // Pertahankan nilai yang field_id-nya masih ada
    const fieldIds = new Set(customFields.map(f => f.id));
    customValues = Object.fromEntries(
      Object.entries(prevValues).filter(([k]) => fieldIds.has(parseInt(k)))
    );
  }

  function onCustomChange(fieldId, value) {
    customValues = { ...customValues, [fieldId]: value };
  }

  // Image
  async function onImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toastError('Ukuran gambar maksimal 5MB'); return; }
    try {
      const compressed = await compressImage(file, 800, 0.75);
      form.image_url   = compressed;
      imagePreview     = compressed;
    } catch { toastError('Gagal memproses gambar'); }
  }
  function removeImage() { form.image_url = ''; imagePreview = ''; }

  function validate() {
    if (!form.name.trim()) { alertError('Nama item wajib diisi'); return false; }
    for (const f of customFields) {
      if (f.is_required && !customValues[f.id]) {
        alertError(`Field "${f.field_label}" wajib diisi`); return false;
      }
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    saving = true;
    try {
      updateItem(itemId, {
        name:           form.name.trim(),
        category_id:    form.category_id ? parseInt(form.category_id) : null,
        brand:          form.brand.trim()    || null,
        model:          form.model.trim()    || null,
        serial_no:      form.serial_no.trim()|| null,
        location_id:    form.location_id,
        location_note:  form.location_note.trim() || null,
        condition:      form.condition,
        status:         form.status,
        purchase_date:  form.purchase_date   || null,
        purchase_price: form.purchase_price  ? parseFloat(form.purchase_price) : null,
        warranty_expiry:form.warranty_expiry || null,
        notes:          form.notes.trim()    || null,
        image_url:      form.image_url       || null,
      });

      if (Object.keys(customValues).length > 0) {
        setCustomValues(itemId, customValues);
      }

      logActivity({
        item_id:   itemId, action: 'update',
        user_id:   $currentUser?.id   ?? null,
        user_name: $currentUser?.name ?? null,
        notes:     'Data item diperbarui'
      });

      toastSuccess('Item berhasil diperbarui');
      goto(`/items/${itemId}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Edit Item — Inventory</title></svelte:head>

{#if notFound}
  <div class="page-container">
    <div class="page-header">
      <a href="/items" class="btn btn-ghost btn-sm"><i class="fa-solid fa-arrow-left"></i> Kembali</a>
    </div>
    <div class="card" style="padding:40px;text-align:center">
      <i class="fa-solid fa-circle-exclamation" style="font-size:2rem;color:var(--danger)"></i>
      <p style="margin-top:12px;color:var(--text-muted)">Item tidak ditemukan.</p>
    </div>
  </div>

{:else if item}
<div class="page-container">

  <div class="page-header">
    <a href="/items/{itemId}" class="btn btn-ghost btn-sm">
      <i class="fa-solid fa-arrow-left"></i> Kembali
    </a>
    <h1 class="page-title">Edit Item</h1>
  </div>

  <form on:submit={handleSubmit}>
    <div class="form-layout">

      <!-- KIRI -->
      <div class="form-main">

        <div class="form-section card">
          <div class="section-title"><i class="fa-solid fa-circle-info"></i> Informasi Dasar</div>

          <div class="form-group">
            <label class="form-label" for="name">Nama Item <span style="color:var(--danger)">*</span></label>
            <input id="name" class="form-input" type="text" bind:value={form.name} required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="category">Kategori</label>
              <select id="category" class="form-input form-select"
                bind:value={form.category_id} on:change={onCategoryChange}>
                <option value="">-- Pilih Kategori --</option>
                {#each categories as cat}
                  <option value={cat.id}>{cat.name}</option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="brand">Brand / Merek</label>
              <input id="brand" class="form-input" type="text" bind:value={form.brand} />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="model">Model / Tipe</label>
              <input id="model" class="form-input" type="text" bind:value={form.model} />
            </div>
            <div class="form-group">
              <label class="form-label" for="serial">Nomor Serial</label>
              <input id="serial" class="form-input" type="text" bind:value={form.serial_no} />
            </div>
          </div>

          <LocationPicker value={form.location_id} onChange={(id) => form.location_id = id} />

          <div class="form-group">
            <label class="form-label" for="loc-note">Keterangan Lokasi</label>
            <input id="loc-note" class="form-input" type="text" bind:value={form.location_note} />
          </div>
        </div>

        <div class="form-section card">
          <div class="section-title"><i class="fa-solid fa-circle-half-stroke"></i> Status & Kondisi</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="status">Status</label>
              <select id="status" class="form-input form-select" bind:value={form.status}>
                <option value="available">Tersedia</option>
                <option value="in_use">Digunakan</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Tidak Aktif</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="condition">Kondisi</label>
              <select id="condition" class="form-input form-select" bind:value={form.condition}>
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
                <option value="poor">Buruk</option>
                <option value="broken">Rusak</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section card">
          <div class="section-title"><i class="fa-solid fa-receipt"></i> Data Pembelian</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="purchase-date">Tanggal Beli</label>
              <input id="purchase-date" class="form-input" type="date" bind:value={form.purchase_date} />
            </div>
            <div class="form-group">
              <label class="form-label" for="purchase-price">Harga Beli (Rp)</label>
              <input id="purchase-price" class="form-input" type="number"
                bind:value={form.purchase_price} min="0" step="1000" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="warranty">Garansi Habis</label>
              <input id="warranty" class="form-input" type="date" bind:value={form.warranty_expiry} />
            </div>
          </div>
        </div>

        <div class="form-section card">
          <div class="section-title"><i class="fa-solid fa-note-sticky"></i> Catatan</div>
          <div class="form-group" style="margin:0">
            <textarea class="form-input" rows="3" bind:value={form.notes}></textarea>
          </div>
        </div>

        {#if customFields.length > 0}
          <div class="form-section">
            <CustomFieldForm fields={customFields} values={customValues} onChange={onCustomChange} />
          </div>
        {/if}

      </div><!-- /form-main -->

      <!-- KANAN: Foto -->
      <div class="form-side">
        <!-- QR Code info (read-only di edit) -->
        <div class="form-section card">
          <div class="section-title"><i class="fa-solid fa-qrcode"></i> QR Code</div>
          <p class="form-hint" style="margin:0 0 8px">
            <i class="fa-solid fa-circle-info" style="font-size:.65rem"></i>
            QR Code tidak bisa diubah setelah item dibuat.
          </p>
          <p style="font-family:var(--font-mono);font-size:.65rem;color:var(--text-muted);word-break:break-all">
            {item.qr_code}
          </p>
          <a href="/items/{itemId}" class="btn btn-ghost btn-sm" style="margin-top:10px;width:100%;justify-content:center">
            <i class="fa-solid fa-qrcode"></i> Lihat QR Code
          </a>
        </div>

        <!-- Foto -->
        <div class="form-section card">
          <div class="section-title"><i class="fa-solid fa-image"></i> Foto Item</div>
          {#if imagePreview}
            <div class="img-preview-wrap">
              <img src={imagePreview} alt="Preview" class="img-preview" />
              <button type="button" class="btn-icon img-remove" on:click={removeImage} aria-label="Hapus foto">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <label class="btn btn-ghost btn-sm" for="img-upload" style="margin-top:8px;width:100%;justify-content:center;cursor:pointer">
              <i class="fa-solid fa-rotate"></i> Ganti Foto
            </label>
          {:else}
            <label class="img-upload-zone" for="img-upload">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <span>Klik untuk upload foto</span>
              <span class="form-hint">JPG, PNG — maks 5MB</span>
            </label>
          {/if}
          <input id="img-upload" type="file" accept="image/*" hidden on:change={onImageChange} />
        </div>
      </div>

    </div><!-- /form-layout -->

    <div class="submit-bar">
      <a href="/items/{itemId}" class="btn btn-ghost">
        <i class="fa-solid fa-xmark"></i> Batal
      </a>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {#if saving}
          <span class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          Menyimpan...
        {:else}
          <i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan
        {/if}
      </button>
    </div>

  </form>
</div>
{/if}

<style>
  .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .form-layout { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 80px; }
  @media (min-width: 768px) { .form-layout { grid-template-columns: 1fr 280px; align-items: start; } }
  .form-main { display: flex; flex-direction: column; gap: 14px; }
  .form-side  { display: flex; flex-direction: column; gap: 14px; }
  @media (max-width: 767px) { .form-side { order: -1; } }
  .form-section.card { padding: 16px; }
  .section-title {
    display: flex; align-items: center; gap: 8px;
    font-size: .8rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .05em; color: var(--text-muted);
    margin-bottom: 14px; padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
  .img-preview-wrap { position: relative; }
  .img-preview { width: 100%; border-radius: var(--radius-sm); object-fit: contain; max-height: 200px; background: var(--surface2); }
  .img-remove {
    position: absolute; top: 6px; right: 6px;
    background: rgba(0,0,0,.5); color: #fff;
    border-radius: 50%; width: 26px; height: 26px;
  }
  .img-upload-zone {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 24px 16px; border: 2px dashed var(--border);
    border-radius: var(--radius-sm); cursor: pointer;
    transition: all .2s; color: var(--text-muted); text-align: center;
  }
  .img-upload-zone:hover { border-color: var(--primary); color: var(--primary); }
  .img-upload-zone i { font-size: 1.5rem; }
  .img-upload-zone span { font-size: .82rem; }
  .submit-bar {
    position: fixed; bottom: var(--bottomnav-h); left: 0; right: 0;
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 12px 20px; background: var(--surface);
    border-top: 1px solid var(--border);
    box-shadow: 0 -2px 10px rgba(0,0,0,.06); z-index: 40;
  }
  @media (min-width: 1024px) { .submit-bar { left: var(--sidebar-w); bottom: 0; } }
</style>
