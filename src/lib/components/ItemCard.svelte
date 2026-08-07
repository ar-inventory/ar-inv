<script>
  import StatusBadge    from './StatusBadge.svelte';
  import ConditionBadge from './ConditionBadge.svelte';
  import { formatDate, formatCurrency } from '$lib/utils/format.js';

  export let item;
  export let selected  = false;
  export let onSelect  = null;   // callback checkbox
  export let viewMode  = 'grid'; // grid | list
</script>

{#if viewMode === 'grid'}
  <!-- ── GRID CARD ── -->
  <div class="item-card card card-hover {selected ? 'selected' : ''}">
    <!-- Checkbox select -->
    {#if onSelect}
      <div class="card-check" role="presentation" on:click|stopPropagation on:keydown|stopPropagation>
        <input type="checkbox" checked={selected} on:change={() => onSelect(item.id)} aria-label="Pilih {item.name}" />
      </div>
    {/if}

    <!-- Foto / placeholder -->
    <a href="/items/{item.id}" class="card-img-wrap">
      {#if item.image_url}
        <img src={item.image_url} alt={item.name} class="card-img" />
      {:else}
        <div class="card-img-placeholder">
          <i class="{item.category_icon ?? 'fa-solid fa-box'}"
             style="color:{item.category_color ?? 'var(--text-muted)'}"></i>
        </div>
      {/if}
      <!-- Status badge overlay -->
      <span class="card-status-dot status-{item.status}"></span>
    </a>

    <a href="/items/{item.id}" class="card-body">
      <!-- Category -->
      {#if item.category_name}
        <span class="card-category" style="color:{item.category_color ?? 'var(--text-muted)'}">
          <i class="{item.category_icon ?? 'fa-solid fa-tag'}" style="font-size:.65rem"></i>
          {item.category_name}
        </span>
      {/if}

      <!-- Name -->
      <h3 class="card-name">{item.name}</h3>

      <!-- Brand / Model -->
      {#if item.brand || item.model}
        <p class="card-sub">
          {[item.brand, item.model].filter(Boolean).join(' · ')}
        </p>
      {/if}

      <!-- Badges -->
      <div class="card-badges">
        <StatusBadge status={item.status} size="sm" />
        <ConditionBadge condition={item.condition} size="sm" />
      </div>

      <!-- Location -->
      {#if item.location_name}
        <p class="card-location">
          <i class="fa-solid fa-location-dot"></i>
          {item.location_name}
        </p>
      {/if}
    </a>
  </div>

{:else}
  <!-- ── LIST ROW ── -->
  <div class="list-row {selected ? 'selected' : ''}">
    {#if onSelect}
      <div class="list-check" role="presentation" on:click|stopPropagation on:keydown|stopPropagation>
        <input type="checkbox" checked={selected} on:change={() => onSelect(item.id)} aria-label="Pilih {item.name}" />
      </div>
    {/if}

    <!-- Icon kategori -->
    <div class="list-icon" style="background:{item.category_color ?? 'var(--border)'}20; color:{item.category_color ?? 'var(--text-muted)'}">
      <i class="{item.category_icon ?? 'fa-solid fa-box'}"></i>
    </div>

    <!-- Info utama -->
    <a href="/items/{item.id}" class="list-main">
      <span class="list-name">{item.name}</span>
      {#if item.brand || item.model}
        <span class="list-sub">{[item.brand, item.model].filter(Boolean).join(' · ')}</span>
      {/if}
    </a>

    <!-- Category -->
    <span class="list-cat hide-sm">{item.category_name ?? '—'}</span>

    <!-- Location -->
    <span class="list-loc hide-md">
      {#if item.location_name}
        <i class="fa-solid fa-location-dot" style="font-size:.65rem"></i>
        {item.location_name}
      {:else}—{/if}
    </span>

    <!-- Status + Condition -->
    <div class="list-badges">
      <StatusBadge    status={item.status}     size="sm" />
      <ConditionBadge condition={item.condition} size="sm" />
    </div>

    <!-- Action -->
    <a href="/items/{item.id}" class="btn-icon list-action" title="Lihat detail">
      <i class="fa-solid fa-chevron-right"></i>
    </a>
  </div>
{/if}

<style>
  /* ── GRID ── */
  .item-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    cursor: pointer;
  }
  .item-card.selected { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-l); }

  .card-check {
    position: absolute; top: 8px; left: 8px; z-index: 2;
    width: 20px; height: 20px;
    display: grid; place-items: center;
  }
  .card-check input { width: 15px; height: 15px; accent-color: var(--primary); cursor: pointer; }

  .card-img-wrap {
    display: block;
    width: 100%; height: 130px;
    background: var(--surface2);
    position: relative; overflow: hidden;
    flex-shrink: 0;
  }
  .card-img { width: 100%; height: 100%; object-fit: contain; background: var(--surface2); }
  .card-img-placeholder {
    width: 100%; height: 100%;
    display: grid; place-items: center;
    font-size: 2rem;
  }

  .card-status-dot {
    position: absolute; bottom: 8px; right: 8px;
    width: 10px; height: 10px; border-radius: 50%;
    border: 2px solid var(--surface);
  }
  .status-available   { background: var(--accent);  }
  .status-in_use      { background: var(--warning);  }
  .status-maintenance { background: var(--info);     }
  .status-retired     { background: var(--text-muted); }

  .card-body {
    display: flex; flex-direction: column; gap: 4px;
    padding: 12px; text-decoration: none; color: inherit; flex: 1;
  }
  .card-category {
    font-size: .68rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: .04em;
    display: flex; align-items: center; gap: 4px;
  }
  .card-name    { font-size: .9rem; font-weight: 700; color: var(--text); line-height: 1.3; }
  .card-sub     { font-size: .75rem; color: var(--text-muted); }
  .card-badges  { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .card-location {
    font-size: .72rem; color: var(--text-muted);
    display: flex; align-items: center; gap: 4px; margin-top: 2px;
  }

  /* ── LIST ── */
  .list-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    transition: background .15s;
  }
  .list-row:last-child  { border-bottom: none; }
  .list-row:hover       { background: var(--surface2); }
  .list-row.selected    { background: var(--primary-l); border-color: var(--primary); }

  .list-check { display: grid; place-items: center; flex-shrink: 0; }
  .list-check input { width: 15px; height: 15px; accent-color: var(--primary); cursor: pointer; }

  .list-icon {
    width: 34px; height: 34px; border-radius: 8px;
    display: grid; place-items: center;
    font-size: .85rem; flex-shrink: 0;
  }
  .list-main {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 1px;
    text-decoration: none;
  }
  .list-name   { font-size: .875rem; font-weight: 600; color: var(--text);
                 white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list-sub    { font-size: .72rem; color: var(--text-muted); }
  .list-cat    { font-size: .75rem; color: var(--text-muted); min-width: 100px; flex-shrink: 0; }
  .list-loc    { font-size: .75rem; color: var(--text-muted); min-width: 100px; flex-shrink: 0;
                 display: flex; align-items: center; gap: 4px; }
  .list-badges { display: flex; gap: 4px; flex-shrink: 0; }
  .list-action { flex-shrink: 0; font-size: .75rem; }

  @media (max-width: 640px)  { .hide-sm { display: none; } }
  @media (max-width: 768px)  { .hide-md { display: none; } }
</style>
