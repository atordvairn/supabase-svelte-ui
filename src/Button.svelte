<script>
  export let style,
    disabled,
    variant,
    size,
    onClick,
    onFocus,
    onDblClick,
    onBlur;
</script>

<span class="button-cont inline-flex font-medium">
  {#if variant == "warning"}
    <button
      {disabled}
      {style}
      on:click={onClick}
      on:focus={onFocus}
      on:blur={onBlur}
      on:dblclick={onDblClick}
      class="primary flex gap-2 sbui-btn--{size ||
        'tiny'} text-sm text-white bg-orange-800 hover:bg-orange-600 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid border-transparent transition ease-out duration-200 outline-none focus:outline-none"
    >
      <slot />
    </button>
  {:else if variant == "danger"}
    <button
      {disabled}
      {style}
      on:click={onClick}
      on:focus={onFocus}
      on:blur={onBlur}
      on:dblclick={onDblClick}
      class="primary flex gap-2 sbui-btn--{size ||
        'tiny'} text-sm bg-red-900 hover:bg-red-800 hover:border-red-600 text-white border-red-500 text-red-500 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid transition ease-out duration-200 focus:outline-none"
    >
      <slot />
    </button>
  {:else}
    <button
      {disabled}
      {style}
      on:click={onClick}
      on:focus={onFocus}
      on:blur={onBlur}
      on:dblclick={onDblClick}
      class="primary flex gap-2 sbui-btn--{size ||
        'tiny'} text-sm text-white bg-brand-800 hover:bg-brand-600 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid border-transparent transition ease-out duration-200 outline-none focus:outline-none"
    >
      <slot />
    </button>
  {/if}
</span>

<style lang="postcss">
  .primary {
    text-shadow: 0px 0px 4px rgba(38 111 78 / 50%);
    font-family: inherit;
    font-weight: inherit;
    @apply rounded-md p-1;
  }
  .sbui-btn--tiny {
    @apply px-2.5 py-1.5 text-xs;
  }
  .sbui-btn--small {
    @apply px-3 py-2 text-sm leading-4;
  }
  .sbui-btn--medium {
    @apply px-4 py-2 text-sm;
  }
  .sbui-btn--large {
    @apply px-4 py-2 text-base;
  }
  .sbui-btn--xlarge {
    @apply px-6 py-3 text-base;
  }
</style>
