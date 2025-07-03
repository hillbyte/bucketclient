<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { S3Item } from '$lib/services/s3.service';

  export let show = false;
  export let x = 0;
  export let y = 0;
  export let item: S3Item | null = null;
  export let selectedItems: Set<string> = new Set();

  const dispatch = createEventDispatcher();

  let menuElement: HTMLElement;

  // Adjust position if menu would go off screen
  $: positionX = x;
  $: positionY = y;

  onMount(() => {
    // Close menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (show && menuElement && !menuElement.contains(event.target as Node)) {
        closeMenu();
      }
    }

    // Close menu when pressing escape
    function handleEscape(event: KeyboardEvent) {
      if (show && event.key === 'Escape') {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  });

  function closeMenu() {
    show = false;
    dispatch('close');
  }

  function handleAction(action: string) {
    dispatch('action', { action, item, selectedItems });
    closeMenu();
  }

  // Determine if the menu should show certain actions based on item type and selection
  $: isSingleItem = selectedItems.size <= 1;
  $: isFolder = item?.type === 'folder';
  $: isFile = item?.type === 'file';
  $: multipleSelected = selectedItems.size > 1;
</script>

{#if show && item}
  <div
    bind:this={menuElement}
    class="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] max-w-[250px]"
    style="left: {positionX}px; top: {positionY}px;"
  >
    <ul>
      {#if isFile}
        <li>
          <button
            class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            on:click={() => handleAction('preview')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
        </li>
        <li>
          <button
            class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            on:click={() => handleAction('details')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Details
          </button>
        </li>
        <li>
          <button
            class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            on:click={() => handleAction('download')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </li>
        <li>
          <button
            class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            on:click={() => handleAction('share')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </li>
      {/if}

      {#if isFolder}
        <li>
          <button
            class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            on:click={() => handleAction('open')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            Open
          </button>
        </li>
        <li>
          <button
            class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            on:click={() => handleAction('details')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Details
          </button>
        </li>
      {/if}

      <li class="border-b dark:border-gray-700"></li>

      {#if isSingleItem}
        <li>
          <button
            class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            on:click={() => handleAction('rename')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>
        </li>
      {/if}

      <li>
        <button
          class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          on:click={() => handleAction('copy')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          {multipleSelected ? 'Copy Selected' : 'Copy'}
        </button>
      </li>

      <li>
        <button
          class="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          on:click={() => handleAction('move')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {multipleSelected ? 'Move Selected' : 'Move'}
        </button>
      </li>

      <li class="border-b dark:border-gray-700"></li>

      <li>
        <button
          class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
          on:click={() => handleAction('delete')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {multipleSelected ? 'Delete Selected' : 'Delete'}
        </button>
      </li>
    </ul>
  </div>
{/if}
