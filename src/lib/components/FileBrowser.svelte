<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { filteredItems, activeView, selectedItems, isLoading, currentPath, searchQuery } from '$lib/store';
  import { formatFileSize, formatDate, getFileTypeIcon } from '$lib/utils/file-utils';
  import type { S3Item } from '$lib/services/s3.service';

  const dispatch = createEventDispatcher();

  // State for drag-and-drop
  let isDragging = false;
  let dragCounter = 0;
  let containerRef: HTMLElement;

  onMount(() => {
    // Setup drag and drop handlers for the container
    if (containerRef) {
      containerRef.addEventListener('dragenter', handleDragEnter);
      containerRef.addEventListener('dragleave', handleDragLeave);
      containerRef.addEventListener('dragover', handleDragOver);
      containerRef.addEventListener('drop', handleDrop);

      return () => {
        containerRef.removeEventListener('dragenter', handleDragEnter);
        containerRef.removeEventListener('dragleave', handleDragLeave);
        containerRef.removeEventListener('dragover', handleDragOver);
        containerRef.removeEventListener('drop', handleDrop);
      };
    }
  });

  // File upload handlers for drag & drop
  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      isDragging = true;
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      isDragging = false;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    dragCounter = 0;

    if (e.dataTransfer?.files?.length) {
      // Trigger upload modal with the dropped files
      dispatch('drop', {
        files: e.dataTransfer.files,
        path: $currentPath
      });
    }
  }

  // Handlers
  function handleItemClick(item: S3Item, event: MouseEvent) {
    // Check if ctrl/cmd key is pressed for multi-select
    if (event.ctrlKey || event.metaKey) {
      toggleItemSelection(item);
      return;
    } else if (event.shiftKey && $selectedItems.size > 0) {
      // Shift key for range selection
      const itemsList = $filteredItems;
      const lastSelectedIndex = Array.from($selectedItems).length > 0
        ? itemsList.findIndex(i => Array.from($selectedItems).includes(i.key))
        : -1;
      const currentIndex = itemsList.findIndex(i => i.key === item.key);

      if (lastSelectedIndex !== -1 && currentIndex !== -1) {
        const startIdx = Math.min(lastSelectedIndex, currentIndex);
        const endIdx = Math.max(lastSelectedIndex, currentIndex);

        const newSelection = new Set<string>($selectedItems);
        for (let i = startIdx; i <= endIdx; i++) {
          newSelection.add(itemsList[i].key);
        }

        selectedItems.set(newSelection);
        return;
      }
    }

    // Regular click
    if (item.type === 'folder') {
      dispatch('navigate', item.key);
    } else {
      // Single click on file just selects it
      selectedItems.set(new Set([item.key]));
    }
  }

  function handleItemDoubleClick(item: S3Item) {
    if (item.type === 'folder') {
      dispatch('navigate', item.key);
    } else {
      dispatch('preview', item);
    }
  }

  function toggleItemSelection(item: S3Item) {
    selectedItems.update(items => {
      const newItems = new Set(items);
      if (newItems.has(item.key)) {
        newItems.delete(item.key);
      } else {
        newItems.add(item.key);
      }
      return newItems;
    });
  }

  function isSelected(key: string): boolean {
    return $selectedItems.has(key);
  }

  function handleContextMenu(event: MouseEvent, item: S3Item) {
    event.preventDefault();

    // If the item is not already selected, clear selection and select just this item
    if (!isSelected(item.key)) {
      selectedItems.set(new Set([item.key]));
    }

    dispatch('contextmenu', {
      item,
      x: event.clientX,
      y: event.clientY
    });
  }

  // Handle keyboard shortcuts for selection
  function handleKeydown(event: KeyboardEvent) {
    // Only handle if we're focused on the file browser
    if (document.activeElement !== containerRef) return;

    if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
      // Select all
      event.preventDefault();
      const keys = $filteredItems.map(item => item.key);
      selectedItems.set(new Set(keys));
    } else if (event.key === 'Escape') {
      // Clear selection
      event.preventDefault();
      selectedItems.set(new Set());
    }
  }
</script>

<div
  class="w-full h-full bg-base-100 dark:bg-slate-800 overflow-auto relative"
  bind:this={containerRef}
  on:keydown={handleKeydown}
  tabindex="0"
>
  <!-- Drag overlay -->
  {#if isDragging}
    <div class="absolute inset-0 bg-primary/10 dark:bg-primary/20 border-2 border-dashed border-primary flex items-center justify-center z-10">
      <div class="bg-white dark:bg-slate-700 p-6 rounded-xl shadow-lg text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 class="text-xl font-bold text-neutral-800 dark:text-white mb-1">Drop to Upload</h3>
        <p class="text-neutral-600 dark:text-gray-300">Drop your files here to upload to this folder</p>
      </div>
    </div>
  {/if}

  <!-- Main content -->
  {#if $isLoading}
    <div class="flex justify-center items-center h-64">
      <div class="flex flex-col items-center">
        <div class="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
        <p class="mt-4 text-neutral-600 dark:text-gray-300">Loading content...</p>
      </div>
    </div>
  {:else if $filteredItems.length === 0}
    <div class="flex flex-col justify-center items-center h-64 text-neutral-500 dark:text-gray-400 p-4">
      {#if $searchQuery}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p class="text-lg font-medium">No items match your search</p>
        <p class="text-sm mt-2">Try using different keywords or clear your search</p>
        <button
          class="mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium"
          on:click={() => searchQuery.set('')}
        >
          Clear Search
        </button>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
        <p class="text-lg font-medium">This folder is empty</p>
        <p class="text-sm mt-2">Upload files or create a new folder to get started</p>
      {/if}
    </div>
  {:else}
    {#if $activeView === 'grid'}
      <!-- Grid View -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-6 animate-fadeIn">
        {#each $filteredItems as item (item.key)}
          <div
            class="file-card {item.type === 'folder' ? 'folder-card' : ''} {isSelected(item.key) ? 'selected' : ''}"
            data-item-key={item.key}
            on:click={(e) => handleItemClick(item, e)}
            on:dblclick={() => handleItemDoubleClick(item)}
            on:contextmenu={(e) => handleContextMenu(e, item)}
          >
            <div class="absolute top-2 right-2 z-10">
              <input
                type="checkbox"
                class="h-4 w-4 accent-primary cursor-pointer opacity-0 group-hover:opacity-100 {isSelected(item.key) ? '!opacity-100' : ''}"
                checked={isSelected(item.key)}
                on:click={(e) => {
                  e.stopPropagation();
                  toggleItemSelection(item);
                }}
              />
            </div>

            <div class="flex flex-col items-center p-4">
              <div class="text-4xl mb-3 {item.type === 'folder' ? 'text-primary' : 'text-neutral-600 dark:text-gray-300'}">
                {#if item.type === 'folder'}
                  <div class="bg-primary/10 dark:bg-primary/20 p-3 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                {:else}
                  {#if getFileTypeIcon(item.name, item.contentType) === 'image' && item.url}
                    <div class="h-16 w-16 bg-gray-100 dark:bg-slate-600 rounded-xl flex items-center justify-center overflow-hidden">
                      <img src={item.url} alt={item.name} class="max-h-full max-w-full object-contain" />
                    </div>
                  {:else if getFileTypeIcon(item.name, item.contentType) === 'file-pdf'}
                    <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  {:else if getFileTypeIcon(item.name, item.contentType) === 'video'}
                    <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  {:else if getFileTypeIcon(item.name, item.contentType) === 'music'}
                    <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  {:else if getFileTypeIcon(item.name, item.contentType) === 'code'}
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                  {:else}
                    <div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  {/if}
                {/if}
              </div>
              <div class="mt-2 text-center w-full">
                <p class="text-sm font-medium text-neutral-700 dark:text-gray-200 truncate max-w-full px-2" title={item.name}>
                  {item.name}
                </p>
                {#if item.type === 'file'}
                  <p class="text-xs text-neutral-500 dark:text-gray-400 mt-1">
                    {formatFileSize(item.size)}
                  </p>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List View -->
      <div class="w-full overflow-x-auto p-6 animate-fadeIn">
        <table class="w-full text-sm text-left border-collapse">
          <thead class="text-xs uppercase bg-gray-50 dark:bg-slate-700/50 sticky top-0 z-10">
            <tr>
              <th class="w-8 p-4">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-primary cursor-pointer rounded border-gray-300 dark:border-gray-600"
                  checked={$selectedItems.size > 0 && $selectedItems.size === $filteredItems.length}
                  on:click={() => {
                    if ($selectedItems.size === $filteredItems.length) {
                      selectedItems.set(new Set());
                    } else {
                      const keys = $filteredItems.map(item => item.key);
                      selectedItems.set(new Set(keys));
                    }
                  }}
                />
              </th>
              <th class="p-4 font-medium">Name</th>
              <th class="p-4 font-medium">Size</th>
              <th class="p-4 font-medium">Modified</th>
              <th class="p-4 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {#each $filteredItems as item (item.key)}
              <tr
                class="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors {isSelected(item.key) ? 'bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20' : ''}"
                data-item-key={item.key}
                on:click={(e) => handleItemClick(item, e)}
                on:dblclick={() => handleItemDoubleClick(item)}
                on:contextmenu={(e) => handleContextMenu(e, item)}
              >
                <td class="w-10 p-4">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-primary cursor-pointer rounded border-gray-300 dark:border-gray-600"
                    checked={isSelected(item.key)}
                    on:click={(e) => {
                      e.stopPropagation();
                      toggleItemSelection(item);
                    }}
                  />
                </td>
                <td class="p-4 flex items-center">
                  <div class="{item.type === 'folder' ? 'text-primary bg-primary/10 dark:bg-primary/20' : 'text-neutral-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700'} p-2 rounded-lg mr-3">
                    {#if item.type === 'folder'}
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    {/if}
                  </div>
                  <span class="font-medium text-neutral-700 dark:text-white">{item.name}</span>
                </td>
                <td class="p-4 text-neutral-500 dark:text-gray-400">
                  {item.type === 'folder' ? '--' : formatFileSize(item.size)}
                </td>
                <td class="p-4 text-neutral-500 dark:text-gray-400">
                  {item.lastModified ? formatDate(item.lastModified) : '--'}
                </td>
                <td class="p-4 text-neutral-500 dark:text-gray-400">
                  {item.type === 'folder' ? 'Folder' : item.name.split('.').pop()?.toUpperCase() || 'File'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
