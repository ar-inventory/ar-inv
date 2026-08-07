<script>
  import { dbReady } from '$lib/stores/db.js';
  import { can } from '$lib/auth/permissions.js';
  import { goto } from '$app/navigation';
  import {
    getAllLocations, createLocation, updateLocation,
    deleteLocation, buildLocationTree, getItemCountByLocation
  } from '$lib/db/locations.js';
  import { confirmDelete, toastSuccess, toastError, alertError } from '$lib/utils/swal.js';

  let locations = [];
  let tree      = [];

  let showForm  = false;
  let editingLoc= null;
  let form      = { name: '', parent_id: null, level: 0 };

  const LEVEL_LABELS = ['Gedung / Site', 'Lantai / Area', 'Ruangan / Titik'];
  const LEVEL_ICONS  = ['fa-solid fa-building','fa-solid fa-layer-group','fa-solid fa-door-open'];

  $: if ($dbReady) {
    if (can('canManageLocations')) loadAll();
    else goto('/');
  }

  function loadAll() {
    locations = getAllLocations();
    tree      = buildLocationTree(locations);
  }

  function openAdd(parentId = null, level = 0) {
    form      = { name: '', parent_id: parentId, level };
    editingLoc= null; showForm = true;
  }
  function openEdit(loc) {
    form      = { name: loc.name, parent_id: loc.parent_id, level: loc.level };
    editingLoc= loc; showForm = true;
  }
  function cancelForm() { showForm = false; editingLoc = null; }

  function save() {
    if (!form.name.trim()) { alertError('Nama lokasi wajib diisi'); return; }
    try {
      if (editingLoc) { updateLocation(editingLoc.id, { name: form.name }); toastSuccess('Lokasi diperbarui'); }
      else            { createLocation({ name: form.name, parent_id: form.parent_id, level: form.level }); toastSuccess('Lokasi ditambahkan'); }
      cancelForm(); loadAll();
    } catch(e) { toastError(e.message); }
  }

  async function remove(loc) {
    const cnt = getItemCountByLocation(loc.id);
    if (cnt > 0) { toastError(`Tidak bisa hapus — ada ${cnt} item di lokasi ini`); return; }
    if (!await confirmDelete(`lokasi "${loc.name}"`)) return;
    try { deleteLocation(loc.id); loadAll(); toastSuccess('Lokasi dihapus'); }
    catch(e) { toastError(e.message); }
  }
</script>

<svelte:head><title>Lokasi — Inventory</title></svelte:head>

<div class="page-container">
  <div class="page-header">
    <div>
      <h1 class="page-title">Lokasi</h1>
      <p class="page-subtitle">Kelola hierarki lokasi item inventory</p>
    </div>
    <button class="btn btn-primary" on:click={() => openAdd(null, 0)}>
      <i class="fa-solid fa-plus"></i> Tambah Lokasi
    </button>
  </div>

  <!-- Legend -->
  <div class="legend card">
    {#each LEVEL_LABELS as lbl, i}
      <div class="legend-item">
        <i class="{LEVEL_ICONS[i]}" style="color:var(--primary)"></i>
        <span>Level {i}: {lbl}</span>
      </div>
    {/each}
  </div>

  <!-- Tree -->
  {#if tree.length === 0}
    <div class="card" style="padding:40px;text-align:center">
      <i class="fa-solid fa-location-dot" style="font-size:2rem;color:var(--text-muted)"></i>
      <p style="margin-top:12px;color:var(--text-muted)">Belum ada lokasi. Mulai dengan menambah gedung atau site.</p>
    </div>
  {:else}
    <!-- Tree rendered flat below -->
  {/if}

  <!-- Tree nodes rendered flat with indentation -->
  {#if tree.length > 0}
    <div class="tree-wrap card">
      {#each locations as loc}
        <div class="tree-node" style="padding-left:{loc.level * 24 + 12}px">
          <div class="node-left">
            {#if loc.level > 0}
              <span class="tree-line" aria-hidden="true">└</span>
            {/if}
            <i class="{LEVEL_ICONS[loc.level] ?? 'fa-solid fa-circle'}" style="color:var(--primary);font-size:.85rem"></i>
            <span class="node-name">{loc.name}</span>
            <span class="node-level">{LEVEL_LABELS[loc.level] ?? ''}</span>
          </div>
          <div class="node-actions">
            {#if loc.level < 2}
              <button class="btn btn-ghost btn-sm" on:click={() => openAdd(loc.id, loc.level + 1)}>
                <i class="fa-solid fa-plus"></i>
                <span class="hide-sm">Sub-lokasi</span>
              </button>
            {/if}
            <button class="btn-icon btn-sm" on:click={() => openEdit(loc)} aria-label="Edit {loc.name}">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-icon btn-sm" on:click={() => remove(loc)} aria-label="Hapus {loc.name}">
              <i class="fa-solid fa-trash" style="color:var(--danger)"></i>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal form -->
{#if showForm}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Form Lokasi" tabindex="-1"
       on:click|self={cancelForm} on:keydown={(e)=>e.key==='Escape'&&cancelForm()}>
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">
          <i class="{LEVEL_ICONS[form.level] ?? 'fa-solid fa-location-dot'}"></i>
          {editingLoc ? 'Edit Lokasi' : `Tambah ${LEVEL_LABELS[form.level] ?? 'Lokasi'}`}
        </span>
        <button class="btn-icon" on:click={cancelForm} aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
        {#if form.parent_id}
          <div class="parent-info">
            <i class="fa-solid fa-arrow-turn-down-right" style="color:var(--primary)"></i>
            Sub-lokasi dari: <strong>{locations.find(l=>l.id===form.parent_id)?.name ?? ''}</strong>
          </div>
        {/if}
        <div class="form-group" style="margin:0">
          <label class="form-label" for="loc-name">Nama Lokasi *</label>
          <input id="loc-name" class="form-input" type="text" bind:value={form.name}
            placeholder="Contoh: {form.level===0?'Gedung A':form.level===1?'Lantai 2':'Ruang Server'}"
            on:keydown={(e)=>e.key==='Enter'&&save()} />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" on:click={cancelForm}>Batal</button>
        <button class="btn btn-primary" on:click={save}>
          <i class="fa-solid fa-floppy-disk"></i> Simpan
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
  .legend{display:flex;flex-wrap:wrap;gap:16px;padding:12px 16px;margin-bottom:16px}
  .legend-item{display:flex;align-items:center;gap:7px;font-size:.8rem;color:var(--text-muted)}
  .tree-wrap{overflow:hidden;margin-bottom:16px}
  .tree-node{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);transition:background .15s}
  .tree-node:last-child{border-bottom:none}
  .tree-node:hover{background:var(--surface2)}
  .node-left{display:flex;align-items:center;gap:8px;min-width:0}
  .tree-line{color:var(--text-muted);font-size:.85rem;margin-right:2px}
  .node-name{font-size:.875rem;font-weight:600;color:var(--text)}
  .node-level{font-size:.7rem;color:var(--text-muted);background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1px 7px;flex-shrink:0}
  .node-actions{display:flex;align-items:center;gap:4px;flex-shrink:0}
  .parent-info{background:var(--primary-l);border:1px solid var(--primary-l);border-radius:var(--radius-sm);padding:8px 12px;font-size:.82rem;color:var(--primary);display:flex;align-items:center;gap:8px}
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;z-index:100}
  @media(min-width:640px){.modal-backdrop{align-items:center}}
  .modal-box{background:var(--surface);width:100%;max-width:420px;border-radius:var(--radius) var(--radius) 0 0}
  @media(min-width:640px){.modal-box{border-radius:var(--radius)}}
  .modal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border)}
  .modal-title{font-size:.95rem;font-weight:700;display:flex;align-items:center;gap:8px}
  .modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}
  @media(max-width:400px){.hide-sm{display:none}}
</style>
