<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatFileSize, formatDate, canPreviewInline, isImage, isVideo, isPdf, isText } from '$lib/utils/file-utils';
  import { getSignedObjectUrl, downloadObject } from '$lib/services/s3.service';
  import type { S3Item } from '$lib/services/s3.service';

  export let item: S3Item | null = null;
  export let show = false;

  const dispatch = createEventDispatcher();

  let previewUrl: string | null = null;
  let loading = false;
  let error: string | null = null;
  let previewText: string | null = null;
  let fullscreen = false;
  let imageLoaded = false;
  let imageError = false;

  // Initialize preview when item changes
  $: if (item && show) {
    loadPreview();
  } else {
    previewUrl = null;
    previewText = null;
  }

  async function loadPreview() {
    if (!item) return;

    loading = true;
    error = null;
    previewUrl = null;
    previewText = null;

    try {
      if (canPreviewInline(item.name, item.contentType)) {
        previewUrl = await getSignedObjectUrl(item.key);

        // For text files, load the content
        if (isText(item.name, item.contentType) && previewUrl) {
          const response = await fetch(previewUrl);
          if (response.ok) {
            previewText = await response.text();
          } else {
            throw new Error('Failed to load text content');
          }
        }
      }
    } catch (err) {
      console.error('Error loading preview:', err);
      error = `Failed to load preview: ${err.message || 'Unknown error'}`;
    } finally {
      loading = false;
    }
  }

  function closePreview() {
    fullscreen = false;
    dispatch('close');
  }

  function downloadFile() {
    if (item) {
      downloadObject(item.key, item.name);
    }
  }

  function toggleFullscreen() {
    fullscreen = !fullscreen;
  }

  function handleImageLoad() {
    imageLoaded = true;
    imageError = false;
  }

  function handleImageError() {
    imageLoaded = false;
    imageError = true;
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm transition-opacity animate-fadeIn">
    <!-- Preview modal container -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg {fullscreen ? 'w-full h-full max-w-none' : 'max-w-5xl w-full max-h-[90vh]'} flex flex-col animate-scaleIn border border-gray-100 dark:border-slate-700">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-t-xl">
        <div class="flex items-center">
          <div class="text-2xl mr-3 text-neutral-600 dark:text-gray-300">
            {#if item && isImage(item.name, item.contentType)}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            {:else if item && isPdf(item.name, item.contentType)}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" viewBox="0 0 384 512">
                <path fill="currentColor" d="M181.9 256.1c-5-16-4.9-46.9-2-46.9 8.4 0 7.6 36.9 2 46.9zm-1.7 47.2c-7.7 20.2-17.3 43.3-28.4 62.7 18.3-7 39-17.2 62.9-21.9-12.7-9.6-24.9-23.4-34.5-40.8zM86.1 428.1c0 .8 13.2-5.4 34.9-40.2-6.7 6.3-29.1 24.5-34.9 40.2zM248 160h136v328c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V24C0 10.7 10.7 0 24 0h200v136c0 13.2 10.8 24 24 24zm-8 171.8c-20-12.2-33.3-29-42.7-53.8 4.5-18.5 11.6-46.6 6.2-64.2-4.7-29.4-42.4-26.5-47.8-6.8-5 18.3-.4 44.1 8.1 77-11.6 27.6-28.7 64.6-40.8 85.8-.1 0-.1.1-.2.1-27.1 13.9-73.6 44.5-54.5 68 5.6 6.9 16 10 21.5 10 17.9 0 35.7-18 61.1-61.8 25.8-8.5 54.1-19.1 79-23.2 21.7 11.8 47.1 19.5 64 19.5 29.2 0 31.2-32 19.7-43.4-13.9-13.6-54.3-9.7-73.6-7.2zM377 105L279 7c-4.5-4.5-10.6-7-17-7h-6v128h128v-6.1c0-6.3-2.5-12.4-7-16.9zm-74.1 255.3c4.1-2.7-2.5-11.9-42.8-9 37.1 15.8 42.8 9 42.8 9z"/>
              </svg>
            {:else if item && isVideo(item.name, item.contentType)}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-500" viewBox="0 0 24 24">
                <path fill="currentColor" d="M4 8H2v12a2 2 0 0 0 2 2h12v-2H4z" />
                <path fill="currentColor" d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-9 12V6l7 4z" />
              </svg>
            {:else if item && isText(item.name, item.contentType)}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            {/if}
          </div>
          <div>
            <h2 class="text-lg font-semibold text-neutral-800 dark:text-white truncate max-w-md" title={item?.name || ''}>
              {item?.name || 'File Preview'}
            </h2>
            {#if item}
              <div class="text-sm text-neutral-500 dark:text-gray-400">
                {formatFileSize(item.size)} • Last modified: {formatDate(item.lastModified)}
              </div>
            {/if}
          </div>
        </div>
        <div class="flex gap-2">
          <button
            on:click={toggleFullscreen}
            class="p-2 rounded-full text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={fullscreen ? "M9 9l-6 6m0 0l6 6m-6-6h18M5 5l6 6m0 0l6-6m-6 6V5" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} />
            </svg>
          </button>
          <button
            on:click={downloadFile}
            class="p-2 rounded-full text-neutral-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Download"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            on:click={closePreview}
            class="p-2 rounded-full text-neutral-700 dark:text-gray-300 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-red-400 transition-colors"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-6 {fullscreen ? 'flex items-center justify-center' : ''}">
        {#if loading}
          <div class="flex justify-center items-center h-64">
            <div class="flex flex-col items-center">
              <div class="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
              <p class="mt-4 text-neutral-600 dark:text-gray-300">Loading preview...</p>
            </div>
          </div>
        {:else if error}
          <div class="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-lg shadow-sm">
            <div class="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        {:else if item && previewUrl && isImage(item.name, item.contentType)}
          <div class="flex justify-center {imageError ? 'hidden' : ''} relative group">
            <div class="absolute inset-0 flex items-center justify-center {imageLoaded ? 'hidden' : ''}">
              <div class="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
            </div>
            <img
              src={previewUrl}
              alt={item.name}
              class="max-w-full {fullscreen ? 'max-h-[85vh]' : 'max-h-[60vh]'} object-contain rounded shadow-sm transition-transform duration-300 group-hover:scale-[1.01]"
              on:load={handleImageLoad}
              on:error={handleImageError}
            />
          </div>
          {#if imageError}
            <div class="text-center text-red-500 dark:text-red-400 mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>Failed to load image</p>
            </div>
          {/if}
        {:else if item && previewUrl && isVideo(item.name, item.contentType)}
          <div class="flex justify-center">
            <video
              controls
              class="max-w-full {fullscreen ? 'max-h-[85vh]' : 'max-h-[60vh]'} rounded shadow-lg"
              poster={isImage(item.name + '.poster.jpg', 'image/jpeg') ? previewUrl + '.poster.jpg' : ''}
            >
              <source src={previewUrl} type={item.contentType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          </div>
        {:else if item && previewUrl && isPdf(item.name, item.contentType)}
          <div class="flex justify-center {fullscreen ? 'h-[85vh]' : 'h-[60vh]'} border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
            <iframe src={previewUrl} title={item.name} class="w-full h-full border-0 bg-white"></iframe>
          </div>
        {:else if item && isText(item.name, item.contentType) && previewText !== null}
          <div class="bg-white dark:bg-slate-900 rounded-lg p-4 overflow-auto {fullscreen ? 'max-h-[85vh]' : 'max-h-[60vh]'} border border-gray-200 dark:border-slate-700 shadow-sm">
            <pre class="text-sm text-neutral-800 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{previewText}</pre>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center h-64 text-neutral-500 dark:text-gray-400">
            <div class="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p class="text-lg font-medium">Preview not available</p>
            <p class="text-sm mt-2">This file type cannot be previewed. Please download to view.</p>
            <button
              on:click={downloadFile}
              class="mt-6 py-2.5 px-5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
