<script>
  import { onMount } from 'svelte';
  import { goto }    from '$app/navigation';
  import { dbReady } from '$lib/stores/db.js';
  import { currentUser } from '$lib/stores/ui.js';

  import CustomFieldForm from '$lib/components/CustomFieldForm.svelte';
  import LocationPicker  from '$lib/components/LocationPicker.svelte';

  import { createItem, generateQRCode, setCustomValues } from '$lib/db/items.js';
  import { getAllCategories, getFieldsByCategory }       from '$lib/db/categories.js';
  import { logActivity }   from '$lib/db/activity.js';
  import { compressImage } from '$lib/utils/format.js';
  import { generateQRDataURL } from '$lib/utils/qr.js';
  import { toastSuccess, toastError, alertError } from '$lib/utils/swal.js';

  // ── Form state ─────────────────────────────────────────
  let form = {
    name: '', category_id: '', brand: '', model: '',
    serial_no: '', location_id: null, location_note: '',
    condition: 'good', status: 'available',
    purchase_date: '', purchase_price: '',
    warranty_expiry: '', notes: '', image_url: ''
  };

  let categories    = [];
  let customFields  = [];
  let customValues  = {};   // { field_id: value }
  let qrPreview     = '';
  let qrCode        = '';
  let saving        = false;
  let imagePreview  = '';

  $: if ($dbReady) {
    categories = getAllCategories();
    qrCode     = generateQRCode();
    generateQRDataURL(qrCode).then(url => qrPreview = url);
  }

  // Reload custom fields saat kategori berubah
  $: if (form.category_id && $dbReady) {
    customFields = getFieldsByCategory(parseInt(form.category_id));
    customValues = {};
  } else {
    customFields = [];
    customValues = {};
  }

  function onCustomChange(fieldId, value) {
    customValues = { ...customValues, [fieldId]: value };
  }

  // ── Image upload ──────────────────────────────────────
  async function onImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toastError('Ukuran gambar maksimal 5MB'); return;
    }
    try {
      const compressed  = await compressImage(file, 800, 0.75);
      form.image_url    = compressed;
      imagePreview      = compressed;
    } catch { toastError('Gagal memproses gambar'); }
  }
  function removeImage() { form.image_url = ''; imagePreview = ''; }

  // ── Regenerate QR ────────────────────────────────────
  function regenQR() {
    qrCode = generateQRCode();
    generateQRDataURL(qrCode).then(url => qrPreview = url);
  }

  // ── Validate ─────────────────────────────────────────
  function validate() {
    if (!form.name.trim()) { alertError('Nama item wajib diisi'); return false; }
    // Cek required custom fields
    for (const f of customFields) {
      if (f.is_required && !customValues[f.id]) {
        alertError(`Field "${f.field_label}" wajib diisi`); return false;
      }
    }
    return true;
  }

  // ── Submit ────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    saving = true;
    try {
      const itemId = createItem({
        qr_code:        qrCode,
        name:           form.name.trim(),
        category_id:    form.category_id   ? parseInt(form.category_id)   : null,
        brand:          form.brand.trim()   || null,
        model:          form.model.trim()   || null,
        serial_no:      form.serial_no.trim() || null,
        location_id:    form.location_id,
        location_note:  form.location_note.trim() || null,
        condition:      form.condition,
        status:         form.status,
        purchase_date:  form.purchase_date  || null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        warranty_expiry:form.warranty_expiry || null,
        notes:          form.notes.trim()   || null,
        image_url:      form.image_url      || null,
      });

      // Simpan custom field values
      if (Object.keys(customValues).length > 0) {
        setCustomValues(itemId, customValues);
      }

      // Log aktivitas
      logActivity({
        item_id:   itemId,
        action:    'create',
        user_id:   $currentUser?.id   ?? null,
        user_name: $currentUser?.name ?? null,
        notes:     `Item "${form.name}" ditambahkan`
      });

      toastSuccess('Item berhasil ditambahkan');
      goto(`/items/${itemId}`);
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Tambah Item — Inventory</title></svelte:head>

<div class="page-container">

  <!-- Back + title -->
  <div class="page-header">
    <a href="/items" class="btn btn-ghost btn-sm">
      <i class="fa-solid fa-arrow-left"></i> Kembali
    </a>
    <h1 class="page-title">Tambah Item Baru</h1>
  </div>

  <form on:submit={handleSubmit}>
    <div class="form-layout">

      <!-- ── KOLOM KIRI: Form utama ── -->
      <div class="form-main">

        <!-- Informasi Dasar -->
        <div class="form-section card">
          <div class="section-title">
            <i class="fa-solid fa-circle-info"></i> Informasi Dasar
          </div>

          <div class="form-group">
            <label class="form-label" for="name">
              Nama Item <span style="color:var(--danger)">*</span>
            </label>
            <input id="name" class="form-input" type="text"
              bind:value={form.name} placeholder="Contoh: AC Split Daikin 1 PK" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="category">Kategori</label>
              <select id="category" class="form-input form-select" bind:value={form.category_id}>
                <option value="">-- Pilih Kategori --</option>
                {#each categories as cat}
                  <option value={cat.id}>
                    {cat.name}
                  </option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="brand">Brand / Merek</label>
              <input id="brand" class="form-input" type="text"
                bind:value={form.brand} placeholder="Contoh: Daikin, Samsung" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="model">Model / Tipe</label>
              <input id="model" class="form-input" type="text"
                bind:value={form.model} placeholder="Contoh: FTC25NV14" />
            </div>
            <div class="form-group">
              <label class="form-label" for="serial">Nomor Serial</label>
              <input id="serial" class="form-input" type="text"
                bind:value={form.serial_no} placeholder="Nomor seri unit" />
            </div>
          </div>

          <!-- Lokasi -->
          <LocationPicker
            value={form.location_id}
            onChange={(id) => form.location_id = id}
          />

          <div class="form-group">
            <label class="form-label" for="loc-note">Keterangan Lokasi</label>
            <input id="loc-note" class="form-input" type="text"
              bind:value={form.location_note}
              placeholder="Contoh: Pojok kiri dekat jendela" />
          </div>
        </div>

        <!-- Status & Kondisi -->
        <div class="form-section card">
          <div class="section-title">
            <i class="fa-solid fa-circle-half-stroke"></i> Status & Kondisi
          </div>
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

        <!-- Pembelian -->
        <div class="form-section card">
          <div class="section-title">
            <i class="fa-solid fa-receipt"></i> Data Pembelian
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="purchase-date">Tanggal Beli</label>
              <input id="purchase-date" class="form-input" type="date"
                bind:value={form.purchase_date} />
            </div>
            <div class="form-group">
              <label class="form-label" for="purchase-price">Harga Beli (Rp)</label>
              <input id="purchase-price" class="form-input" type="number"
                bind:value={form.purchase_price} placeholder="0" min="0" step="1000" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="warranty">Garansi Habis</label>
              <input id="warranty" class="form-input" type="date"
                bind:value={form.warranty_expiry} />
              <p class="form-hint">
                <i class="fa-solid fa-circle-info" style="font-size:.65rem"></i>
                Akan muncul notifikasi saat mendekati tanggal ini
              </p>
            </div>
          </div>
        </div>

        <!-- Catatan -->
        <div class="form-section card">
          <div class="section-title">
            <i class="fa-solid fa-note-sticky"></i> Catatan
          </div>
          <div class="form-group" style="margin:0">
            <textarea class="form-input" rows="3"
              bind:value={form.notes}
              placeholder="Catatan tambahan tentang item ini..."></textarea>
          </div>
        </div>

        <!-- Custom Fields (muncul jika kategori dipilih dan punya field) -->
        {#if customFields.length > 0}
          <div class="form-section">
            <CustomFieldForm
              fields={customFields}
              values={customValues}
              onChange={onCustomChange}
            />
          </div>
        {/if}

      </div><!-- /form-main -->

      <!-- ── KOLOM KANAN: QR + Foto ── -->
      <div class="form-side">

        <!-- QR Code -->
        <div class="form-section card qr-card">
          <div class="section-title">
            <i class="fa-solid fa-qrcode"></i> QR Code
          </div>
          <div class="qr-preview-wrap">
            {#if qrPreview}
              <img src={qrPreview} alt="QR Code" class="qr-img" />
            {:else}
              <div class="qr-placeholder">
                <div class="spinner"></div>
              </div>
            {/if}
          </div>
          <p class="qr-code-text">{qrCode}</p>
          <button type="button" class="btn btn-ghost btn-sm" on:click={regenQR}>
            <i class="fa-solid fa-rotate"></i> Generate Ulang
          </button>
          <p class="form-hint" style="text-align:center;margin-top:6px">
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--warning);font-size:.65rem"></i>
            QR Code ini akan aktif setelah item disimpan. Jangan cetak label sebelum klik <strong>Simpan Item</strong>.
          </p>
        </div>

        <!-- Foto Item -->
        <div class="form-section card">
          <div class="section-title">
            <i class="fa-solid fa-image"></i> Foto Item
          </div>
          {#if imagePreview}
            <div class="img-preview-wrap">
              <img src={imagePreview} alt="Preview" class="img-preview" />
              <button type="button" class="btn-icon img-remove" on:click={removeImage} title="Hapus foto">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          {:else}
            <label class="img-upload-zone" for="img-upload">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <span>Klik untuk upload foto</span>
              <span class="form-hint">JPG, PNG — maks 5MB</span>
            </label>
            <input id="img-upload" type="file" accept="image/*" hidden on:change={onImageChange} />
          {/if}
        </div>

      </div><!-- /form-side -->

    </div><!-- /form-layout -->

    <!-- ── Submit bar ── -->
    <div class="submit-bar">
      <a href="/items" class="btn btn-ghost">
        <i class="fa-solid fa-xmark"></i> Batal
      </a>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {#if saving}
          <span class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          Menyimpan...
        {:else}
          <i class="fa-solid fa-floppy-disk"></i> Simpan Item
        {/if}
      </button>
    </div>

  </form>
</div>

<style>
  .page-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px; flex-wrap: wrap;
  }

  .form-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 80px;
  }
  @media (min-width: 768px) {
    .form-layout { grid-template-columns: 1fr 280px; align-items: start; }
  }

  .form-main { display: flex; flex-direction: column; gap: 14px; }
  .form-side  { display: flex; flex-direction: column; gap: 14px; }

  @media (max-width: 767px) {
    .form-side { order: -1; }
  }

  .form-section { overflow: hidden; }
  .form-section.card { padding: 16px; }

  .section-title {
    display: flex; align-items: center; gap: 8px;
    font-size: .8rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .05em;
    color: var(--text-muted);
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }

  .form-row {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  }
  @media (max-width: 480px) {
    .form-row { grid-template-columns: 1fr; }
  }

  /* QR Card */
  .qr-card { text-align: center; }
  .qr-preview-wrap {
    width: 160px; height: 160px;
    margin: 0 auto 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    display: grid; place-items: center;
    overflow: hidden;
  }
  .qr-img { width: 100%; height: 100%; object-fit: contain; }
  .qr-placeholder { display: grid; place-items: center; width: 100%; height: 100%; }
  .qr-code-text {
    font-family: var(--font-mono);
    font-size: .6rem; color: var(--text-muted);
    word-break: break-all; margin-bottom: 8px;
  }

  /* Image upload */
  .img-upload-zone {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 24px 16px;
    border: 2px dashed var(--border); border-radius: var(--radius-sm);
    cursor: pointer; transition: all .2s;
    color: var(--text-muted); text-align: center;
  }
  .img-upload-zone:hover { border-color: var(--primary); color: var(--primary); }
  .img-upload-zone i { font-size: 1.5rem; }
  .img-upload-zone span { font-size: .82rem; }

  .img-preview-wrap { position: relative; }
  .img-preview {
    width: 100%; border-radius: var(--radius-sm);
    object-fit: contain; max-height: 200px; background: var(--surface2);
  }
  .img-remove {
    position: absolute; top: 6px; right: 6px;
    background: rgba(0,0,0,.5); color: #fff;
    border-radius: 50%; width: 26px; height: 26px;
  }

  /* Submit bar */
  .submit-bar {
    position: fixed; bottom: var(--bottomnav-h);
    left: 0; right: 0;
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 12px 20px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    box-shadow: 0 -2px 10px rgba(0,0,0,.06);
    z-index: 40;
  }
  @media (min-width: 1024px) {
    .submit-bar {
      left: var(--sidebar-w);
      bottom: 0;
    }
  }
</style>
