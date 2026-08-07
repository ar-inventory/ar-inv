<script>
  import { getAllLocations, buildLocationTree, getLocationPath } from '$lib/db/locations.js';
  import { dbReady } from '$lib/stores/db.js';

  export let value    = null;   // location_id terpilih
  export let onChange = (id) => {};
  export let label    = 'Lokasi';

  let locations = [];
  let tree      = [];

  $: if ($dbReady) {
    locations = getAllLocations();
    tree      = buildLocationTree(locations);
  }

  $: selectedPath = value ? getLocationPath(value, locations) : '';

  function onSelect(e) {
    const id = e.target.value ? parseInt(e.target.value) : null;
    value = id;
    onChange(id);
  }
</script>

<div class="form-group">
  <label class="form-label" for="loc-picker">
    <i class="fa-solid fa-location-dot" style="font-size:.7rem;opacity:.7"></i>
    {label}
  </label>
  <select id="loc-picker" class="form-input form-select" value={value ?? ''} on:change={onSelect}>
    <option value="">-- Pilih Lokasi --</option>
    {#each locations as loc}
      <option value={loc.id}>
        {'　'.repeat(loc.level)}{loc.level > 0 ? '└ ' : ''}{loc.name}
      </option>
    {/each}
  </select>
  {#if selectedPath}
    <p class="form-hint">
      <i class="fa-solid fa-route" style="font-size:.65rem"></i>
      {selectedPath}
    </p>
  {/if}
</div>
