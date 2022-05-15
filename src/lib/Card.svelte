<script>
  export let hoverable;
  let hoverClass;

  if (hoverable == true) {
    hoverClass = "transition transform hover:-translate-y-1 hover:shadow-2xl";
  }
</script>

<div
  class="sbui-card {hoverClass} flex flex-col bg-white dark:bg-dark-700 rounded-md shadow-lg overflow-hidden relative"
>
  <div class="sbui-card-head flex">
    <slot name="title" />
    <span class="ml-auto mr-2 text-green-900">
      <slot name="more-title" />
    </span>
  </div>
  <div class="sbui-card-content">
    <div class="flex items-center mb-3 justify-center">
      <slot name="image" />
    </div>
    <slot name="description" />
  </div>
  <div class="sbui-card-actions p-8 pt-0">
    <slot name="actions" />
  </div>
</div>

<style lang="postcss">
  .sbui-card {
    border: 1px solid #e0e0e0;
  }

  .dark .sbui-card {
    border: 1px solid #2a2a2a;
  }

  .sbui-card-head {
    @apply px-8 py-6 flex justify-between;

    border-bottom: 1px solid #e0e0e0;
  }

  .dark .sbui-card-head {
    border-bottom: 1px solid #2a2a2a;
  }

  .sbui-card-content {
    @apply p-8;
  }
</style>
