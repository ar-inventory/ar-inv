<script>
  import { STATUS_LABELS, STATUS_ICONS } from '$lib/utils/format.js';

  export let status = 'available';
  export let size = 'md'; // sm | md
</script>

<span class="badge badge-{status} {size === 'sm' ? 'badge-sm' : ''}">
  <i class="{STATUS_ICONS[status] ?? 'fa-solid fa-circle'} text-[.65rem]"></i>
  {STATUS_LABELS[status] ?? status}
</span>

<style>
  .badge-sm { padding: 2px 7px; font-size: .65rem; }
</style>
