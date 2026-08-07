<script>
  import { CONDITION_LABELS, CONDITION_ICONS } from '$lib/utils/format.js';

  export let condition = 'good';
  export let size = 'md';
</script>

<span class="badge badge-{condition} {size === 'sm' ? 'badge-sm' : ''}">
  <i class="{CONDITION_ICONS[condition] ?? 'fa-solid fa-circle'} text-[.65rem]"></i>
  {CONDITION_LABELS[condition] ?? condition}
</span>

<style>
  .badge-sm { padding: 2px 7px; font-size: .65rem; }
</style>
