<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Dropzone } from 'svelte-file-dropzone';
  import { uploadObject } from '$lib/services/s3.service';
  import { currentPath, uploadProgress, showToast } from '$lib/store';
  import { formatFileSize } from '$lib/utils/file-utils';

  const dispatch = createEventDispatcher();

  let files: File[] = [];
  let dragActive = false;
  let uploading = false;
  let completed = 0;
  let showUploadList = false;
  let currentUploads: Record<string, { file: File, progress: number, error?: string }> = {};

  const handleFilesSelect = (e: CustomEvent<{ acceptedFiles: File[] }>) => {
    files = [...files, ...e.detail.acceptedFiles];
    showUploadList = true;
  };

  const removeFile = (index: number) => {
    files = files.filter((_, i) => i !== index);
  };

  const clearFiles = () => {
    files = [];
    showUploadList = false;
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    uploading = true;
    completed = 0;
    currentUploads = {};

    // Process each file
    for (const file of files) {
      const uploadId = `${Date.now()}-${file.name}`;

      // Add to current uploads with 0 progress
      currentUploads = {
        ...currentUploads,
        [uploadId]: { file, progress: 0 }
      };

      try {
        // Determine the full path for the file
        const prefix = $currentPath;
        const filePath = prefix ? `${prefix}${file.name}` : file.name;

        // Start upload
        const success = await uploadObject(file, filePath);

        if (success) {
          // Update progress to 100% on completion
          currentUploads = {
            ...currentUploads,
            [uploadId]: { file, progress: 100 }
          };
          completed++;
        } else {
          // Mark as error
          currentUploads = {
            ...currentUploads,
            [uploadId]: { file, progress: 0, error: 'Upload failed' }
          };
        }
      } catch (err) {
        console.error('Error uploading file:', err);
        currentUploads = {
          ...currentUploads,
          [uploadId]: { file, progress: 0, error: err.message || 'Upload failed' }
        };
      }
    }

    // Upload completed
    uploading = false;

    if (completed === files.length) {
      showToast(`Successfully uploaded ${completed} file${completed !== 1 ? 's' : ''}`, 'success');

      // Refresh the file list after a short delay
      setTimeout(() => {
        dispatch('complete');
        clearFiles();
      }, 1000);
    } else {
      showToast(`Uploaded ${completed} of ${files.length} files`, 'info');
    }
  };

  // Update progress from the store
  $: {
    Object.entries($uploadProgress).forEach(([id, progress]) => {
      const existingId = Object.keys(currentUploads).find(key =>
        currentUploads[key].file.name === progress.file.name &&
        currentUploads[key].progress < 100
      );

      if (existingId) {
        currentUploads = {
          ...currentUploads,
          [existingId]: {
            ...currentUploads[existingId],
            progress: progress.percentage
          }
        };
      }
    });
  }
</script>

<div class="w-full">
  <Dropzone
    on:drop={handleFilesSelect}
    on:dragenter={() => dragActive = true}
    on:dragleave={() => dragActive = false}
    disableDefaultStyles={true}
    containerClasses="dropzone-container"
    activeContainerClasses={dragActive ? 'dropzone-active' : ''}
  >
    <div
      class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary transition-colors {dragActive ? 'border-primary bg-primary/5' : ''}"
    >
      <div class="flex flex-col items-center justify-center py-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-16 w-16 text-primary/70 dark:text-primary/80 mb-4 animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p class="text-lg font-medium text-neutral-700 dark:text-gray-300 mb-1">
          Drag & drop files here
        </p>
        <p class="text-sm text-neutral-500 dark:text-gray-400 mb-4">
          or click to browse your device
        </p>
        <button
          type="button"
          class="py-2.5 px-5 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
          Browse Files
        </button>
      </div>
    </div>
  </Dropzone>

  {#if showUploadList}
    <div class="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-slate-700 animate-scaleIn">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-neutral-800 dark:text-white">
          Files to Upload ({files.length})
        </h3>
        <div class="flex gap-2">
          <button
            on:click={clearFiles}
            class="py-1.5 px-3 bg-gray-100 dark:bg-slate-700 text-neutral-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-sm transition-all border border-gray-200 dark:border-slate-600 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>
          <button
            on:click={uploadFiles}
            disabled={files.length === 0 || uploading}
            class="py-1.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-sm hover:shadow flex items-center gap-1"
          >
            {#if uploading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
              Upload Files
            {/if}
          </button>
        </div>
      </div>

      <div class="max-h-64 overflow-y-auto pr-2 mt-3">
        {#each files as file, i}
          <div class="flex items-center justify-between py-3 px-2 border-b dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
            <div class="flex items-center flex-1 min-w-0">
              <div class="text-neutral-600 dark:text-gray-300 mr-3">
                {#if file.type.startsWith('image/')}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                {:else if file.type.startsWith('video/')}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-500" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M4 8H2v12a2 2 0 0 0 2 2h12v-2H4z" />
                    <path fill="currentColor" d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-9 12V6l7 4z" />
                  </svg>
                {:else if file.type.startsWith('audio/')}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                  </svg>
                {:else if file.type === 'application/pdf'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" viewBox="0 0 384 512">
                    <path fill="currentColor" d="M181.9 256.1c-5-16-4.9-46.9-2-46.9 8.4 0 7.6 36.9 2 46.9zm-1.7 47.2c-7.7 20.2-17.3 43.3-28.4 62.7 18.3-7 39-17.2 62.9-21.9-12.7-9.6-24.9-23.4-34.5-40.8zM86.1 428.1c0 .8 13.2-5.4 34.9-40.2-6.7 6.3-29.1 24.5-34.9 40.2zM248 160h136v328c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V24C0 10.7 10.7 0 24 0h200v136c0 13.2 10.8 24 24 24zm-8 171.8c-20-12.2-33.3-29-42.7-53.8 4.5-18.5 11.6-46.6 6.2-64.2-4.7-29.4-42.4-26.5-47.8-6.8-5 18.3-.4 44.1 8.1 77-11.6 27.6-28.7 64.6-40.8 85.8-.1 0-.1.1-.2.1-27.1 13.9-73.6 44.5-54.5 68 5.6 6.9 16 10 21.5 10 17.9 0 35.7-18 61.1-61.8 25.8-8.5 54.1-19.1 79-23.2 21.7 11.8 47.1 19.5 64 19.5 29.2 0 31.2-32 19.7-43.4-13.9-13.6-54.3-9.7-73.6-7.2zM377 105L279 7c-4.5-4.5-10.6-7-17-7h-6v128h128v-6.1c0-6.3-2.5-12.4-7-16.9zm-74.1 255.3c4.1-2.7-2.5-11.9-42.8-9 37.1 15.8 42.8 9 42.8 9z"/>
                  </svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                {/if}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-neutral-700 dark:text-white truncate" title={file.name}>
                  {file.name}
                </p>
                <p class="text-xs text-neutral-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>

                {#if uploading}
                  {#each Object.entries(currentUploads) as [id, upload]}
                    {#if upload.file.name === file.name}
                      <div class="mt-1">
                        <div class="progress-bar mt-1">
                          <div
                            class="progress-value {upload.error ? 'bg-red-500' : ''} relative"
                            style="width: {upload.progress}%">
                            {#if upload.progress > 0 && upload.progress < 100 && !upload.error}
                              <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                            {/if}
                          </div>
                        </div>
                        {#if upload.error}
                          <p class="text-xs text-red-500 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                            {upload.error}
                          </p>
                        {:else if upload.progress === 100}
                          <p class="text-xs text-green-500 dark:text-green-400 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            Upload complete
                          </p>
                        {:else}
                          <p class="text-xs text-neutral-500 dark:text-gray-400 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {upload.progress}% complete
                          </p>
                        {/if}
                      </div>
                    {/if}
                  {/each}
                {/if}
              </div>
            </div>
            {#if !uploading}
              <button
                on:click={() => removeFile(i)}
                class="ml-2 text-neutral-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom scrollbar for the file list */
  :global(.dropzone-container) {
    width: 100%;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  :global(.dropzone-active) {
    border-color: theme('colors.primary') !important;
    background-color: theme('colors.primary.10') !important;
    transform: scale(1.01);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
</style>
