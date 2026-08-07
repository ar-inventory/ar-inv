<script>
  /**
   * CustomFieldForm — Render form input dinamis dari definisi category_fields
   * Props:
   *   fields  : array dari category_fields
   *   values  : object { field_id: value }
   *   onChange: callback(fieldId, value)
   */
  import { parseFieldOptions } from '$lib/db/categories.js';

  export let fields  = [];
  export let values  = {};
  export let onChange = (fieldId, value) => {};

  const TYPE_ICONS = {
    text:     'fa-solid fa-font',
    number:   'fa-solid fa-hashtag',
    select:   'fa-solid fa-chevron-down',
    date:     'fa-solid fa-calendar-days',
    textarea: 'fa-solid fa-align-left',
    boolean:  'fa-solid fa-toggle-on',
  };

  function val(fieldId) {
    return values[fieldId] ?? '';
  }

  function onInput(fieldId, e) {
    onChange(fieldId, e.target.value);
  }

  function onToggle(fieldId, e) {
    onChange(fieldId, e.target.checked ? 'true' : 'false');
  }
</script>

{#if fields.length > 0}
  <div class="custom-fields">
    <div class="cf-heading">
      <i class="fa-solid fa-sliders"></i>
      Informasi Tambahan
    </div>

    <div class="cf-grid">
      {#each fields as field}
        <div class="form-group {field.field_type === 'textarea' ? 'full-width' : ''}">
          <label class="form-label" for="cf-{field.id}">
            <i class="{TYPE_ICONS[field.field_type] ?? 'fa-solid fa-circle'}" style="font-size:.65rem;opacity:.6"></i>
            {field.field_label}
            {#if field.field_unit}
              <span class="cf-unit">{field.field_unit}</span>
            {/if}
            {#if field.is_required}
              <span class="cf-required">*</span>
            {/if}
          </label>

          <!-- text -->
          {#if field.field_type === 'text'}
            <input
              id="cf-{field.id}"
              class="form-input"
              type="text"
              value={val(field.id)}
              placeholder={field.field_unit ? `Contoh: 220 ${field.field_unit}` : ''}
              required={field.is_required}
              on:input={(e) => onInput(field.id, e)}
            />

          <!-- number -->
          {:else if field.field_type === 'number'}
            <div class="input-with-unit">
              <input
                id="cf-{field.id}"
                class="form-input"
                type="number"
                value={val(field.id)}
                step="any"
                required={field.is_required}
                on:input={(e) => onInput(field.id, e)}
              />
              {#if field.field_unit}
                <span class="input-unit">{field.field_unit}</span>
              {/if}
            </div>

          <!-- select -->
          {:else if field.field_type === 'select'}
            <select
              id="cf-{field.id}"
              class="form-input form-select"
              value={val(field.id)}
              required={field.is_required}
              on:change={(e) => onInput(field.id, e)}
            >
              <option value="">-- Pilih --</option>
              {#each parseFieldOptions(field) as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>

          <!-- date -->
          {:else if field.field_type === 'date'}
            <input
              id="cf-{field.id}"
              class="form-input"
              type="date"
              value={val(field.id)}
              required={field.is_required}
              on:input={(e) => onInput(field.id, e)}
            />

          <!-- textarea -->
          {:else if field.field_type === 'textarea'}
            <textarea
              id="cf-{field.id}"
              class="form-input"
              rows="3"
              value={val(field.id)}
              required={field.is_required}
              on:input={(e) => onInput(field.id, e)}
            ></textarea>

          <!-- boolean -->
          {:else if field.field_type === 'boolean'}
            <label class="toggle-wrap">
              <input
                id="cf-{field.id}"
                type="checkbox"
                class="toggle-input"
                checked={val(field.id) === 'true'}
                on:change={(e) => onToggle(field.id, e)}
              />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-label">
                {val(field.id) === 'true' ? 'Ya' : 'Tidak'}
              </span>
            </label>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .custom-fields {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-top: 4px;
  }
  .cf-heading {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px;
    background: var(--surface2);
    font-size: .78rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .05em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }
  .cf-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    padding: 14px;
  }
  @media (max-width: 480px) {
    .cf-grid { grid-template-columns: 1fr; }
  }
  .full-width { grid-column: 1 / -1; }

  .cf-unit {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 1px 5px;
    font-size: .65rem; color: var(--text-muted);
    margin-left: 4px; font-weight: 400;
  }
  .cf-required { color: var(--danger); margin-left: 2px; }

  /* Number + unit */
  .input-with-unit { display: flex; align-items: center; gap: 0; }
  .input-with-unit .form-input { border-radius: var(--radius-sm) 0 0 var(--radius-sm); flex: 1; }
  .input-unit {
    padding: 0 10px; height: 42px;
    background: var(--surface2); border: 1.5px solid var(--border);
    border-left: none; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    font-size: .8rem; color: var(--text-muted);
    display: flex; align-items: center; white-space: nowrap;
  }

  /* Toggle / boolean */
  .toggle-wrap {
    display: flex; align-items: center; gap: 10px;
    cursor: pointer; padding-top: 8px;
  }
  .toggle-input { display: none; }
  .toggle-track {
    width: 40px; height: 22px;
    background: var(--border); border-radius: 11px;
    position: relative; transition: background .2s;
    flex-shrink: 0;
  }
  .toggle-input:checked + .toggle-track { background: var(--primary); }
  .toggle-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #fff; box-shadow: var(--shadow-sm);
    transition: transform .2s;
  }
  .toggle-input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); }
  .toggle-label { font-size: .85rem; color: var(--text); }
</style>
