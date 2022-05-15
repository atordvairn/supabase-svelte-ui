<script>
  export let id = "default",
    name = "default",
    checked,
    value,
    onChange,
    onFocus,
    onBlur,
    size = "medium",
    disabled = false;
</script>

<div class="sbui-checkbox-container--{size} flex cursor-pointer">
  <input
    on:blur={onBlur}
    {disabled}
    {value}
    {name}
    {id}
    {checked}
    on:focus={onFocus}
    on:change={onChange}
    type="checkbox"
    class="sbui-checkbox ml-auto mr-auto mt-1 border border-solid rounded text-brand-700 border-gray-300 transition-all hover:border-brand-500 focus:ring-brand-500 focus:outline-nonedark:bg-transparent dark:border-dark-400 dark:text-white dark:hover:border-brand-500"
  />
  <div>
    <label
      for={id}
      class="sbui-checkbox__label-container__label label__cont flex flex-col gap1.5 ml-1"
    >
      <div
        class="sbui-checkbox__label-container__label__div text-md text-black dark:text-white"
      >
        <slot name="label" />
      </div>
      <div
        class="sbui-checkbox__label-container__label__p text-sm text-blackA-900 dark:text-whiteA-1000"
      >
        <slot name="description" />
      </div>
    </label>
  </div>
</div>

<style lang="postcss">
  .sbui-checkbox[type="checkbox"] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    padding: 0;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
    display: inline-block;
    vertical-align: middle;
    background-origin: border-box;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    flex-shrink: 0;
    width: 1rem;
    color: #2563eb;
    background-color: #fff;
    border-color: #6b7280;
    border-width: 1px;
  }

  .sbui-checkbox[type="checkbox"]:checked {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
  }

  .sbui-checkbox[type="checkbox"]:checked {
    @apply bg-brand-700;
    border-color: transparent;
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
  }

  .sbui-checkbox-container--tiny .sbui-checkbox__label-container__label,
  .sbui-checkbox-container--tiny .sbui-checkbox__label-container__label__div,
  .sbui-checkbox-container--tiny .sbui-checkbox__label-container__label__p {
    @apply text-xs;
  }
  .sbui-checkbox-container--small .sbui-checkbox__label-container__label,
  .sbui-checkbox-container--small .sbui-checkbox__label-container__label__div,
  .sbui-checkbox-container--small .sbui-checkbox__label-container__label__p {
    @apply text-sm;
  }
  .sbui-checkbox-container--medium .sbui-checkbox__label-container__label,
  .sbui-checkbox-container--medium .sbui-checkbox__label-container__label__div,
  .sbui-checkbox-container--medium .sbui-checkbox__label-container__label__p {
    @apply text-sm;
  }
  .sbui-checkbox-container--large .sbui-checkbox__label-container__label,
  .sbui-checkbox-container--large .sbui-checkbox__label-container__label__div,
  .sbui-checkbox-container--large .sbui-checkbox__label-container__label__p {
    @apply text-base;
  }
  .sbui-checkbox-container--xlarge .sbui-checkbox__label-container__label,
  .sbui-checkbox-container--xlarge .sbui-checkbox__label-container__label__div,
  .sbui-checkbox-container--xlarge .sbui-checkbox__label-container__label__p {
    @apply text-base;
  }

  .sbui-checkbox-container--tiny .sbui-checkbox {
    @apply mt-1 mr-3;
  }
  .sbui-checkbox-container--medium,
  .sbui-checkbox {
    @apply mt-0.5 mr-3.5;
  }
  .sbui-checkbox-container--large .sbui-checkbox {
    @apply mt-0.5 mr-4;
  }
  .sbui-checkbox-container--xlarge .sbui-checkbox {
    @apply mt-0.5 mr-4;
  }
</style>
