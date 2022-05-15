<script>
  export let variant;
</script>

<span class="sbui-typography-text dark:text-typography-body-dark">
  {#if variant == "success"}
    <span class="sbui-typography-text-success dark:text-green-900">
      <slot />
    </span>
  {:else if variant == "warning"}
    <span class="sbui-typography-text-warning dark:text-yellow-900">
      <slot />
    </span>
  {:else if variant == "danger"}
    <span class="sbui-typography-text-danger dark:text-red-900">
      <slot />
    </span>
  {:else if variant == "disabled"}
    <span class="sbui-typography-text-disabled dark:text-gray-900">
      <slot />
    </span>
  {:else if variant == "secondary"}
    <span
      class="sbui-typography-text-secondary dark:text-typography-body-secondary-dark;
    "
    >
      <slot />
    </span>
  {:else if variant == "underline"}
    <span class="sbui-typography-text-underline">
      <slot />
    </span>
  {:else if variant == "mark"}
    <mark class="sbui-typography-text">
      <slot />
    </mark>
  {:else if variant == "code"}
    <code class="sbui-typography-text">
      <slot />
    </code>
  {:else if variant == "kbd"}
    <kbd class="sbui-typography-text">
      <slot />
    </kbd>
  {:else if variant == "strong"}
    <strong class="sbui-typography-text">
      <slot />
    </strong>
  {:else if variant == "strikethrough"}
    <span class="sbui-typography-text-strikethrough">
      <slot />
    </span>
  {:else if variant == "small"}
    <span class="sbui-typography-text-small">
      <slot />
    </span>
  {:else}
    <slot />
  {/if}
</span>

<style lang="postcss">
  .sbui-typography-text {
    @apply text-sm;
    @apply text-typography-body-light;
  }

  .sbui-typography-text-small {
    @apply text-xs;
  }

  .sbui-typography-text-secondary {
    @apply text-typography-body-secondary-light;
  }

  .sbui-typography-text-success {
    @apply text-green-900;
  }

  .sbui-typography-text-warning {
    @apply text-yellow-900;
  }

  .sbui-typography-text-danger {
    @apply text-red-900;
  }

  .sbui-typography-text-disabled {
    @apply text-gray-900;
    /* color: rgba(0,0,0,.25); */
    cursor: not-allowed;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .sbui-typography-text-underline {
    @apply underline;
  }

  .sbui-typography-text-strikethrough {
    @apply line-through;
  }

  .sbui-typography-text strong {
    @apply text-sm;
  }

  mark.sbui-typography-text {
    padding: 0;
    background-color: #ffe58f;
  }

  code.sbui-typography-text {
    /* margin: 0 .2em; */
    padding: 0.2em 0.4em 0.1em;
    /* font-size: 85%; */
    background: hsla(0, 0%, 58.8%, 0.1);
    border: 1px solid hsla(0, 0%, 39.2%, 0.2);
    border-radius: 3px;
  }

  kbd.sbui-typography-text {
    /* margin: 0 .2em; */
    padding: 0.15em 0.4em 0.1em;
    /* font-size: 90%; */
    background: hsla(0, 0%, 58.8%, 0.06);
    border: solid hsla(0, 0%, 39.2%, 0.2);
    border-width: 1px 1px 2px;
    border-radius: 3px;
  }
</style>
