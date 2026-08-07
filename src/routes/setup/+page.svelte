<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { dbReady } from '$lib/stores/db.js';
  import { hasAnyAdmin, createUserWithPassword } from '$lib/db/users.js';
  import { setSetting } from '$lib/db/settings.js';
  import { setSession } from '$lib/auth/session.js';
  import { ROLE_DESCRIPTIONS } from '$lib/auth/permissions.js';
  import { getAvatarColor, getInitials } from '$lib/db/users.js';
  import { toastError, alertError } from '$lib/utils/swal.js';

  let step = 1;  // 1 = company info, 2 = admin account
  let saving = false;

  // Step 1 — company
  let companyName = '';

  // Step 2 — admin
  let adminName     = '';
  let adminPassword = '';
  let adminConfirm  = '';
  let adminColor    = '#6366f1';
  let showPassword  = false;
  let showConfirm   = false;

  const AVATAR_COLORS = [
    '#6366f1','#10b981','#f59e0b','#ef4444',
    '#3b82f6','#8b5cf6','#06b6d4','#ec4899'
  ];

  // Cek saat DB siap — kalau sudah ada admin, redirect ke login
  $: if ($dbReady) {
    if (hasAnyAdmin()) goto('/login');
  }

  function nextStep() {
    if (!companyName.trim()) { alertError('Nama perusahaan wajib diisi'); return; }
    step = 2;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!adminName.trim())   { alertError('Nama admin wajib diisi'); return; }
    if (adminPassword.length < 6) { alertError('Password minimal 6 karakter'); return; }
    if (adminPassword !== adminConfirm) { alertError('Konfirmasi password tidak cocok'); return; }

    saving = true;
    try {
      // Simpan nama perusahaan
      setSetting('company_name', companyName.trim());

      // Buat akun admin
      const userId = await createUserWithPassword({
        name:         adminName.trim(),
        role:         'admin',
        avatar_color: adminColor,
        password:     adminPassword
      });

      // Auto login setelah setup
      setSession({
        user_id:      userId,
        user_name:    adminName.trim(),
        role:         'admin',
        avatar_color: adminColor
      });

      goto('/');
    } catch (err) {
      toastError('Gagal menyimpan: ' + err.message);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Setup — Inventory App</title></svelte:head>

<div class="setup-page">
  <div class="setup-card">

    <!-- Logo -->
    <div class="setup-logo">
      <div class="logo-icon">
        <i class="fa-solid fa-boxes-stacked"></i>
      </div>
      <h1 class="logo-title">Inventory App</h1>
      <p class="logo-sub">Selamat datang! Mari mulai dengan konfigurasi awal.</p>
    </div>

    <!-- Step indicator -->
    <div class="steps">
      <div class="step {step >= 1 ? 'active' : ''}">
        <span class="step-num">{step > 1 ? '' : '1'}
          {#if step > 1}<i class="fa-solid fa-check"></i>{/if}
        </span>
        <span class="step-label">Perusahaan</span>
      </div>
      <div class="step-line"></div>
      <div class="step {step >= 2 ? 'active' : ''}">
        <span class="step-num">2</span>
        <span class="step-label">Akun Admin</span>
      </div>
    </div>

    <!-- STEP 1: Company -->
    {#if step === 1}
      <div class="step-content">
        <h2 class="step-title">Informasi Perusahaan</h2>
        <p class="step-desc">Nama ini akan tampil di header aplikasi dan label print.</p>

        <div class="form-group">
          <label class="form-label" for="company-name">Nama Perusahaan *</label>
          <input
            id="company-name"
            class="form-input"
            type="text"
            bind:value={companyName}
            placeholder="Contoh: PT Loyalitas Karya Usaha"
            on:keydown={(e) => e.key === 'Enter' && nextStep()}
          />
        </div>

        <button class="btn btn-primary btn-block" on:click={nextStep}>
          Lanjut <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>

    <!-- STEP 2: Admin account -->
    {:else}
      <form class="step-content" on:submit={handleSubmit}>
        <h2 class="step-title">Buat Akun Admin</h2>
        <p class="step-desc">
          Akun ini punya akses penuh ke semua fitur.
          Simpan password dengan aman — tidak bisa dipulihkan jika lupa.
        </p>

        <div class="form-group">
          <label class="form-label" for="admin-name">Nama *</label>
          <input
            id="admin-name"
            class="form-input"
            type="text"
            bind:value={adminName}
            placeholder="Nama Anda"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="admin-pass">Password * <span class="hint-label">(min. 6 karakter)</span></label>
          <div class="input-eye">
            <input
              id="admin-pass"
              class="form-input"
              type={showPassword ? 'text' : 'password'}
              bind:value={adminPassword}
              placeholder="Masukkan password"
            />
            <button type="button" class="eye-btn" on:click={() => showPassword = !showPassword}
                    aria-label="{showPassword ? 'Sembunyikan' : 'Tampilkan'} password">
              <i class="fa-solid {showPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="admin-confirm">Konfirmasi Password *</label>
          <div class="input-eye">
            <input
              id="admin-confirm"
              class="form-input"
              type={showConfirm ? 'text' : 'password'}
              bind:value={adminConfirm}
              placeholder="Ulangi password"
            />
            <button type="button" class="eye-btn" on:click={() => showConfirm = !showConfirm}
                    aria-label="{showConfirm ? 'Sembunyikan' : 'Tampilkan'} konfirmasi password">
              <i class="fa-solid {showConfirm ? 'fa-eye-slash' : 'fa-eye'}"></i>
            </button>
          </div>
          {#if adminConfirm && adminPassword !== adminConfirm}
            <p class="form-error"><i class="fa-solid fa-triangle-exclamation" style="font-size:.65rem"></i> Password tidak cocok</p>
          {/if}
        </div>

        <!-- Avatar color -->
        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label" for="avatar-color-setup">Warna Avatar</label>
          <div class="avatar-row" id="avatar-color-setup">
            <div class="avatar-preview" style="background:{adminColor}">
              {getInitials(adminName || 'A')}
            </div>
            <div class="color-dots">
              {#each AVATAR_COLORS as c}
                <button type="button"
                  class="color-dot {adminColor === c ? 'selected' : ''}"
                  style="background:{c}"
                  on:click={() => adminColor = c}
                  aria-label="Warna {c}">
                  {#if adminColor === c}
                    <i class="fa-solid fa-check" style="color:#fff;font-size:.55rem"></i>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button type="button" class="btn btn-ghost" on:click={() => step = 1}>
            <i class="fa-solid fa-arrow-left"></i> Kembali
          </button>
          <button type="submit" class="btn btn-primary" disabled={saving}>
            {#if saving}
              <span class="spinner" style="width:14px;height:14px;border-width:2px"></span>
              Menyimpan...
            {:else}
              <i class="fa-solid fa-rocket"></i> Mulai Sekarang
            {/if}
          </button>
        </div>
      </form>
    {/if}

  </div>
</div>

<style>
  .setup-page {
    min-height: 100vh; min-height: 100dvh;
    display: grid; place-items: center;
    background: var(--bg);
    padding: 20px;
  }

  .setup-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    width: 100%; max-width: 440px;
    padding: 32px 28px;
  }

  /* Logo */
  .setup-logo { text-align: center; margin-bottom: 28px; }
  .logo-icon {
    width: 60px; height: 60px;
    background: linear-gradient(135deg, var(--primary), #818cf8);
    border-radius: 16px;
    display: grid; place-items: center;
    margin: 0 auto 12px;
  }
  .logo-icon i   { color: #fff; font-size: 1.5rem; }
  .logo-title    { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
  .logo-sub      { font-size: .82rem; color: var(--text-muted); }

  /* Steps */
  .steps {
    display: flex; align-items: center;
    margin-bottom: 28px;
  }
  .step {
    display: flex; align-items: center; gap: 8px;
    flex: 1;
  }
  .step-num {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid var(--border);
    display: grid; place-items: center;
    font-size: .75rem; font-weight: 700;
    color: var(--text-muted); flex-shrink: 0;
    transition: all .2s;
  }
  .step.active .step-num {
    background: var(--primary); border-color: var(--primary);
    color: #fff;
  }
  .step-label { font-size: .8rem; color: var(--text-muted); }
  .step.active .step-label { color: var(--primary); font-weight: 600; }
  .step-line { flex: 1; height: 2px; background: var(--border); margin: 0 8px; }

  /* Content */
  .step-title { font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .step-desc  { font-size: .82rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5; }
  .hint-label { font-size: .7rem; color: var(--text-muted); font-weight: 400; }

  .btn-block  { width: 100%; justify-content: center; padding: 12px; font-size: .95rem; }

  /* Password input with eye toggle */
  .input-eye  { position: relative; }
  .input-eye .form-input { padding-right: 42px; }
  .eye-btn {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); font-size: .9rem; padding: 4px;
    transition: color .15s;
  }
  .eye-btn:hover { color: var(--text); }

  /* Avatar */
  .avatar-row    { display: flex; align-items: center; gap: 14px; }
  .avatar-preview {
    width: 44px; height: 44px; border-radius: 50%;
    display: grid; place-items: center;
    font-size: .9rem; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .color-dots { display: flex; gap: 6px; flex-wrap: wrap; }
  .color-dot {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid transparent; cursor: pointer;
    display: grid; place-items: center;
    transition: all .15s;
  }
  .color-dot.selected { border-color: #fff; box-shadow: 0 0 0 2px var(--primary); }

  .step-actions { display: flex; justify-content: space-between; gap: 8px; }
</style>
