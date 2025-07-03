<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let sortBy: 'name' | 'date' | 'size' | 'type' = 'name';
  export let sortOrder: 'asc' | 'desc' = 'asc';

  const dispatch = createEventDispatcher();

  function toggleSortOrder() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    dispatch('change', { sortBy, sortOrder });
  }

  function changeSortBy(value: 'name' | 'date' | 'size' | 'type') {
    if (sortBy === value) {
      toggleSortOrder();
    } else {
      sortBy = value;
      sortOrder = 'asc';
      dispatch('change', { sortBy, sortOrder });
    }
  }
</script>

<div class="dropdown dropdown-end">
  <label tabindex="0" class="btn btn-ghost btn-sm rounded-lg px-3 py-2 flex items-center gap-2">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
    </svg>
    <span class="hidden md:inline">Sort by</span>
    {#if sortOrder === 'asc'}
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
      </svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    {/if}
  </label>
  <ul tabindex="0" class="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 dark:bg-gray-800 rounded-lg w-52 mt-1 border dark:border-gray-700">
    <li>
      <button
        class="flex items-center justify-between {sortBy === 'name' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : ''}"
        on:click={() => changeSortBy('name')}
      >
        <span>Name</span>
        {#if sortBy === 'name'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {/if}
      </button>
    </li>
    <li>
      <button
        class="flex items-center justify-between {sortBy === 'date' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : ''}"
        on:click={() => changeSortBy('date')}
      >
        <span>Date Modified</span>
        {#if sortBy === 'date'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {/if}
      </button>
    </li>
    <li>
      <button
        class="flex items-center justify-between {sortBy === 'size' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : ''}"
        on:click={() => changeSortBy('size')}
      >
        <span>Size</span>
        {#if sortBy === 'size'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {/if}
      </button>
    </li>
    <li>
      <button
        class="flex items-center justify-between {sortBy === 'type' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : ''}"
        on:click={() => changeSortBy('type')}
      >
        <span>Type</span>
        {#if sortBy === 'type'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {/if}
      </button>
    </li>
    <div class="divider my-1"></div>
    <li>
      <button
        class="flex items-center justify-between {sortOrder === 'asc' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : ''}"
        on:click={toggleSortOrder}
      >
        <span>Ascending</span>
        {#if sortOrder === 'asc'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {/if}
      </button>
    </li>
    <li>
      <button
        class="flex items-center justify-between {sortOrder === 'desc' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : ''}"
        on:click={toggleSortOrder}
      >
        <span>Descending</span>
        {#if sortOrder === 'desc'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {/if}
      </button>
    </li>
  </ul>
</div>
