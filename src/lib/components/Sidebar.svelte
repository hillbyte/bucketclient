<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { sidebarOpen, theme, applyTheme, activeView, sortBy, sortDirection } from '$lib/store';
  import { isConnected, s3Config, disconnect } from '$lib/services/s3.service';

  const dispatch = createEventDispatcher();

  // Theme toggle
  function toggleTheme() {
    theme.update(current => {
      const newTheme = current === 'light' ? 'dark' : 'light';
      return newTheme;
    });
    applyTheme();
  }

  function handleDisconnect() {
    disconnect();
    dispatch('disconnect');
  }

  // For mobile menu
  function toggleSidebar() {
    sidebarOpen.update(value => !value);
  }

  // Toggle view (grid/list)
  function toggleView() {
    activeView.update(view => view === 'grid' ? 'list' : 'grid');
  }

  // Sort functions
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

  let bucketName: string = '';
  let endpoint: string = '';
  let region: string = '';

  // Subscribe to the s3Config store to display connection info
  $: {
    if ($s3Config) {
      bucketName = $s3Config.bucketName;
      endpoint = $s3Config.endpoint;
      region = $s3Config.region;
    }
  }
</script>

<aside class="h-full bg-white dark:bg-slate-800 shadow-lg flex flex-col transition-all duration-300 {$sidebarOpen ? 'w-64' : 'w-20'} relative z-10 border-r border-gray-100 dark:border-slate-700">
  <!-- Mobile close button -->
  <button class="lg:hidden absolute top-2 right-2 text-neutral dark:text-base-100 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" on:click={toggleSidebar}>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>

  <!-- Logo and app name -->
  <div class="p-4 flex items-center justify-center lg:justify-start border-b dark:border-slate-700">
    <div class="flex-shrink-0 bg-primary text-white p-2 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    </div>
    {#if $sidebarOpen}
      <div class="ml-3 text-xl font-bold text-neutral-800 dark:text-white">BucketClient</div>
    {/if}
  </div>

  <!-- Main navigation -->
  <nav class="flex-1 pt-4 pb-4 overflow-y-auto">
    <div class="px-4 mb-8">
      {#if $isConnected && $s3Config}
        <div class="bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-xl p-4 mb-4 border border-primary/20 dark:border-primary/30 shadow-sm">
          {#if $sidebarOpen}
            <div class="text-sm font-medium text-primary mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
              </svg>
              <span>Connected to:</span>
            </div>
            <div class="bg-white/50 dark:bg-slate-800/50 rounded-lg p-2 mb-2">
              <div class="text-sm mb-1 truncate" title={bucketName}>
                <span class="font-semibold text-neutral-800 dark:text-white">Bucket:</span>
                <span class="text-neutral-600 dark:text-gray-300">{bucketName}</span>
              </div>
              <div class="text-sm mb-1 truncate" title={endpoint}>
                <span class="font-semibold text-neutral-800 dark:text-white">Endpoint:</span>
                <span class="text-neutral-600 dark:text-gray-300">{endpoint}</span>
              </div>
              <div class="text-sm truncate" title={region}>
                <span class="font-semibold text-neutral-800 dark:text-white">Region:</span>
                <span class="text-neutral-600 dark:text-gray-300">{region}</span>
              </div>
            </div>
            <button
              on:click={handleDisconnect}
              class="mt-2 w-full bg-white dark:bg-slate-700 text-neutral-700 dark:text-white py-2 px-3 rounded-lg text-sm font-medium transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-slate-600 flex items-center justify-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Disconnect
            </button>
          {:else}
            <div class="flex flex-col items-center">
              <div class="text-primary text-xs mb-2 font-medium">Connected</div>
              <div class="text-xs text-center text-neutral-600 dark:text-gray-400 mb-2 truncate w-full" title={bucketName}>
                {bucketName}
              </div>
              <button
                on:click={handleDisconnect}
                class="bg-white dark:bg-slate-700 text-red-500 p-2 rounded-lg text-xs shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-slate-600 transition-all"
                title="Disconnect"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <div class="text-center text-sm text-neutral-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
          {#if $sidebarOpen}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Not connected to any S3 bucket
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          {/if}
        </div>
      {/if}
    </div>

    <ul class="space-y-1">
      <li>
        <a
          href="/"
          class="flex items-center px-4 py-2.5 text-neutral-700 dark:text-gray-200 hover:bg-primary/10 rounded-lg mx-2 transition-all hover:translate-x-1"
        >
          <div class="bg-primary/10 dark:bg-primary/20 p-1.5 rounded text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          {#if $sidebarOpen}
            <span class="ml-3 font-medium">Home</span>
          {/if}
        </a>
      </li>
      <li>
        <button
          on:click={() => dispatch('openUpload')}
          class="w-full flex items-center px-4 py-2.5 text-neutral-700 dark:text-gray-200 hover:bg-primary/10 rounded-lg mx-2 transition-all hover:translate-x-1"
        >
          <div class="bg-secondary/10 dark:bg-secondary/20 p-1.5 rounded text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
          </div>
          {#if $sidebarOpen}
            <span class="ml-3 font-medium">Upload</span>
          {/if}
        </button>
      </li>
      <li>
        <button
          on:click={() => dispatch('newFolder')}
          class="w-full flex items-center px-4 py-2.5 text-neutral-700 dark:text-gray-200 hover:bg-primary/10 rounded-lg mx-2 transition-all hover:translate-x-1"
        >
          <div class="bg-accent/10 dark:bg-accent/20 p-1.5 rounded text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          {#if $sidebarOpen}
            <span class="ml-3 font-medium">New Folder</span>
          {/if}
        </button>
      </li>

      <!-- Display options section -->
      {#if $sidebarOpen}
        <li class="px-6 py-3 text-xs font-semibold text-neutral-500 dark:text-gray-400 uppercase tracking-wider">
          Display Options
        </li>
      {:else}
        <li class="my-3 border-t border-gray-200 dark:border-slate-700"></li>
      {/if}

      <li>
        <button
          on:click={toggleView}
          class="w-full flex items-center px-4 py-2.5 text-neutral-700 dark:text-gray-200 hover:bg-primary/10 rounded-lg mx-2 transition-all hover:translate-x-1"
        >
          <div class="bg-info/10 dark:bg-info/20 p-1.5 rounded text-info">
            {#if $activeView === 'grid'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            {/if}
          </div>
          {#if $sidebarOpen}
            <span class="ml-3 font-medium">Toggle View</span>
          {/if}
        </button>
      </li>

      <!-- Sorting options -->
      {#if $sidebarOpen}
        <li class="mt-2">
          <div class="px-6 text-xs font-medium text-neutral-500 dark:text-gray-400 mb-1">Sort By:</div>
          <div class="px-6 grid grid-cols-2 gap-1">
            <button
              class="text-xs py-1 px-2 rounded text-left {$sortBy === 'name' ? 'bg-primary/20 text-primary' : 'text-neutral-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}"
              on:click={() => setSortBy('name')}
            >
              Name {$sortBy === 'name' ? ($sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              class="text-xs py-1 px-2 rounded text-left {$sortBy === 'date' ? 'bg-primary/20 text-primary' : 'text-neutral-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}"
              on:click={() => setSortBy('date')}
            >
              Date {$sortBy === 'date' ? ($sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              on:click={() => setSortBy('size')}
              class="text-xs py-1 px-2 rounded text-left {$sortBy === 'size' ? 'bg-primary/20 text-primary' : 'text-neutral-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}"
            >
              Size {$sortBy === 'size' ? ($sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              on:click={() => setSortBy('type')}
              class="text-xs py-1 px-2 rounded text-left {$sortBy === 'type' ? 'bg-primary/20 text-primary' : 'text-neutral-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}"
            >
              Type {$sortBy === 'type' ? ($sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
          </div>
        </li>
      {/if}
  </ul>
  </nav>

  <!-- Footer with theme toggle -->
  <div class="p-4 border-t dark:border-slate-700 flex justify-center">
    <button
      on:click={toggleTheme}
      class="p-2 rounded-full bg-base-100 dark:bg-slate-700 text-neutral-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors shadow-sm"
      title="Toggle theme"
    >
      {#if $theme === 'dark'}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      {/if}
    </button>
  </div>
</aside>
