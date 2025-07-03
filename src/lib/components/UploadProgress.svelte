<script lang="ts">
  import { uploadProgress, uploadProgressVisible } from '$lib/store';
  import { onMount, onDestroy } from 'svelte';

  let progressItems: Record<string, any> = {};
  let isVisible = false;
  let minimized = false;
  let totalFiles = 0;
  let completedFiles = 0;
  let totalProgress = 0;

  // Subscribe to the upload progress store
  const unsubscribe = uploadProgress.subscribe((value) => {
    progressItems = value;
    totalFiles = Object.keys(progressItems).length;

    // Count completed files
    completedFiles = Object.values(progressItems).filter(item => item.percentage === 100).length;

    // Calculate total progress
    if (totalFiles > 0) {
      const totalPercentage = Object.values(progressItems).reduce((acc: number, item: any) => acc + item.percentage, 0);
      totalProgress = Math.floor(totalPercentage / totalFiles);
    } else {
      totalProgress = 0;
    }

    // Show/hide based on progress items
    isVisible = totalFiles > 0;
    if (isVisible) {
      uploadProgressVisible.set(true);
    } else {
      uploadProgressVisible.set(false);
    }
  });

  function toggleMinimize() {
    minimized = !minimized;
  }

  function closeProgress() {
    uploadProgressVisible.set(false);
  }

  onDestroy(() => {
    unsubscribe();
  });

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

{#if isVisible}
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-72 transition-all duration-300 {minimized ? 'h-12' : ''} border border-gray-200 dark:border-gray-700 animate-slideIn">
    <div class="flex justify-between items-center p-3 border-b dark:border-gray-700 cursor-pointer" on:click={toggleMinimize}>
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span class="font-medium text-sm text-gray-700 dark:text-white">
          {#if completedFiles === totalFiles && totalFiles > 0}
            Upload Complete
          {:else}
            Uploading {completedFiles}/{totalFiles} Files
          {/if}
        </span>
      </div>
      <div class="flex items-center">
        <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white ml-2" on:click|stopPropagation={toggleMinimize}>
          {#if minimized}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          {/if}
        </button>
        <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white ml-2" on:click|stopPropagation={closeProgress}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    {#if !minimized}
      <div class="p-3">
        <div class="mb-3">
          <div class="flex justify-between items-center mb-1 text-xs text-gray-600 dark:text-gray-300">
            <span>Overall Progress</span>
            <span>{totalProgress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-value" style="width: {totalProgress}%"></div>
          </div>
        </div>

        <div class="max-h-48 overflow-y-auto">
          {#each Object.entries(progressItems) as [id, item]}
            <div class="mb-3">
              <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={item.file.name}>
                  {item.file.name}
                </span>
                <span class="text-xs text-gray-600 dark:text-gray-400">{item.percentage}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-value" style="width: {item.percentage}%"></div>
              </div>
              <div class="flex justify-between items-center mt-1">
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(item.loaded)} / {formatFileSize(item.total)}
                </span>
                {#if item.percentage === 100}
                  <span class="text-xs text-success flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
