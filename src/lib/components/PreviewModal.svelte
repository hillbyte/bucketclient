<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import type { _Object } from '@aws-sdk/client-s3';
  import { getS3Client } from '$lib/s3';
  import { credentials } from '$lib/stores';
  import { GetObjectCommand } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  import hljs from 'highlight.js';
  import 'highlight.js/styles/github-dark.css';

  export let file: _Object;
  const dispatch = createEventDispatcher();

  let previewUrl: string | null = null;
  let fileContent: string | null = null;
  let fileType: 'image' | 'video' | 'pdf' | 'code' | 'text' | 'unsupported' = 'unsupported';
  let error: string | null = null;
  let isLoading = true;
  let codeElement: HTMLElement;
  let modalElement: HTMLDivElement;

  function getFileType(key: string): typeof fileType {
    const extension = key.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['js', 'ts', 'html', 'css', 'json', 'py', 'go', 'rs', 'svelte', 'md', 'sh', 'yaml', 'yml'].includes(extension)) return 'code';
    if (['txt', 'log'].includes(extension)) return 'text';
    return 'unsupported';
  }

    async function generatePreview() {
    isLoading = true;
    try {
      const s3 = getS3Client();
      const creds = get(credentials);
      if (!s3 || !creds || !file.Key) {
        throw new Error('S3 client not configured or file key is missing.');
      }

      const command = new GetObjectCommand({ Bucket: creds.bucketName, Key: file.Key });
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      previewUrl = url;

      if (fileType === 'code' || fileType === 'text') {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        fileContent = await response.text();
        await tick(); // Wait for the DOM to update
        if (codeElement && fileType === 'code') {
          hljs.highlightElement(codeElement);
        }
      }
    } catch (e: any) {
      error = `Failed to generate preview: ${e.message}`;
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fileType = getFileType(file.Key || '');
    if (fileType !== 'unsupported') {
      generatePreview();
    } else {
      isLoading = false;
    }
    modalElement?.focus();
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      dispatch('close');
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div bind:this={modalElement} class="modal modal-open" on:click|self={() => dispatch('close')} on:keydown={handleKeydown} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal-box w-11/12 max-w-5xl bg-mantle">
    <button class="btn btn-sm btn-circle absolute right-2 top-2" on:click={() => dispatch('close')}>✕</button>
    <h3 class="font-bold text-lg truncate pr-8">{file.Key?.split('/').pop()}</h3>
    
    <div class="py-4 min-h-[60vh] flex items-center justify-center">
      {#if isLoading}
        <span class="loading loading-spinner loading-lg"></span>
      {:else if error}
        <div class="p-4 bg-red/20 text-red rounded-md">
          <p><strong>Error:</strong> {error}</p>
        </div>
      {:else if fileType === 'unsupported'}
        <p>This file type cannot be previewed.</p>
      {:else if previewUrl}
        {#if fileType === 'image'}
          <img src={previewUrl} alt="Preview" class="max-w-full max-h-[70vh] mx-auto object-contain"/>
        {:else if fileType === 'video'}
          <video controls src={previewUrl} class="max-w-full max-h-[70vh] mx-auto">
            <track kind="captions" />
          </video>
        {:else if fileType === 'pdf'}
          <iframe title={file.Key?.split('/').pop() || 'PDF Preview'} src={previewUrl} class="w-full h-[75vh] border-none"></iframe>
        {:else if fileType === 'code' && fileContent !== null}
          <pre class="w-full text-left overflow-auto max-h-[75vh] bg-base p-4 rounded-lg"><code class="language-js" bind:this={codeElement}>{fileContent}</code></pre>
        {:else if fileType === 'text' && fileContent !== null}
          <pre class="w-full text-left overflow-auto max-h-[75vh] bg-base p-4 rounded-lg whitespace-pre-wrap">{fileContent}</pre>
        {/if}
      {/if}
    </div>

    <div class="modal-action">
      <a href={previewUrl} target="_blank" class="btn" download={file.Key?.split('/').pop()}>Download</a>
      <button class="btn" on:click={() => dispatch('close')}>Close</button>
    </div>
  </div>
</div>
