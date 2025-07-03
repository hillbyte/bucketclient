<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { currentPath, searchQuery, activeView, sidebarOpen, sortBy, sortDirection, mobileMenuOpen } from '$lib/store';
  import { createBreadcrumbs } from '$lib/utils/file-utils';

  const dispatch = createEventDispatcher();

  // Computed breadcrumbs from the current path
  $: breadcrumbs = createBreadcrumbs($currentPath);

  // Search input handler
  function handleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    searchQuery.set(input.value);
  }

  // Toggle view mode
  function toggleView() {
    activeView.update(view => (view === 'grid' ? 'list' : 'grid'));
  }

  // Toggle sidebar for mobile
  function toggleSidebar() {
    mobileMenuOpen.set(true);
    sidebarOpen.set(true);
  }

  // Navigate to a specific breadcrumb
  function navigateTo(path: string) {
    dispatch('navigate', path);
  }

  // Clear search
  function clearSearch() {
    searchQuery.set('');
  }

  // Sort handlers
  function setSortBy(field: 'name' | 'date' | 'size' | 'type') {
    if ($sortBy === field) {
      // Toggle sort direction if clicking the same field
      sortDirection.update(dir => dir === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending
      sortBy.set(field);
      sortDirection.set('asc');
    }
  }

  // Get active class for sort buttons
  function getSortButtonClass(field: 'name' | 'date' | 'size' | 'type') {
    return $sortBy === field
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'hover:bg-gray-100 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-700';
  }
</script>

<header class="bg-white dark:bg-slate-800 shadow-md border-b dark:border-slate-700 py-4 px-6 flex flex-col lg:flex-row gap-4 lg:items-center">
  <!-- Mobile menu button -->
  <button
    class="lg:hidden absolute left-4 top-4 text-neutral-700 dark:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
    on:click={toggleSidebar}
    aria-label="Open menu"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>

  <!-- Breadcrumbs -->
  <div class="ml-10 lg:ml-0 flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
    <nav class="flex" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-2">
        {#each breadcrumbs as crumb, i}
          <li class="inline-flex items-center">
            {#if i > 0}
              <svg class="w-4 h-4 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
            {/if}
            <button
              class="inline-flex items-center text-sm font-medium text-neutral-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
              on:click={() => navigateTo(crumb.path)}
              aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}
            >
              {#if i === 0}
                <div class="bg-primary/10 dark:bg-primary/20 p-1 rounded text-primary mr-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
              {/if}
              <span class={i === breadcrumbs.length - 1 ? 'font-semibold text-primary' : ''}>
                {crumb.name}
              </span>
            </button>
          </li>
        {/each}
      </ol>
    </nav>
  </div>

  <!-- Search and View Controls -->
  <div class="flex items-center gap-2">
    <div class="relative">
      <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
        </svg>
      </div>
      <input
        type="search"
        class="block w-full p-2 pl-10 pr-10 text-sm text-neutral-900 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary/50 focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-colors"
        placeholder="Search files..."
        value={$searchQuery}
        on:input={handleSearch}
      />
      {#if $searchQuery}
        <button
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          on:click={clearSearch}
          aria-label="Clear search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>

    <div class="hidden sm:flex items-center gap-1 ml-1">
      <button
        on:click={() => setSortBy('name')}
        class="text-xs py-1.5 px-2 rounded-lg border {getSortButtonClass('name')} transition-colors flex items-center gap-1"
        title="Sort by name"
      >
        Name
        {#if $sortBy === 'name'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={$sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        {/if}
      </button>
      <button
        on:click={() => setSortBy('type')}
        class="text-xs py-1.5 px-2 rounded-lg border {getSortButtonClass('type')} transition-colors flex items-center gap-1"
        title="Sort by type"
      >
        Type
        {#if $sortBy === 'type'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={$sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        {/if}
      </button>
    </div>

    <button
      on:click={toggleView}
      class="p-2 rounded-lg bg-white dark:bg-slate-700 text-neutral-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 transition-colors shadow-sm"
      title={$activeView === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
    >
      {#if $activeView === 'grid'}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      {/if}
    </button>
  </div>
</header>
