<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { getS3Client } from '$lib/s3';
  import { GetObjectCommand, type _Object } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  import { credentials, customDomain } from '$lib/stores';

  export let file: _Object;

  const dispatch = createEventDispatcher();

  let shareableLink = '';
  let customDomainLink = '';
  let isLoading = true;
  let error: string | null = null;
  let expiration = 3600; // 1 hour in seconds
  let signedUrlCopyText = 'Copy';
  let customDomainCopyText = 'Copy';
  let customDomainUrl = '';
  let showCustomDomainInput = false;

  // Predefined expiry options (max 7 days for AWS S3 presigned URLs)
  const expiryOptions = [
    { label: '1 Hour', value: 3600 },
    { label: '6 Hours', value: 21600 },
    { label: '1 Day', value: 86400 },
    { label: '3 Days', value: 259200 },
    { label: '1 Week', value: 604800 }
  ];

  let selectedExpiry = 3600;

  let isGenerating = false;
  let debounceTimer: number;

  async function generateSignedLink() {
    // Don't show loading for expiry changes, only for initial load
    if (!shareableLink) {
      isLoading = true;
    } else {
      isGenerating = true;
    }
    
    error = null;
    signedUrlCopyText = 'Copy';
    const s3 = getS3Client();
    const creds = get(credentials);

    if (!s3 || !creds || !file.Key) {
      error = 'Could not generate link.';
      isLoading = false;
      isGenerating = false;
      return;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: creds.bucketName,
        Key: file.Key,
      });
      
      shareableLink = await getSignedUrl(s3, command, { expiresIn: selectedExpiry });
    } catch (e: any) {
      error = `Failed to generate link: ${e.message}`;
    } finally {
      isLoading = false;
      isGenerating = false;
    }
  }

  function debouncedGenerateLink() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      generateSignedLink();
    }, 300); // 300ms debounce
  }

  function generateCustomDomainLink() {
    const domain = customDomainUrl || get(customDomain);
    if (domain && file.Key) {
      const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
      customDomainLink = `${cleanDomain}/${file.Key}`;
    }
  }



  function copySignedUrl() {
    navigator.clipboard.writeText(shareableLink).then(() => {
      signedUrlCopyText = 'Copied!';
      setTimeout(() => (signedUrlCopyText = 'Copy'), 2000);
    });
  }

  function copyCustomDomainUrl() {
    navigator.clipboard.writeText(customDomainLink).then(() => {
      customDomainCopyText = 'Copied!';
      setTimeout(() => (customDomainCopyText = 'Copy'), 2000);
    });
  }

  function handleExpiryChange() {
    expiration = selectedExpiry;
    debouncedGenerateLink();
  }



  function saveCustomDomain() {
    if (customDomainUrl) {
      customDomain.set(customDomainUrl);
      generateCustomDomainLink();
      showCustomDomainInput = false; // Minimize after saving
    }
  }

  onMount(() => {
    customDomainUrl = get(customDomain);
    showCustomDomainInput = !customDomainUrl; // Show input if no domain is saved
    generateSignedLink();
    generateCustomDomainLink();
  });

  $: {
    // Update custom domain link when URL changes
    generateCustomDomainLink();
  }
</script>

<div class="modal modal-open bg-black/30">
  <div class="modal-box bg-mantle text-text max-w-lg">
    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" on:click={() => dispatch('close')}>✕</button>
    <h3 class="font-bold text-lg text-peach mb-4">Share File: {file.Key?.split('/').pop()}</h3>

    {#if isLoading}
      <div class="flex items-center justify-center py-8">
        <div class="loading loading-spinner loading-lg text-blue"></div>
        <span class="ml-3">Generating link...</span>
      </div>
    {:else if error}
      <div class="alert alert-error mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    {:else}
      <div class="space-y-4">
        <!-- Signed URL Section -->
        <div class="space-y-3">
          <h4 class="text-md font-semibold text-subtext1">Signed URL</h4>
          
          <!-- Expiry Settings -->
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text text-subtext1 text-sm">Expires in</span>
            </label>
            <select 
              bind:value={selectedExpiry} 
              on:change={handleExpiryChange} 
              class="select select-bordered select-sm bg-surface0"
              disabled={isGenerating}
            >
              {#each expiryOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <!-- Signed URL Display -->
          <div class="join w-full">
            <input 
              type="text" 
              readonly 
              value={shareableLink} 
              class="input input-bordered input-sm w-full bg-surface0 join-item font-mono text-xs {isGenerating ? 'opacity-50' : ''}" 
              placeholder={isGenerating ? 'Generating new link...' : ''}
            />
            <button 
              class="btn btn-sm bg-blue text-white hover:bg-sapphire join-item" 
              on:click={copySignedUrl}
              disabled={isGenerating || !shareableLink}
            >
              {isGenerating ? 'Wait...' : signedUrlCopyText}
            </button>
          </div>
          
          {#if isGenerating}
            <div class="flex items-center gap-2 text-xs text-subtext0">
              <div class="loading loading-spinner loading-xs"></div>
              <span>Updating link...</span>
            </div>
          {/if}
        </div>

        <!-- Divider -->
        <div class="divider my-2 text-subtext0 text-sm">OR</div>

        <!-- Custom Domain Section -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-md font-semibold text-subtext1">Custom Domain</h4>
            {#if customDomainLink && !showCustomDomainInput}
              <button 
                class="btn btn-xs btn-ghost text-subtext0" 
                on:click={() => showCustomDomainInput = true}
              >
                Edit
              </button>
            {/if}
          </div>
          
          {#if showCustomDomainInput}
            <!-- Custom Domain Input -->
            <div class="form-control">
              <div class="join w-full">
                <input 
                  type="text" 
                  bind:value={customDomainUrl}
                  placeholder="https://files.yourdomain.com"
                  class="input input-bordered input-sm w-full bg-surface0 join-item" 
                />
                <button 
                  class="btn btn-sm bg-green text-white hover:bg-teal join-item" 
                  on:click={saveCustomDomain}
                >
                  Save
                </button>
              </div>
              <div class="label py-1">
                <span class="label-text-alt text-subtext0 text-xs">For permanent links without expiry</span>
              </div>
            </div>
          {/if}

          {#if customDomainLink}
            <!-- Custom Domain Link Display -->
            <div class="join w-full">
              <input 
                type="text" 
                readonly 
                value={customDomainLink} 
                class="input input-bordered input-sm w-full bg-surface0 join-item font-mono text-xs" 
              />
              <button 
                class="btn btn-sm bg-blue text-white hover:bg-sapphire join-item" 
                on:click={copyCustomDomainUrl}
              >
                {customDomainCopyText}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end mt-4 space-x-2">
        <button class="btn btn-sm btn-ghost" on:click={() => dispatch('close')}>Close</button>
      </div>
    {/if}
  </div>
</div>
