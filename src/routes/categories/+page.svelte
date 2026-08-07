<script>
  import { dbReady } from '$lib/stores/db.js';
  import { can } from '$lib/auth/permissions.js';
  import { goto } from '$app/navigation';
  import {
    getAllCategories, createCategory, updateCategory, deleteCategory,
    getFieldsByCategory, createField, updateField, deleteField, reorderFields, parseFieldOptions,
    getChecklistByCategory, createChecklistItem, updateChecklistItem, deleteChecklistItem,
    getItemCountByCategory
  } from '$lib/db/categories.js';
  import { confirmDelete, toastSuccess, toastError, alertError } from '$lib/utils/swal.js';

  // ── State ──────────────────────────────────────────
  let categories   = [];
  let selected     = null;   // category sedang dibuka
  let activeTab    = 'fields'; // fields | checklist
  let fields       = [];
  let checklist    = [];

  // Form category
  let catForm      = { name: '', icon: 'fa-solid fa-box', color: '#6b7280' };
  let editingCat   = null;
  let showCatForm  = false;

  // Form field
  let fieldForm    = { field_key:'', field_label:'', field_type:'text', field_unit:'', is_required:false, show_on_card:false, field_options:'' };
  let editingField = null;
  let showFieldForm= false;

  // Form checklist
  let checkText    = '';
  let editingCheck = null;

  const FA_ICONS = [
    'fa-solid fa-box','fa-solid fa-snowflake','fa-solid fa-laptop','fa-solid fa-plug',
    'fa-solid fa-chair','fa-solid fa-car','fa-solid fa-utensils','fa-solid fa-ruler',
    'fa-solid fa-shield-halved','fa-solid fa-mobile-screen','fa-solid fa-tv',
    'fa-solid fa-print','fa-solid fa-server','fa-solid fa-wifi','fa-solid fa-wrench',
    'fa-solid fa-hammer','fa-solid fa-toolbox','fa-solid fa-fire-extinguisher',
    'fa-solid fa-door-open','fa-solid fa-lightbulb','fa-solid fa-fan',
    'fa-solid fa-building','fa-solid fa-truck','fa-solid fa-pump-medical'
  ];

  const FIELD_TYPES = [
    { value:'text',     label:'Teks',     icon:'fa-solid fa-font' },
    { value:'number',   label:'Angka',    icon:'fa-solid fa-hashtag' },
    { value:'select',   label:'Pilihan',  icon:'fa-solid fa-chevron-down' },
    { value:'date',     label:'Tanggal',  icon:'fa-solid fa-calendar-days' },
    { value:'textarea', label:'Paragraf', icon:'fa-solid fa-align-left' },
    { value:'boolean',  label:'Ya/Tidak', icon:'fa-solid fa-toggle-on' },
  ];

  $: if ($dbReady) {
    if (can('canManageCategories')) loadCategories();
    else goto('/');
  }

  function loadCategories() {
    categories = getAllCategories();
    if (selected) {
      selected = categories.find(c => c.id === selected.id) ?? null;
      if (selected) loadCategoryData();
    }
  }

  function loadCategoryData() {
    if (!selected) return;
    fields    = getFieldsByCategory(selected.id);
    checklist = getChecklistByCategory(selected.id);
  }

  function selectCategory(cat) {
    selected  = cat;
    activeTab = 'fields';
    loadCategoryData();
  }

  // ── Category CRUD ─────────────────────────────────
  function openAddCat()  { catForm = { name:'', icon:'fa-solid fa-box', color:'#6b7280' }; editingCat = null; showCatForm = true; }
  function openEditCat(cat) { catForm = { name:cat.name, icon:cat.icon, color:cat.color }; editingCat = cat; showCatForm = true; }
  function cancelCatForm()  { showCatForm = false; editingCat = null; }

  function saveCat() {
    if (!catForm.name.trim()) { alertError('Nama kategori wajib diisi'); return; }
    try {
      if (editingCat) { updateCategory(editingCat.id, catForm); toastSuccess('Kategori diperbarui'); }
      else            { createCategory(catForm); toastSuccess('Kategori ditambahkan'); }
      showCatForm = false; editingCat = null; loadCategories();
    } catch(e) { toastError(e.message); }
  }

  async function deleteCat(cat) {
    const cnt = getItemCountByCategory(cat.id);
    if (cnt > 0) { toastError(`Tidak bisa hapus — ada ${cnt} item di kategori ini`); return; }
    if (!await confirmDelete(`kategori "${cat.name}"`)) return;
    try { deleteCategory(cat.id); if (selected?.id === cat.id) selected = null; loadCategories(); toastSuccess('Kategori dihapus'); }
    catch(e) { toastError(e.message); }
  }

  // ── Field CRUD ─────────────────────────────────────
  function genKey(label) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  }

  function openAddField()  {
    fieldForm = { field_key:'', field_label:'', field_type:'text', field_unit:'', is_required:false, show_on_card:false, field_options:'' };
    editingField = null; showFieldForm = true;
  }
  function openEditField(f) {
    fieldForm = {
      field_key: f.field_key, field_label: f.field_label, field_type: f.field_type,
      field_unit: f.field_unit ?? '', is_required: !!f.is_required, show_on_card: !!f.show_on_card,
      field_options: parseFieldOptions(f).join('\n')
    };
    editingField = f; showFieldForm = true;
  }
  function cancelFieldForm() { showFieldForm = false; editingField = null; }

  function saveField() {
    if (!fieldForm.field_label.trim()) { alertError('Label field wajib diisi'); return; }
    const key = fieldForm.field_key.trim() || genKey(fieldForm.field_label);
    const opts = fieldForm.field_type === 'select'
      ? fieldForm.field_options.split('\n').map(s=>s.trim()).filter(Boolean)
      : null;
    try {
      if (editingField) {
        updateField(editingField.id, { ...fieldForm, field_options: opts });
        toastSuccess('Field diperbarui');
      } else {
        createField(selected.id, { ...fieldForm, field_key: key, field_options: opts });
        toastSuccess('Field ditambahkan');
      }
      showFieldForm = false; editingField = null; loadCategoryData();
    } catch(e) { toastError(e.message); }
  }

  async function deleteFieldItem(f) {
    if (!await confirmDelete(`field "${f.field_label}"`)) return;
    try { deleteField(f.id); loadCategoryData(); toastSuccess('Field dihapus'); }
    catch(e) { toastError(e.message); }
  }

  // ── Checklist CRUD ─────────────────────────────────
  function saveCheckItem() {
    if (!checkText.trim()) return;
    try {
      if (editingCheck) { updateChecklistItem(editingCheck.id, { item_text: checkText }); toastSuccess('Item diperbarui'); }
      else              { createChecklistItem(selected.id, { item_text: checkText, sort_order: checklist.length }); toastSuccess('Item ditambahkan'); }
      checkText = ''; editingCheck = null; loadCategoryData();
    } catch(e) { toastError(e.message); }
  }

  function editCheck(c) { editingCheck = c; checkText = c.item_text; }
  function cancelCheck() { editingCheck = null; checkText = ''; }

  async function deleteCheck(c) {
    if (!await confirmDelete(`"${c.item_text}"`)) return;
    try { deleteChecklistItem(c.id); loadCategoryData(); toastSuccess('Item dihapus'); }
    catch(e) { toastError(e.message); }
  }
</script>

<svelte:head><title>Kategori — Inventory</title></svelte:head>

<div class="page-container">
  <div class="page-header">
    <div>
      <h1 class="page-title">Kategori</h1>
      <p class="page-subtitle">Kelola kategori, custom fields, dan checklist maintenance</p>
    </div>
    <button class="btn btn-primary" on:click={openAddCat}>
      <i class="fa-solid fa-plus"></i> Tambah Kategori
    </button>
  </div>

  <div class="cat-layout">
    <!-- LEFT: Category list -->
    <div class="cat-list-panel">
      {#if categories.length === 0}
        <div class="empty-panel">
          <i class="fa-solid fa-tags" style="font-size:2rem;color:var(--text-muted)"></i>
          <p>Belum ada kategori</p>
        </div>
      {:else}
        {#each categories as cat}
          <div
            class="cat-item {selected?.id === cat.id ? 'active' : ''}"
            on:click={() => selectCategory(cat)}
            on:keydown={(e) => e.key === 'Enter' && selectCategory(cat)}
            role="button" tabindex="0"
          >
            <span class="cat-icon" style="background:{cat.color}20;color:{cat.color}">
              <i class="{cat.icon}"></i>
            </span>
            <span class="cat-name">{cat.name}</span>
            <div class="cat-actions">
              <button class="btn-icon btn-sm" on:click|stopPropagation={() => openEditCat(cat)} title="Edit" aria-label="Edit {cat.name}">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon btn-sm" on:click|stopPropagation={() => deleteCat(cat)} title="Hapus" aria-label="Hapus {cat.name}">
                <i class="fa-solid fa-trash" style="color:var(--danger)"></i>
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- RIGHT: Detail panel -->
    <div class="cat-detail-panel">
      {#if !selected}
        <div class="empty-panel card">
          <i class="fa-solid fa-hand-pointer" style="font-size:2rem;color:var(--text-muted)"></i>
          <p>Pilih kategori untuk mengelola fields dan checklist</p>
        </div>
      {:else}
        <!-- Category header -->
        <div class="detail-header card">
          <span class="cat-icon-lg" style="background:{selected.color}20;color:{selected.color}">
            <i class="{selected.icon}"></i>
          </span>
          <div class="detail-title">
            <h2>{selected.name}</h2>
            <p class="page-subtitle">{fields.length} field · {checklist.length} checklist item</p>
          </div>
          <button class="btn btn-secondary btn-sm" on:click={() => openEditCat(selected)}>
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn {activeTab==='fields'?'active':''}" on:click={()=>activeTab='fields'}>
            <i class="fa-solid fa-sliders"></i> Custom Fields
            {#if fields.length > 0}<span class="tab-count">{fields.length}</span>{/if}
          </button>
          <button class="tab-btn {activeTab==='checklist'?'active':''}" on:click={()=>activeTab='checklist'}>
            <i class="fa-solid fa-list-check"></i> Checklist Maintenance
            {#if checklist.length > 0}<span class="tab-count">{checklist.length}</span>{/if}
          </button>
        </div>

        <!-- FIELDS TAB -->
        {#if activeTab === 'fields'}
          <div class="fields-section">
            {#if fields.length === 0}
              <div class="empty-panel card">
                <i class="fa-solid fa-sliders" style="font-size:1.5rem;color:var(--text-muted)"></i>
                <p>Belum ada custom field</p>
              </div>
            {:else}
              <div class="fields-list card">
                {#each fields as f}
                  <div class="field-row">
                    <div class="field-type-icon">
                      <i class="{FIELD_TYPES.find(t=>t.value===f.field_type)?.icon ?? 'fa-solid fa-circle'}" title="{f.field_type}"></i>
                    </div>
                    <div class="field-info">
                      <span class="field-label">{f.field_label}</span>
                      <span class="field-key">{f.field_key}</span>
                    </div>
                    <div class="field-badges">
                      {#if f.field_unit}<span class="mini-badge">{f.field_unit}</span>{/if}
                      {#if f.is_required}<span class="mini-badge danger">Wajib</span>{/if}
                      {#if f.show_on_card}<span class="mini-badge primary">Di Card</span>{/if}
                    </div>
                    <div class="field-actions">
                      <button class="btn-icon btn-sm" on:click={() => openEditField(f)} aria-label="Edit field">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button class="btn-icon btn-sm" on:click={() => deleteFieldItem(f)} aria-label="Hapus field">
                        <i class="fa-solid fa-trash" style="color:var(--danger)"></i>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
            <button class="btn btn-primary btn-sm" style="margin-top:10px" on:click={openAddField}>
              <i class="fa-solid fa-plus"></i> Tambah Field
            </button>
          </div>
        {/if}

        <!-- CHECKLIST TAB -->
        {#if activeTab === 'checklist'}
          <div class="fields-section">
            {#if checklist.length > 0}
              <div class="fields-list card" style="margin-bottom:10px">
                {#each checklist as c}
                  <div class="field-row">
                    <i class="fa-solid fa-grip-vertical" style="color:var(--border);font-size:.8rem"></i>
                    <span class="field-label" style="flex:1">{c.item_text}</span>
                    <div class="field-actions">
                      <button class="btn-icon btn-sm" on:click={() => editCheck(c)} aria-label="Edit checklist item">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button class="btn-icon btn-sm" on:click={() => deleteCheck(c)} aria-label="Hapus checklist item">
                        <i class="fa-solid fa-trash" style="color:var(--danger)"></i>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
            <!-- Add/Edit checklist item -->
            <div class="check-form card">
              <div class="section-title" style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">
                <i class="fa-solid fa-plus"></i>
                {editingCheck ? 'Edit Item' : 'Tambah Item Checklist'}
              </div>
              <div class="check-input-row">
                <input class="form-input" type="text" bind:value={checkText}
                  placeholder="Contoh: Bersihkan filter" on:keydown={(e)=>e.key==='Enter'&&saveCheckItem()} />
                <button class="btn btn-primary btn-sm" on:click={saveCheckItem} disabled={!checkText.trim()}>
                  <i class="fa-solid fa-floppy-disk"></i> {editingCheck ? 'Update' : 'Tambah'}
                </button>
                {#if editingCheck}
                  <button class="btn btn-ghost btn-sm" on:click={cancelCheck} aria-label="Batal edit">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<!-- Category form modal -->
{#if showCatForm}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Form Kategori"
       on:click|self={cancelCatForm} on:keydown={(e)=>e.key==='Escape'&&cancelCatForm()} tabindex="-1">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title"><i class="fa-solid fa-tags"></i> {editingCat ? 'Edit Kategori' : 'Tambah Kategori'}</span>
        <button class="btn-icon" on:click={cancelCatForm} aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="padding:16px">
        <div class="form-group">
          <label class="form-label" for="cat-name">Nama Kategori *</label>
          <input id="cat-name" class="form-input" type="text" bind:value={catForm.name} placeholder="Contoh: AC & Pendingin" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cat-color">Warna</label>
          <div class="color-row">
            <input id="cat-color" type="color" bind:value={catForm.color} class="color-input" />
            <span class="color-preview" style="background:{catForm.color}20;color:{catForm.color};border-color:{catForm.color}40">
              <i class="{catForm.icon}"></i> {catForm.name || 'Preview'}
            </span>
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="icon-grid-first">Icon (Font Awesome 6 Free)</label>
          <div class="icon-grid" id="icon-grid-first">
            {#each FA_ICONS as ico}
              <button type="button"
                class="icon-opt {catForm.icon === ico ? 'icon-selected' : ''}"
                on:click={() => catForm.icon = ico}
                title={ico} aria-label={ico}
              >
                <i class="{ico}"></i>
              </button>
            {/each}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" on:click={cancelCatForm}>Batal</button>
        <button class="btn btn-primary" on:click={saveCat}>
          <i class="fa-solid fa-floppy-disk"></i> Simpan
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Field form modal -->
{#if showFieldForm}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Form Field"
       on:click|self={cancelFieldForm} on:keydown={(e)=>e.key==='Escape'&&cancelFieldForm()} tabindex="-1">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title"><i class="fa-solid fa-sliders"></i> {editingField ? 'Edit Field' : 'Tambah Field'}</span>
        <button class="btn-icon" on:click={cancelFieldForm} aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="padding:16px;display:flex;flex-direction:column;gap:0">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="fl-label">Label *</label>
            <input id="fl-label" class="form-input" type="text" bind:value={fieldForm.field_label}
              placeholder="Contoh: Tegangan" on:input={() => { if(!editingField) fieldForm.field_key = genKey(fieldForm.field_label); }} />
          </div>
          <div class="form-group">
            <label class="form-label" for="fl-type">Tipe</label>
            <select id="fl-type" class="form-input form-select" bind:value={fieldForm.field_type}>
              {#each FIELD_TYPES as t}
                <option value={t.value}><i class="{t.icon}"></i> {t.label}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="fl-key">Key (otomatis)</label>
            <input id="fl-key" class="form-input" type="text" bind:value={fieldForm.field_key}
              placeholder="contoh_key" style="font-family:var(--font-mono);font-size:.8rem" />
          </div>
          <div class="form-group">
            <label class="form-label" for="fl-unit">Satuan</label>
            <input id="fl-unit" class="form-input" type="text" bind:value={fieldForm.field_unit} placeholder="V, °C, kg..." />
          </div>
        </div>
        {#if fieldForm.field_type === 'select'}
          <div class="form-group">
            <label class="form-label" for="fl-opts">Pilihan (1 per baris)</label>
            <textarea id="fl-opts" class="form-input" rows="4" bind:value={fieldForm.field_options}
              placeholder="R22&#10;R32&#10;R410A"></textarea>
          </div>
        {/if}
        <div class="toggle-row">
          <label class="toggle-item">
            <input type="checkbox" bind:checked={fieldForm.is_required} />
            <span>Wajib diisi</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" bind:checked={fieldForm.show_on_card} />
            <span>Tampil di card</span>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" on:click={cancelFieldForm}>Batal</button>
        <button class="btn btn-primary" on:click={saveField}>
          <i class="fa-solid fa-floppy-disk"></i> Simpan
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
  .cat-layout{display:grid;grid-template-columns:240px 1fr;gap:16px;align-items:start;min-width:0}
  @media(max-width:640px){
    .cat-layout{grid-template-columns:1fr;gap:12px}
    .cat-detail-panel{min-width:0;overflow:hidden;width:100%}
  }

  .cat-list-panel{display:flex;flex-direction:column;gap:4px}
  .cat-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);cursor:pointer;transition:all .15s;text-align:left;width:100%}
  .cat-item:hover{border-color:var(--primary);background:var(--primary-l)}
  .cat-item.active{border-color:var(--primary);background:var(--primary-l);font-weight:600}
  .cat-icon{width:30px;height:30px;border-radius:7px;display:grid;place-items:center;font-size:.85rem;flex-shrink:0}
  .cat-name{flex:1;font-size:.85rem;color:var(--text)}
  .cat-actions{display:flex;gap:2px;opacity:0;transition:opacity .15s}
  .cat-item:hover .cat-actions,.cat-item.active .cat-actions{opacity:1}

  .empty-panel{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 20px;text-align:center;color:var(--text-muted);font-size:.85rem}

  .detail-header{display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:12px;min-width:0;overflow:hidden}
  .cat-icon-lg{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;font-size:1.1rem;flex-shrink:0}
  .detail-title h2{font-size:1rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .detail-title{flex:1;min-width:0}

  .fields-section{display:flex;flex-direction:column;gap:0;min-width:0;overflow:hidden}
  .fields-list{overflow:hidden;margin-bottom:0}
  .field-row{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);min-width:0}
  .field-row:last-child{border-bottom:none}
  .field-type-icon{width:28px;height:28px;border-radius:6px;background:var(--surface2);display:grid;place-items:center;font-size:.75rem;color:var(--text-muted);flex-shrink:0}
  .field-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;overflow:hidden}
  .field-label{font-size:.85rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .field-key{font-size:.68rem;font-family:var(--font-mono);color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .field-badges{display:flex;gap:4px;flex-wrap:wrap;flex-shrink:0;max-width:100px}
  @media(max-width:480px){.field-badges{display:none}}
  .mini-badge{font-size:.62rem;font-weight:600;padding:1px 6px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted)}
  .mini-badge.danger{background:var(--danger-l);border-color:var(--danger-l);color:var(--danger)}
  .mini-badge.primary{background:var(--primary-l);border-color:var(--primary-l);color:var(--primary)}
  .field-actions{display:flex;gap:2px;flex-shrink:0}
  .tab-count{background:var(--primary-l);color:var(--primary);font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:10px;margin-left:4px}

  .check-form{padding:12px}
  .check-input-row{display:flex;gap:8px;flex-wrap:wrap}
  .check-input-row .form-input{flex:1;min-width:0}

  /* Modal */
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;z-index:100}
  @media(min-width:640px){.modal-backdrop{align-items:center}}
  .modal-box{background:var(--surface);width:100%;max-width:520px;border-radius:var(--radius) var(--radius) 0 0;max-height:90vh;display:flex;flex-direction:column;overflow:hidden}
  @media(min-width:640px){.modal-box{border-radius:var(--radius);max-height:85vh}}
  .modal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
  .modal-title{font-size:.95rem;font-weight:700;display:flex;align-items:center;gap:8px}
  .modal-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
  .modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--border);flex-shrink:0}

  /* Category form */
  .color-row{display:flex;align-items:center;gap:10px}
  .color-input{width:44px;height:36px;border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer;padding:2px}
  .color-preview{padding:6px 14px;border-radius:20px;border:1px solid;font-size:.82rem;font-weight:600;display:flex;align-items:center;gap:7px}
  .icon-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}
  @media(max-width:480px){.icon-grid{grid-template-columns:repeat(6,1fr)}}
  .icon-opt{padding:8px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface2);cursor:pointer;display:grid;place-items:center;font-size:.85rem;color:var(--text-muted);transition:all .15s}
  .icon-opt:hover{border-color:var(--primary);color:var(--primary)}
  .icon-opt.icon-selected{background:var(--primary-l);border-color:var(--primary);color:var(--primary)}

  /* Field form */
  .form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:480px){.form-row-2{grid-template-columns:1fr}}
  .toggle-row{display:flex;gap:20px;padding:4px 0}
  .toggle-item{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:.85rem}
  .toggle-item input{width:15px;height:15px;accent-color:var(--primary)}
</style>
