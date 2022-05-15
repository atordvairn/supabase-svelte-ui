<script>
  export let variant;
  export let closable;
  export let withIcon;
  import {
    XIcon,
    CheckIcon,
    XCircleIcon,
    InfoIcon,
    AlertTriangleIcon,
  } from "svelte-feather-icons";
  let visible = true;

  let titleSize = "text-xl";
</script>

{#if visible == true}
  {#if variant == "success"}
    <div class="rounded-md p-4 bg-green-300 text-green-1000">
      <span class="flex">
        {#if withIcon == true}
          <div class="w-1/12">
            <CheckIcon />
          </div>
        {/if}
        <div class="w-10/12 flex flex-col gap-1">
          <span class="m-0 {titleSize} font-medium">
            <slot name="title" />
          </span>
          <span class="mt-2 text-sm text-green-900">
            <slot name="description" />
          </span>
        </div>
        {#if closable == true}
          <div class="ml-auto w-15">
            <span
              on:click={() => {
                visible = false;
              }}
              class="ml-auto text-brand-900 hover:bg-green-600 hover:bg-opacity-10 cursor-pointer inline-flex transition ease-in-out duration-200 bg-transparent border-transparent rounded-md p-1 focus:outline-none"
            >
              <XIcon size="24" />
            </span>
          </div>
        {/if}
      </span>
    </div>
  {:else if variant == "danger"}
    <div class="rounded-md p-4 bg-red-400 text-red-600">
      <span class="flex">
        {#if withIcon == true}
          <div class="w-1/12 text-red-800">
            <XCircleIcon />
          </div>
        {/if}
        <div class="w-10/12 flex flex-col gap-1.5">
          <span class="m-0 {titleSize} font-medium text-red-1000">
            <slot name="title" />
          </span>
          <span class="mt-2 text-sm text-red-900">
            <slot name="description" />
          </span>
        </div>
        {#if closable == true}
          <div class="ml-auto w-15">
            <span
              on:click={() => {
                visible = false;
              }}
              class="text-red-800 hover:bg-red-600 hover:bg-opacity-10 cursor-pointer inline-flex transition ease-in-out duration-200 bg-transparent border-transparent rounded-md p-1 focus:outline-none"
            >
              <XIcon size="24" />
            </span>
          </div>
        {/if}
      </span>
    </div>
  {:else if variant == "info"}
    <div class="rounded-md p-4 bg-indigo-400 text-indigo-600">
      <span class="flex">
        {#if withIcon == true}
          <div class="w-1/12 text-indigo-800">
            <InfoIcon />
          </div>
        {/if}
        <div class="w-10/12 flex flex-col gap-1.5">
          <span class="m-0 {titleSize} font-medium text-indigo-1000">
            <slot name="title" />
          </span>
          <span class="mt-2 text-sm text-indigo-900">
            <slot name="description" />
          </span>
        </div>
        {#if closable == true}
          <div class="ml-auto w-15">
            <span
              on:click={() => {
                visible = false;
              }}
              class="text-indigo-800 hover:bg-indigo-600 hover:bg-opacity-10 cursor-pointer inline-flex transition ease-in-out duration-200 bg-transparent border-transparent rounded-md p-1 focus:outline-none"
            >
              <XIcon size="24" />
            </span>
          </div>
        {/if}
      </span>
    </div>
  {:else if variant == "warning"}
    <div class="rounded-md p-4 bg-orange-300 text-orange-600">
      <span class="flex">
        {#if withIcon == true}
          <div class="w-1/12 text-orange-1000">
            <AlertTriangleIcon />
          </div>
        {/if}
        <div class="w-10/12 flex flex-col gap-1.5">
          <span class="m-0 {titleSize} font-medium text-orange-1000">
            <slot name="title" />
          </span>
          <span class="mt-2 text-sm text-orange-900">
            <slot name="description" />
          </span>
        </div>
        {#if closable == true}
          <div class="ml-auto w-15">
            <span
              on:click={() => {
                visible = false;
              }}
              class="text-orange-800 hover:bg-orange-600 hover:bg-opacity-10 cursor-pointer inline-flex transition ease-in-out duration-200 bg-transparent border-transparent rounded-md p-1 focus:outline-none"
            >
              <XIcon size="24" />
            </span>
          </div>
        {/if}
      </span>
    </div>
  {/if}
{/if}
