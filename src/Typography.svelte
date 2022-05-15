<script>
  export let variant;
</script>

<span class="text-gray-900">
  {#if variant == "h1"}
    <h1 class="sbui-typography-title">
      <slot />
    </h1>
  {:else if variant == "h2"}
    <h2 class="sbui-typography-title">
      <slot />
    </h2>
  {:else if variant == "h3"}
    <h3 class="sbui-typography-title">
      <slot />
    </h3>
  {:else if variant == "h4"}
    <h4 class="sbui-typography-title">
      <slot />
    </h4>
  {:else if variant == "h5"}
    <h5 class="sbui-typography-title">
      <slot />
    </h5>
  {/if}
</span>

<style lang="postcss">
  h1.sbui-typography-title {
    @apply text-5xl;
  }

  h2.sbui-typography-title {
    @apply text-4xl;
  }

  h3.sbui-typography-title {
    @apply text-2xl;
  }

  h4.sbui-typography-title {
    @apply text-lg;
  }

  h5.sbui-typography-title {
    @apply text-base;
  }
</style>
