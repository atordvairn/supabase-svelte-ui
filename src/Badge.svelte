<script>
  export let variant;
  export let closable;
  export let large;
  import { XIcon } from "svelte-feather-icons";
  let visible = true;
  let styles =
    "inline-flex gap-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

  if (large == true) {
    styles += " px-3 py-0.5 rounded-full text-sm";
  }
</script>

{#if visible}
  {#if variant == "success"}
    <span class="bg-green-300 text-green-1000 {styles}">
      <slot />
      {#if closable == true}
        <span
          on:click={() => {
            visible = false;
          }}
          class="rounded transition duration-200 ease-out hover:bg-green-400"
        >
          <XIcon size="13" />
        </span>
      {/if}
    </span>
  {:else if variant == "danger"}
    <span class="{styles} bg-red-300 text-red-1000">
      <slot />
      {#if closable == true}
        <span
          on:click={() => {
            visible = false;
          }}
          class="rounded transition duration-200 ease-out hover:bg-green-400"
        >
          <XIcon size="13" />
        </span>
      {/if}
    </span>
  {:else if variant == "warning"}
    <span class="{styles} bg-orange-300 text-orange-1000">
      <slot />
      {#if closable == true}
        <span
          on:click={() => {
            visible = false;
          }}
          class="rounded transition duration-200 ease-out hover:bg-green-400"
        >
          <XIcon size="13" />
        </span>
      {/if}
    </span>
  {:else if variant == "info"}
    <span class="{styles} bg-indigo-300 text-indigo-1000">
      <slot />
      {#if closable == true}
        <span
          on:click={() => {
            visible = false;
          }}
          class="rounded transition duration-200 ease-out hover:bg-green-400"
        >
          <XIcon size="13" />
        </span>
      {/if}
    </span>
  {:else}
    <span class="{styles} bg-black bg-opacity-10">
      <slot />
      {#if closable == true}
        <span
          on:click={() => {
            visible = false;
          }}
          class="rounded transition duration-200 ease-out hover:bg-green-400"
        >
          <XIcon size="13" />
        </span>
      {/if}
    </span>
  {/if}
{/if}
