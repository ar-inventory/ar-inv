<script>
  import { unreadCount, notifications } from '$lib/stores/ui.js';
  import { markAsRead, markAllAsRead, NOTIF_ICONS, NOTIF_LABELS } from '$lib/db/notifications.js';
  import { getUnreadNotifications, getUnreadCount } from '$lib/db/notifications.js';
  import { dbReady } from '$lib/stores/db.js';
  import { timeAgo, formatDate } from '$lib/utils/format.js';
  import { goto } from '$app/navigation';

  let showPanel = false;

  $: if ($dbReady) {
    refreshNotifications();
  }

  function refreshNotifications() {
    notifications.set(getUnreadNotifications());
    unreadCount.set(getUnreadCount());
  }

  function handleRead(notif) {
    markAsRead(notif.id);
    refreshNotifications();
    if (notif.item_id) goto(`/items/${notif.item_id}`);
    showPanel = false;
  }

  function handleMarkAll() {
    markAllAsRead();
    refreshNotifications();
  }

  function toggle() { showPanel = !showPanel; }
  function close()  { showPanel = false; }
</script>

<svelte:window on:click={(e) => { if (!e.target.closest('.notif-wrapper')) close(); }} />

<div class="notif-wrapper" style="position:relative">
  <button class="btn-icon notif-btn" on:click={toggle} title="Notifikasi">
    <i class="fa-solid fa-bell"></i>
    {#if $unreadCount > 0}
      <span class="notif-badge">{$unreadCount > 99 ? '99+' : $unreadCount}</span>
    {/if}
  </button>

  {#if showPanel}
    <div class="notif-panel">
      <div class="notif-header">
        <span class="notif-title">
          <i class="fa-solid fa-bell"></i> Notifikasi
        </span>
        {#if $unreadCount > 0}
          <button class="btn btn-ghost btn-sm" on:click={handleMarkAll}>
            Tandai semua dibaca
          </button>
        {/if}
      </div>

      <div class="notif-list">
        {#if $notifications.length === 0}
          <div class="notif-empty">
            <i class="fa-solid fa-check-circle" style="color:var(--accent);font-size:1.4rem"></i>
            <p>Semua beres, tidak ada notifikasi</p>
          </div>
        {:else}
          {#each $notifications as notif}
            <button class="notif-item" on:click={() => handleRead(notif)}>
              <span class="notif-icon">
                <i class="{NOTIF_ICONS[notif.type] ?? 'fa-solid fa-bell'}"></i>
              </span>
              <div class="notif-body">
                <p class="notif-msg">{notif.message}</p>
                <span class="notif-time">{timeAgo(notif.created_at)}</span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .notif-btn { position: relative; }
  .notif-badge {
    position: absolute; top: -2px; right: -2px;
    background: var(--danger); color: #fff;
    font-size: .6rem; font-weight: 700;
    min-width: 16px; height: 16px;
    border-radius: 8px; padding: 0 4px;
    display: grid; place-items: center;
    border: 2px solid var(--surface);
  }
  .notif-panel {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow-lg);
    width: 320px; max-width: calc(100vw - 32px);
    z-index: 200; overflow: hidden;
  }
  /* Mobile: panel di tengah layar */
  @media (max-width: 640px) {
    .notif-panel {
      position: fixed;
      top: calc(var(--header-h) + 8px);
      left: 50%;
      right: auto;
      transform: translateX(-50%);
      width: calc(100vw - 32px);
      max-width: 380px;
    }
  }
  .notif-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }
  .notif-title {
    font-size: .85rem; font-weight: 700; color: var(--text);
    display: flex; align-items: center; gap: 7px;
  }
  .notif-list { max-height: 360px; overflow-y: auto; }
  .notif-empty {
    padding: 32px 16px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .notif-empty p { font-size: .83rem; color: var(--text-muted); }

  .notif-item {
    display: flex; align-items: flex-start; gap: 10px;
    width: 100%; padding: 12px 14px;
    background: none; border: none; border-bottom: 1px solid var(--border);
    cursor: pointer; text-align: left; transition: background .15s;
  }
  .notif-item:hover { background: var(--surface2); }
  .notif-item:last-child { border-bottom: none; }

  .notif-icon {
    width: 30px; height: 30px; flex-shrink: 0;
    background: var(--warning-l); border-radius: 50%;
    display: grid; place-items: center;
    font-size: .75rem;
  }
  .notif-body { flex: 1; min-width: 0; }
  .notif-msg  { font-size: .82rem; color: var(--text); line-height: 1.4; }
  .notif-time { font-size: .72rem; color: var(--text-muted); margin-top: 3px; display: block; }
</style>
