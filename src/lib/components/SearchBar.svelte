<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value = '';
  export let placeholder = 'Search files and folders...';

  const dispatch = createEventDispatcher();

  function handleInput(e: Event) {
    dispatch('input', value);
  }

  function clearSearch() {
    value = '';
    dispatch('input', value);
  }
</script>

<div class="relative">
  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
    </svg>
  </div>

  <input
    type="text"
    bind:value
    on:input={handleInput}
    class="bg-white dark:bg-gray-700 pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-700 dark:text-white"
    {placeholder}
  />

  {#if value}
    <button
      class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
      on:click={clearSearch}
      aria-label="Clear search"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
    </button>
  {/if}
</div>
