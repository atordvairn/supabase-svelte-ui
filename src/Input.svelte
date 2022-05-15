<script>
  export let type,
    placeholder,
    value,
    variant,
    size,
    style,
    icon,
    disabled,
    onfocus,
    onblur,
    onchange,
    onkeydown,
    onkeyup;
</script>

<div class="input-cont relative flex items-center">
  {#if icon}
    <svelte:component this={icon} class="transform absolute left-5" />
    <input
      {style}
      {disabled}
      on:focus={onfocus}
      on:blur={onblur}
      on:change={onchange}
      on:keydown={onkeydown}
      on:keyup={onkeyup}
      value={value || ""}
      class="sbui-input--{size} sbui_input pl-10  sbui_input--{variant ||
        'success'} focus:outline-none block box-border pr-3 py-2 w-full rounded-md shadow-sm text-sm border border-solid transition-all bg-white text-input-value-light border-input-border-light dark:bg-transparent dark:text-input-value-dark dark:border-input-border-dark"
      type={type || "text"}
      placeholder={placeholder || ""}
    />
  {:else}
    <input
      {disabled}
      on:focus={onfocus}
      on:blur={onblur}
      on:change={onchange}
      on:keydown={onkeydown}
      on:keyup={onkeyup}
      {style}
      value={value || ""}
      class="not_padded sbui-input--{size} sbui_input sbui_input--{variant ||
        'success'} focus:outline-none block box-border pl-3 pr-3 py-2 w-full rounded-md shadow-sm text-sm border border-solid transition-all bg-white text-input-value-light border-input-border-light dark:bg-transparent dark:text-input-value-dark dark:border-input-border-dark "
      type={type || "text"}
      placeholder={placeholder || ""}
    />
  {/if}
</div>

<style lang="postcss">
  .sbui_input {
    font-family: inherit;
    transition: box-shadow 0.3s ease-in-out;
  }

  .not_padded {
    @apply pl-4;
  }

  .sbui_input--success {
    @apply border-brand-500;
  }

  .sbui_input--warning {
    @apply border-orange-500;
  }

  .sbui_input--danger {
    @apply border-red-500;
  }

  .sbui_input--info {
    @apply border-indigo-500;
  }

  .sbui_input--success:hover {
    @apply ring-brand-900;
  }

  .sbui_input--warning:hover {
    @apply ring-orange-900;
  }

  .sbui_input--danger:hover {
    @apply ring-red-900;
  }

  .sbui_input--info:hover {
    @apply ring-indigo-900;
  }

  .sbui-input--tiny {
    @apply text-xs;
  }
  .sbui-input--small {
    @apply text-sm leading-4;
  }
  .sbui-input--medium {
    @apply text-sm;
  }
  .sbui-input--large {
    @apply text-base;
  }
  .sbui-input--xlarge {
    @apply text-base;
  }
</style>
