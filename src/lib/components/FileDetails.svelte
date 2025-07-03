<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatFileSize, formatDate } from '$lib/utils/file-utils';
  import type { S3Item } from '$lib/services/s3.service';

  export let item: S3Item | null = null;
  export let show = false;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function stopPropagation(event: Event) {
    event.stopPropagation();
  }

  function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || '';
  }

  function getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'Image';
    }

    // Document files
    if (['pdf'].includes(extension)) {
      return 'PDF Document';
    }
    if (['doc', 'docx'].includes(extension)) {
      return 'Word Document';
    }
    if (['xls', 'xlsx'].includes(extension)) {
      return 'Excel Spreadsheet';
    }
    if (['ppt', 'pptx'].includes(extension)) {
      return 'PowerPoint Presentation';
    }
    if (['txt', 'rtf'].includes(extension)) {
      return 'Text Document';
    }

    // Media files
    if (['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv'].includes(extension)) {
      return 'Video';
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
      return 'Audio';
    }

    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return 'Archive';
    }

    // Code files
    if (['js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp', 'go', 'php', 'rb'].includes(extension)) {
      return 'Code';
    }

    // Default type
    return 'File';
  }
</script>

{#if show && item}
  <div
    class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn"
    on:click={close}
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full animate-scaleIn p-0 overflow-hidden"
      on:click={stopPropagation}
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 class="text-lg font-semibold text-neutral-800 dark:text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          File Details
        </h2>
        <button
          on:click={close}
          class="p-1 rounded-full text-neutral-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-4">
        <div class="flex items-start mb-4">
          <div class="bg-primary/10 dark:bg-primary/20 p-3 rounded-lg mr-4">
            {#if item.type === 'folder'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            {:else if getFileType(item.name) === 'Image' && item.url}
              <div class="h-10 w-10 flex items-center justify-center">
                <img src={item.url} alt={item.name} class="max-h-full max-w-full object-contain" />
              </div>
            {:else if getFileType(item.name) === 'PDF Document'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500" viewBox="0 0 384 512">
                <path fill="currentColor" d="M181.9 256.1c-5-16-4.9-46.9-2-46.9 8.4 0 7.6 36.9 2 46.9zm-1.7 47.2c-7.7 20.2-17.3 43.3-28.4 62.7 18.3-7 39-17.2 62.9-21.9-12.7-9.6-24.9-23.4-34.5-40.8zM86.1 428.1c0 .8 13.2-5.4 34.9-40.2-6.7 6.3-29.1 24.5-34.9 40.2zM248 160h136v328c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V24C0 10.7 10.7 0 24 0h200v136c0 13.2 10.8 24 24 24zm-8 171.8c-20-12.2-33.3-29-42.7-53.8 4.5-18.5 11.6-46.6 6.2-64.2-4.7-29.4-42.4-26.5-47.8-6.8-5 18.3-.4 44.1 8.1 77-11.6 27.6-28.7 64.6-40.8 85.8-.1 0-.1.1-.2.1-27.1 13.9-73.6 44.5-54.5 68 5.6 6.9 16 10 21.5 10 17.9 0 35.7-18 61.1-61.8 25.8-8.5 54.1-19.1 79-23.2 21.7 11.8 47.1 19.5 64 19.5 29.2 0 31.2-32 19.7-43.4-13.9-13.6-54.3-9.7-73.6-7.2zM377 105L279 7c-4.5-4.5-10.6-7-17-7h-6v128h128v-6.1c0-6.3-2.5-12.4-7-16.9zm-74.1 255.3c4.1-2.7-2.5-11.9-42.8-9 37.1 15.8 42.8 9 42.8 9z"/>
              </svg>
            {:else if getFileType(item.name) === 'Video'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-purple-500" viewBox="0 0 24 24">
                <path fill="currentColor" d="M4 8H2v12a2 2 0 0 0 2 2h12v-2H4z" />
                <path fill="currentColor" d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-9 12V6l7 4z" />
              </svg>
            {:else if getFileType(item.name) === 'Audio'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-green-500" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
              </svg>
            {:else if getFileType(item.name) === 'Code'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-500" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
              </svg>
            {:else if getFileType(item.name) === 'Archive'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-amber-500" viewBox="0 0 384 512">
                <path fill="currentColor" d="M377 105L279 7c-4.5-4.5-10.6-7-17-7h-6v128h128v-6.1c0-6.3-2.5-12.4-7-16.9zM128.1 35.9h-6.4v1.1l.7 1.3v.1l6.4-1.7-.7-.8zM128.1 24.9l-3.8 1.5.3.7.9 2 3.8-1.5-.5-1 .3-1.6-.9-.1zM127.2 17.1h-1.6v1.5h1.6v-1.5zM127.2 21.6h-1.6v3.3l1.6-.5v-2.9zM127.2 11.5h-1.6v4.1h1.6v-4.1zM127.2 7h-1.6v3h1.6V7zM128.8 14.5c0-.2-.2-.4-.4-.3l-2.5.8c-.2.1-.4.3-.3.4l.7 2.1c.1.2.3.4.4.3l2.5-.8c.2-.1.4-.3.3-.4l-.7-2.1zM382 150v328c0 13.3-10.7 24-24 24H56c-13.3 0-24-10.7-24-24V24C32 10.7 42.7 0 56 0h194v96c0 13.3 10.7 24 24 24h108v30zM176 180v-24h-32v24H128v48h16v-4.8c0-6.2 1.3-12.3 3.8-17.9l5.7-12.6c1.2-2.7 3.9-4.3 6.8-4.3s5.6 1.6 6.8 4.3l5.7 12.6c2.5 5.6 3.8 11.6 3.8 17.9V228h16v-48h-16zm-43.9 48h-16.7c-22.2 0-40.1 18-40.1 40.2v84.5c0 21.4 17.3 38.8 38.6 39.2 21.8.4 39.6-17.3 39.6-39.1V228h-21.4v40.2c0 9.2-7.5 16.7-16.7 16.7s-16.7-7.5-16.7-16.7v-40.2c0-10.5 8.5-19.1 19.1-19.1h14.3v-20.6zM112 416v32h160v-32H112z"/>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-medium text-neutral-800 dark:text-white mb-1 break-all">
              {item.name}
            </h3>
            <p class="text-sm text-neutral-500 dark:text-gray-400">
              {item.type === 'folder' ? 'Folder' : getFileType(item.name)}
              {#if item.type !== 'folder' && getFileExtension(item.name)}
                <span class="ml-1">({getFileExtension(item.name)})</span>
              {/if}
            </p>
          </div>
        </div>

        <div class="space-y-3">
          {#if item.key}
            <div class="flex justify-between">
              <span class="text-sm text-neutral-600 dark:text-gray-400">Path:</span>
              <span class="text-sm text-neutral-800 dark:text-white font-medium break-all text-right">
                {item.key}
              </span>
            </div>
          {/if}

          {#if item.size !== undefined && item.type !== 'folder'}
            <div class="flex justify-between">
              <span class="text-sm text-neutral-600 dark:text-gray-400">Size:</span>
              <span class="text-sm text-neutral-800 dark:text-white font-medium">
                {formatFileSize(item.size)}
              </span>
            </div>
          {/if}

          {#if item.lastModified}
            <div class="flex justify-between">
              <span class="text-sm text-neutral-600 dark:text-gray-400">Modified:</span>
              <span class="text-sm text-neutral-800 dark:text-white font-medium">
                {formatDate(item.lastModified)}
              </span>
            </div>
          {/if}

          {#if item.contentType && item.type !== 'folder'}
            <div class="flex justify-between">
              <span class="text-sm text-neutral-600 dark:text-gray-400">Content Type:</span>
              <span class="text-sm text-neutral-800 dark:text-white font-medium">
                {item.contentType}
              </span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t dark:border-gray-700 p-4 flex justify-end space-x-2">
        <button
          on:click={close}
          class="btn btn-outline btn-sm"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
