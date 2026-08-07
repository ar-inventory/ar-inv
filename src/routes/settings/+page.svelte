<script>
  import { dbReady } from '$lib/stores/db.js';
  import { can } from '$lib/auth/permissions.js';
  import { goto } from '$app/navigation';
  import { currentUser, applyTheme, theme } from '$lib/stores/ui.js';
  import { getAllSettings, setSetting, getCompanyName } from '$lib/db/settings.js';
  import { getAllUsers, createUserWithPassword, updateUser, deleteUser, getAvatarColor, getInitials } from '$lib/db/users.js';
  import { resetDatabase } from '$lib/db/database.js';
  import { seedDefaultData } from '$lib/db/seed.js';
  import { seedDummyUsers, seedDummyItems } from '$lib/db/seedDummy.js';
  import { downloadJSON, downloadCSV } from '$lib/utils/export.js';
  import { importFromJSON, readFileAsText } from '$lib/utils/import.js';
  import { compressImage, ROLE_LABELS } from '$lib/utils/format.js';
  import { confirmReset, confirmDelete, toastSuccess, toastError, alertError, alertSuccess } from '$lib/utils/swal.js';

  let activeTab   = 'general';
  let companyName = '';
  let companyLogo = '';
  let users       = [];

  // User form
  let showUserForm = false;
  let editingUser  = null;
  let userForm     = { name: '', role: 'staff', avatar_color: '#6366f1' };

  const ROLES = ['admin','technician','staff','viewer'];
  const AVATAR_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#06b6d4','#ec4899'];

  $: if ($dbReady) {
    if (can('canSettings')) loadSettings();
    else goto('/');
  }

  function loadSettings() {
    companyName = getCompanyName();
    const s     = getAllSettings();
    companyLogo = s.company_logo ?? '';
    users       = getAllUsers();
  }

  // ── General ──────────────────────────────────────
  function saveGeneral() {
    setSetting('company_name', companyName.trim() || 'Perusahaan Saya');
    setSetting('company_logo', companyLogo);
    toastSuccess('Pengaturan disimpan');
  }

  async function onLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toastError('Logo maks 2MB'); return; }
    try {
      companyLogo = await compressImage(file, 200, 0.85);
    } catch { toastError('Gagal memproses logo'); }
  }
  function removeLogo() { companyLogo = ''; }

  function toggleTheme() {
    const next = $theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    setSetting('theme', next);
    toastSuccess(`Tema ${next === 'dark' ? 'gelap' : 'terang'} diaktifkan`);
  }

  // ── Users ─────────────────────────────────────────
  function openAddUser()  {
    userForm = { name:'', role:'staff', avatar_color:'#6366f1', password:'', confirmPassword:'' };
    editingUser = null; showUserForm = true;
  }
  function openEditUser(u) {
    userForm = { name:u.name, role:u.role, avatar_color:u.avatar_color, password:'', confirmPassword:'' };
    editingUser = u; showUserForm = true;
  }
  function cancelUserForm() { showUserForm = false; editingUser = null; }

  async function saveUser() {
    if (!userForm.name.trim()) { alertError('Nama wajib diisi'); return; }
    const pwd = userForm.password;
    if (!editingUser && !pwd)                        { alertError('Password wajib diisi'); return; }
    if (pwd && pwd.length < 6)                        { alertError('Password minimal 6 karakter'); return; }
    if (pwd && pwd !== userForm.confirmPassword)      { alertError('Konfirmasi password tidak cocok'); return; }
    try {
      if (editingUser) {
        updateUser(editingUser.id, { name: userForm.name, role: userForm.role, avatar_color: userForm.avatar_color });
        if (pwd) {
          const { setUserPassword } = await import('$lib/db/users.js');
          await setUserPassword(editingUser.id, pwd);
        }
        if ($currentUser?.id === editingUser.id) {
          currentUser.set({ ...$currentUser, name: userForm.name, role: userForm.role, avatar_color: userForm.avatar_color });
        }
        toastSuccess('Pengguna diperbarui');
      } else {
        await createUserWithPassword({ name: userForm.name, role: userForm.role, avatar_color: userForm.avatar_color, password: pwd });
        toastSuccess('Pengguna ditambahkan');
      }
      cancelUserForm(); loadSettings();
    } catch(e) { toastError(e.message); }
  }

  async function removeUser(u) {
    if ($currentUser?.id === u.id)  { toastError('Tidak bisa hapus akun yang sedang aktif'); return; }
    if (u.role === 'admin' && users.filter(x => x.role === 'admin').length <= 1) {
      toastError('Harus ada minimal 1 admin'); return;
    }
    if (!await confirmDelete(`pengguna "${u.name}"`)) return;
    try { deleteUser(u.id); loadSettings(); toastSuccess('Pengguna dihapus'); }
    catch(e) { toastError(e.message); }
  }

  // ── Export / Import ───────────────────────────────
  function doExportJSON() { try { downloadJSON('inventory-backup'); toastSuccess('Backup JSON didownload'); } catch(e) { toastError(e.message); } }
  function doExportCSV()  { try { downloadCSV('inventory-items');   toastSuccess('CSV items didownload');  } catch(e) { toastError(e.message); } }

  async function onImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text  = await readFileAsText(file);
      const count = await importFromJSON(text);
      loadSettings();
      await alertSuccess('Import Berhasil', `${count} baris data berhasil diimpor. Muat ulang halaman untuk melihat perubahan.`);
      location.reload();
    } catch(err) { toastError('Import gagal: ' + err.message); }
  }

  async function doLoadDummy() {
    try {
      const u = await seedDummyUsers();
      const i = seedDummyItems();
      loadSettings();
      await alertSuccess('Data Demo Dimuat',
        `${u} pengguna dan ${i} item inventory berhasil ditambahkan.\n\nPassword default:\n• Teknisi: teknisi123\n• Staff: staff123\n• Viewer: viewer123`
      );
    } catch(e) { toastError('Gagal: ' + e.message); }
  }

  async function doReset() {
    const ok = await confirmReset();
    if (!ok) return;
    try {
      await resetDatabase();
      await seedDefaultData();
      toastSuccess('Data direset. Memuat ulang...');
      setTimeout(() => location.reload(), 1500);
    } catch(e) { toastError(e.message); }
  }
</script>

<svelte:head><title>Pengaturan — Inventory</title></svelte:head>

<div class="page-container">
  <div class="page-header">
    <h1 class="page-title">Pengaturan</h1>
  </div>

  <div class="settings-layout">
    <!-- Sidebar tabs -->
    <nav class="settings-nav card">
      {#each [
        {id:'general', icon:'fa-solid fa-building',      label:'Umum'},
        {id:'users',   icon:'fa-solid fa-users',          label:'Pengguna'},
        {id:'data',    icon:'fa-solid fa-database',       label:'Data & Backup'},
      ] as tab}
        <button class="settings-tab {activeTab===tab.id?'active':''}" on:click={()=>activeTab=tab.id}>
          <i class="{tab.icon}"></i> {tab.label}
        </button>
      {/each}
    </nav>

    <div class="settings-content">

      <!-- GENERAL -->
      {#if activeTab === 'general'}
        <div class="settings-card card">
          <div class="settings-section-title"><i class="fa-solid fa-building"></i> Informasi Perusahaan</div>
          <div class="form-group">
            <label class="form-label" for="company-name">Nama Perusahaan</label>
            <input id="company-name" class="form-input" type="text" bind:value={companyName} placeholder="Nama perusahaan Anda" />
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label" for="logo-upload">Logo Perusahaan</label>
            {#if companyLogo}
              <div class="logo-preview">
                <img src={companyLogo} alt="Logo" class="logo-img" />
                <button class="btn btn-ghost btn-sm" on:click={removeLogo}>
                  <i class="fa-solid fa-trash"></i> Hapus Logo
                </button>
              </div>
            {:else}
              <label class="img-upload-zone" for="logo-upload">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <span>Upload logo (maks 2MB)</span>
              </label>
              <input id="logo-upload" type="file" accept="image/*" hidden on:change={onLogoChange} />
            {/if}
          </div>
          <div style="margin-top:16px">
            <button class="btn btn-primary" on:click={saveGeneral}>
              <i class="fa-solid fa-floppy-disk"></i> Simpan
            </button>
          </div>
        </div>

        <div class="settings-card card" style="margin-top:14px">
          <div class="settings-section-title"><i class="fa-solid fa-palette"></i> Tampilan</div>
          <div class="theme-row">
            <div>
              <p class="theme-label">Tema Saat Ini: <strong>{$theme === 'dark' ? 'Gelap' : 'Terang'}</strong></p>
              <p class="form-hint">Preferensi tema disimpan di perangkat ini</p>
            </div>
            <button class="btn btn-secondary" on:click={toggleTheme}>
              {#if $theme === 'dark'}
                <i class="fa-solid fa-sun"></i> Tema Terang
              {:else}
                <i class="fa-solid fa-moon"></i> Tema Gelap
              {/if}
            </button>
          </div>
        </div>
      {/if}

      <!-- USERS -->
      {#if activeTab === 'users'}
        <div class="settings-card card">
          <div class="settings-section-title" style="justify-content:space-between">
            <span><i class="fa-solid fa-users"></i> Pengguna Lokal</span>
            <button class="btn btn-primary btn-sm" on:click={openAddUser}>
              <i class="fa-solid fa-plus"></i> Tambah
            </button>
          </div>
          <p class="form-hint" style="margin-bottom:14px">
            <i class="fa-solid fa-circle-info" style="font-size:.65rem"></i>
            Pengguna lokal tidak memerlukan password. Klik "Aktifkan" untuk berpindah pengguna aktif.
          </p>
          <div class="users-list">
            {#each users as u}
              <div class="user-row {$currentUser?.id === u.id ? 'user-active' : ''}">
                <div class="user-avatar" style="background:{u.avatar_color}">{getInitials(u.name)}</div>
                <div class="user-info">
                  <span class="user-name">{u.name}</span>
                  <span class="user-role">{ROLE_LABELS[u.role] ?? u.role}</span>
                </div>
                {#if $currentUser?.id === u.id}
                  <span class="active-badge"><i class="fa-solid fa-check"></i> Login</span>
                {/if}
                <button class="btn-icon btn-sm" on:click={() => openEditUser(u)} aria-label="Edit {u.name}">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon btn-sm" on:click={() => removeUser(u)} aria-label="Hapus {u.name}">
                  <i class="fa-solid fa-trash" style="color:var(--danger)"></i>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- DATA -->
      {#if activeTab === 'data'}
        <div class="settings-card card">
          <div class="settings-section-title"><i class="fa-solid fa-file-export"></i> Export Data</div>
          <div class="data-actions">
            <button class="data-btn" on:click={doExportJSON}>
              <i class="fa-solid fa-file-code" style="color:var(--primary)"></i>
              <div><p class="data-btn-title">Export JSON (Backup Lengkap)</p><p class="data-btn-sub">Semua data termasuk definisi field dan riwayat</p></div>
              <i class="fa-solid fa-download" style="color:var(--text-muted)"></i>
            </button>
            <button class="data-btn" on:click={doExportCSV}>
              <i class="fa-solid fa-file-csv" style="color:var(--accent)"></i>
              <div><p class="data-btn-title">Export CSV Items</p><p class="data-btn-sub">Daftar item untuk dibuka di Excel / Sheets</p></div>
              <i class="fa-solid fa-download" style="color:var(--text-muted)"></i>
            </button>
          </div>
        </div>

        <div class="settings-card card" style="margin-top:14px">
          <div class="settings-section-title"><i class="fa-solid fa-file-import"></i> Import Data</div>
          <p class="form-hint" style="margin-bottom:12px">
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--warning)"></i>
            Import akan <strong>menimpa semua data yang ada</strong>. Lakukan export backup dulu sebelum import.
          </p>
          <label class="data-btn import-btn" for="import-file">
            <i class="fa-solid fa-folder-open" style="color:var(--warning)"></i>
            <div><p class="data-btn-title">Pilih File JSON</p><p class="data-btn-sub">Hanya file backup JSON yang diekspor dari aplikasi ini</p></div>
            <i class="fa-solid fa-upload" style="color:var(--text-muted)"></i>
          </label>
          <input id="import-file" type="file" accept=".json" hidden on:change={onImportFile} />
        </div>

        <div class="settings-card card danger-zone" style="margin-top:14px">
          <div class="settings-section-title"><i class="fa-solid fa-flask"></i> Data Demo</div>
          <div class="danger-row">
            <div>
              <p class="danger-title" style="color:var(--info)">Muat Data Demo</p>
              <p class="form-hint">Tambah 5 pengguna dan 26 item inventory contoh untuk mencoba semua fitur.</p>
            </div>
            <button class="btn btn-secondary" on:click={doLoadDummy}>
              <i class="fa-solid fa-flask"></i> Muat Demo
            </button>
          </div>
        </div>

        <div class="settings-card card danger-zone" style="margin-top:14px">
          <div class="settings-section-title" style="color:var(--danger)"><i class="fa-solid fa-triangle-exclamation"></i> Zona Berbahaya</div>
          <div class="danger-row">
            <div>
              <p class="danger-title">Reset Semua Data</p>
              <p class="form-hint">Hapus semua item, maintenance record, dan aktivitas. Data default akan dimuat ulang.</p>
            </div>
            <button class="btn btn-danger" on:click={doReset}>
              <i class="fa-solid fa-trash"></i> Reset Data
            </button>
          </div>
        </div>
      {/if}

    </div>
  </div>
</div>

<!-- User form modal -->
{#if showUserForm}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Form Pengguna" tabindex="-1"
       on:click|self={cancelUserForm} on:keydown={(e)=>e.key==='Escape'&&cancelUserForm()}>
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title"><i class="fa-solid fa-user"></i> {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}</span>
        <button class="btn-icon" on:click={cancelUserForm} aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
        <div class="form-group" style="margin:0">
          <label class="form-label" for="u-name">Nama *</label>
          <input id="u-name" class="form-input" type="text" bind:value={userForm.name} placeholder="Nama pengguna" />
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="u-role">Role</label>
          <select id="u-role" class="form-input form-select" bind:value={userForm.role}>
            {#each ROLES as r}<option value={r}>{ROLE_LABELS[r] ?? r}</option>{/each}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="u-pass">
            {editingUser ? 'Password Baru' : 'Password *'}
            {#if editingUser}<span class="form-hint" style="display:inline"> (kosongkan jika tidak ingin mengubah)</span>{/if}
          </label>
          <input id="u-pass" class="form-input" type="password"
            bind:value={userForm.password}
            placeholder="{editingUser ? 'Kosongkan jika tidak berubah' : 'Min. 6 karakter'}" />
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="u-confirm">Konfirmasi Password {editingUser && !userForm.password ? '' : '*'}</label>
          <input id="u-confirm" class="form-input" type="password"
            bind:value={userForm.confirmPassword}
            placeholder="Ulangi password" />
          {#if userForm.password && userForm.confirmPassword && userForm.password !== userForm.confirmPassword}
            <p class="form-error"><i class="fa-solid fa-triangle-exclamation" style="font-size:.65rem"></i> Password tidak cocok</p>
          {/if}
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="avatar-color-group">Warna Avatar</label>
          <div class="avatar-colors" id="avatar-color-group" role="group" aria-label="Pilih warna avatar">
            {#each AVATAR_COLORS as c}
              <button type="button" class="color-dot {userForm.avatar_color===c?'selected':''}"
                style="background:{c}" on:click={()=>userForm.avatar_color=c}
                aria-label="Warna {c}">
                {#if userForm.avatar_color===c}<i class="fa-solid fa-check" style="color:#fff;font-size:.6rem"></i>{/if}
              </button>
            {/each}
          </div>
          <div class="avatar-preview" style="background:{userForm.avatar_color}">{getInitials(userForm.name||'?')}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" on:click={cancelUserForm}>Batal</button>
        <button class="btn btn-primary" on:click={saveUser}><i class="fa-solid fa-floppy-disk"></i> Simpan</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header{margin-bottom:20px}
  .settings-layout{display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:start}
  @media(max-width:640px){.settings-layout{grid-template-columns:1fr}}
  .settings-nav{padding:8px;display:flex;flex-direction:column;gap:2px}
  @media(max-width:640px){.settings-nav{flex-direction:row;flex-wrap:wrap}}
  .settings-tab{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:var(--radius-sm);border:none;background:none;cursor:pointer;font-size:.85rem;color:var(--text-muted);transition:all .15s;text-align:left;width:100%}
  .settings-tab:hover{background:var(--surface2);color:var(--text)}
  .settings-tab.active{background:var(--primary-l);color:var(--primary);font-weight:600}
  .settings-card{padding:16px}
  .settings-section-title{display:flex;align-items:center;gap:8px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)}
  .logo-preview{display:flex;align-items:center;gap:12px;padding:10px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border)}
  .logo-img{width:60px;height:60px;object-fit:contain;border-radius:var(--radius-sm)}
  .img-upload-zone{display:flex;align-items:center;gap:10px;padding:14px 16px;border:2px dashed var(--border);border-radius:var(--radius-sm);cursor:pointer;color:var(--text-muted);font-size:.85rem;transition:all .2s}
  .img-upload-zone:hover{border-color:var(--primary);color:var(--primary)}
  .theme-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .theme-label{font-size:.85rem;color:var(--text)}
  .users-list{display:flex;flex-direction:column;gap:4px}
  .user-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface2);transition:background .15s}
  .user-row.user-active{border-color:var(--primary);background:var(--primary-l)}
  .user-avatar{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:.75rem;font-weight:700;color:#fff;flex-shrink:0}
  .user-info{flex:1;display:flex;flex-direction:column;gap:1px}
  .user-name{font-size:.85rem;font-weight:600;color:var(--text)}
  .user-role{font-size:.7rem;color:var(--text-muted)}
  .active-badge{font-size:.72rem;font-weight:600;color:var(--primary);display:flex;align-items:center;gap:4px;white-space:nowrap}
  .data-actions{display:flex;flex-direction:column;gap:8px}
  .data-btn{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface2);cursor:pointer;text-align:left;transition:all .15s;width:100%}
  .data-btn:hover{border-color:var(--primary);background:var(--primary-l)}
  .data-btn-title{font-size:.85rem;font-weight:600;color:var(--text)}
  .data-btn-sub{font-size:.75rem;color:var(--text-muted);margin-top:1px}
  .import-btn{cursor:pointer}
  .danger-zone{border-color:var(--danger-l)!important}
  .danger-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .danger-title{font-size:.85rem;font-weight:600;color:var(--danger)}
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;z-index:100}
  @media(min-width:640px){.modal-backdrop{align-items:center}}
  .modal-box{background:var(--surface);width:100%;max-width:420px;border-radius:var(--radius) var(--radius) 0 0;max-height:90vh;overflow-y:auto}
  @media(min-width:640px){.modal-box{border-radius:var(--radius)}}
  .modal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--surface);z-index:1}
  .modal-title{font-size:.95rem;font-weight:700;display:flex;align-items:center;gap:8px}
  .modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--border);position:sticky;bottom:0;background:var(--surface)}
  .avatar-colors{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
  .color-dot{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;display:grid;place-items:center;transition:all .15s}
  .color-dot.selected{border-color:#fff;box-shadow:0 0 0 2px var(--primary)}
  .avatar-preview{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:.85rem;font-weight:700;color:#fff}
</style>
