<script>
  export let theme;
</script>

<div class={theme}>
  <slot />
</div>
{#if theme == "dark"}
  <style lang="postcss">
    @import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap");
    body,
    html {
      font-family: "Montserrat", sans-serif;
      @apply bg-dark-700 text-white;
    }
  </style>
{/if}
