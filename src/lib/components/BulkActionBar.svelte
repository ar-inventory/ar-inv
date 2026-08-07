<script>
  export let count     = 0;
  export let onClear   = () => {};
  export let onStatus  = () => {};
  export let onCondition = () => {};
  export const onLocation = null;  // reserved for future use
  export let onPrint   = () => {};
  export let onDelete  = () => {};

  const statuses = [
    { value: 'available',   label: 'Tersedia' },
    { value: 'in_use',      label: 'Digunakan' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retired',     label: 'Tidak Aktif' },
  ];
  const conditions = [
    { value: 'good',   label: 'Baik'   },
    { value: 'fair',   label: 'Cukup'  },
    { value: 'poor',   label: 'Buruk'  },
    { value: 'broken', label: 'Rusak'  },
  ];

  let showStatus    = false;
  let showCondition = false;

  function close() { showStatus = false; showCondition = false; }
</script>

<svelte:window on:click={close} />

<div class="bulk-bar">
  <div class="bulk-left">
    <button class="bulk-clear" on:click={onClear} title="Batalkan seleksi">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <span class="bulk-count">
      <strong>{count}</strong> item dipilih
    </span>
  </div>

  <div class="bulk-actions">
    <!-- Status dropdown -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="bulk-dropdown" role="group" on:click|stopPropagation on:keydown|stopPropagation>
      <button class="btn btn-secondary btn-sm" on:click={() => { showStatus = !showStatus; showCondition = false; }}>
        <i class="fa-solid fa-circle-half-stroke"></i>
        Status
        <i class="fa-solid fa-chevron-down" style="font-size:.65rem"></i>
      </button>
      {#if showStatus}
        <div class="dropdown-menu">
          {#each statuses as s}
            <button class="dropdown-item" on:click={() => { onStatus(s.value); close(); }}>
              {s.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Condition dropdown -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="bulk-dropdown" role="group" on:click|stopPropagation on:keydown|stopPropagation>
      <button class="btn btn-secondary btn-sm" on:click={() => { showCondition = !showCondition; showStatus = false; }}>
        <i class="fa-solid fa-heart-pulse"></i>
        Kondisi
        <i class="fa-solid fa-chevron-down" style="font-size:.65rem"></i>
      </button>
      {#if showCondition}
        <div class="dropdown-menu">
          {#each conditions as c}
            <button class="dropdown-item" on:click={() => { onCondition(c.value); close(); }}>
              {c.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Print -->
    <button class="btn btn-secondary btn-sm" on:click={onPrint} title="Print label QR">
      <i class="fa-solid fa-print"></i>
      <span class="hide-xs">Print Label</span>
    </button>

    <!-- Delete -->
    {#if onDelete}
      <button class="btn btn-sm" style="background:var(--danger-l);color:var(--danger);border-color:var(--danger-l)"
              on:click={onDelete} title="Hapus item terpilih">
        <i class="fa-solid fa-trash"></i>
        <span class="hide-xs">Hapus</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .bulk-bar {
    position: fixed;
    bottom: calc(var(--bottomnav-h) + 12px);
    left: 50%; transform: translateX(-50%);
    background: var(--text);
    color: #fff;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    padding: 10px 16px;
    display: flex; align-items: center; gap: 12px;
    z-index: 60;
    min-width: 320px;
    max-width: calc(100vw - 32px);
    animation: slideUp .2s ease;
  }
  @media (min-width: 1024px) {
    .bulk-bar { bottom: 24px; left: calc(var(--sidebar-w) + 50%); }
  }

  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
    to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
  }

  .bulk-left  { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .bulk-count { font-size: .83rem; white-space: nowrap; }
  .bulk-count strong { color: #a5b4fc; }

  .bulk-clear {
    width: 26px; height: 26px;
    border: none; background: rgba(255,255,255,.15);
    color: #fff; border-radius: 50%; cursor: pointer;
    display: grid; place-items: center; font-size: .75rem;
    transition: background .15s;
  }
  .bulk-clear:hover { background: rgba(255,255,255,.25); }

  .bulk-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

  .bulk-dropdown { position: relative; }
  .dropdown-menu {
    position: absolute; bottom: calc(100% + 6px); left: 0;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-sm); box-shadow: var(--shadow-md);
    min-width: 140px; overflow: hidden; z-index: 70;
  }
  .dropdown-item {
    display: block; width: 100%; padding: 9px 14px;
    font-size: .82rem; color: var(--text);
    background: none; border: none; cursor: pointer;
    text-align: left; transition: background .12s;
  }
  .dropdown-item:hover { background: var(--surface2); }

  @media (max-width: 400px) { .hide-xs { display: none; } }
</style>
