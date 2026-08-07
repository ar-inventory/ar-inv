<script>
  export let icon    = 'fa-solid fa-box-open';
  export let title   = 'Belum ada data';
  export let message = '';
  export let actionLabel = '';
  export let onAction = null;
</script>

<div class="empty-state">
  <div class="empty-icon">
    <i class="{icon}"></i>
  </div>
  <h3 class="empty-title">{title}</h3>
  {#if message}
    <p class="empty-message">{message}</p>
  {/if}
  {#if actionLabel && onAction}
    <button class="btn btn-primary mt-4" on:click={onAction}>
      <i class="fa-solid fa-plus"></i>
      {actionLabel}
    </button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }
  .empty-icon {
    width: 72px; height: 72px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 50%;
    display: grid; place-items: center;
    margin-bottom: 16px;
  }
  .empty-icon i { font-size: 1.6rem; color: var(--text-muted); }
  .empty-title  { font-size: 1rem; font-weight: 600; color: var(--text); }
  .empty-message{ font-size: .85rem; color: var(--text-muted); margin-top: 6px; max-width: 320px; }
</style>
