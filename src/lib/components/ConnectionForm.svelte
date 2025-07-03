<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { initClient } from '$lib/services/s3.service';
  import { showToast } from '$lib/store';

  const dispatch = createEventDispatcher();

  // Form fields
  let endpoint = '';
  let region = '';
  let accessKeyId = '';
  let secretAccessKey = '';
  let bucketName = '';
  let isSubmitting = false;
  let rememberCredentials = true;
  let error = '';

  // Handle form submission
  async function handleSubmit() {
    error = '';

    // Validation
    if (!endpoint) {
      error = 'Endpoint URL is required';
      return;
    }
    if (!region) {
      error = 'Region is required';
      return;
    }
    if (!accessKeyId) {
      error = 'Access Key ID is required';
      return;
    }
    if (!secretAccessKey) {
      error = 'Secret Access Key is required';
      return;
    }
    if (!bucketName) {
      error = 'Bucket Name is required';
      return;
    }

    isSubmitting = true;

    // Clean endpoint URL if needed
    if (endpoint.endsWith('/')) {
      endpoint = endpoint.slice(0, -1);
    }
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = 'https://' + endpoint;
    }

    try {
      // Initialize S3 client
      initClient({
        endpoint,
        region,
        accessKeyId,
        secretAccessKey,
        bucketName
      });

      // Show success message
      showToast('Successfully connected to S3 bucket', 'success');

      // Notify parent component
      dispatch('connected');
    } catch (err) {
      console.error('Connection error:', err);
      error = `Failed to connect: ${err.message || 'Unknown error'}`;
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="card p-8 max-w-md w-full mx-auto animate-scaleIn">
  <div class="flex items-center justify-center mb-6">
    <div class="bg-primary/10 dark:bg-primary/20 p-3 rounded-xl">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    </div>
  </div>

  <h2 class="text-2xl font-bold text-center text-neutral-800 dark:text-white mb-6">Connect to S3 Bucket</h2>

  {#if error}
    <div class="bg-error/10 border-l-4 border-error text-error p-4 mb-6 rounded-lg flex items-start" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <p>{error}</p>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="space-y-5">
    <div>
      <label for="endpoint" class="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1.5">
        Endpoint URL
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          id="endpoint"
          bind:value={endpoint}
          class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-700 text-neutral-800 dark:text-white transition-colors"
          placeholder="https://s3.amazonaws.com"
        />
      </div>
      <p class="mt-1.5 text-sm text-neutral-500 dark:text-gray-400">
        For AWS S3, use region-specific endpoint (e.g., s3.us-west-2.amazonaws.com)
      </p>
    </div>

    <div>
      <label for="region" class="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1.5">
        Region
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          id="region"
          bind:value={region}
          class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-700 text-neutral-800 dark:text-white transition-colors"
          placeholder="us-east-1"
        />
      </div>
    </div>

    <div>
      <label for="accessKeyId" class="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1.5">
        Access Key ID
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-2.257-2.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          id="accessKeyId"
          bind:value={accessKeyId}
          class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-700 text-neutral-800 dark:text-white transition-colors"
          placeholder="AKIAIOSFODNN7EXAMPLE"
        />
      </div>
    </div>

    <div>
      <label for="secretAccessKey" class="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1.5">
        Secret Access Key
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="password"
          id="secretAccessKey"
          bind:value={secretAccessKey}
          class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-700 text-neutral-800 dark:text-white transition-colors"
          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        />
      </div>
    </div>

    <div>
      <label for="bucketName" class="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1.5">
        Bucket Name
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          id="bucketName"
          bind:value={bucketName}
          class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-gray-700 text-neutral-800 dark:text-white transition-colors"
          placeholder="my-bucket"
        />
      </div>
    </div>

    <div class="flex items-center mt-3">
      <input
        id="rememberCredentials"
        type="checkbox"
        class="h-4 w-4 accent-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
        bind:checked={rememberCredentials}
      />
      <label for="rememberCredentials" class="ml-2 text-sm text-neutral-700 dark:text-gray-300">
        Remember my credentials in local storage
      </label>
    </div>

    <div class="pt-4">
      <button
        type="submit"
        class="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
        disabled={isSubmitting}
      >
        {#if isSubmitting}
          <span class="flex justify-center items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          </span>
        {:else}
          <span class="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1zM13 12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 00-1-1h-3zm1 2v1h1v-1h-1z" clip-rule="evenodd" />
            </svg>
            Connect to S3
          </span>
        {/if}
      </button>
    </div>

    <div class="pt-3 text-center">
      <p class="text-sm text-neutral-500 dark:text-gray-400">
        Your credentials are stored only in your browser's local storage and are never sent to any server besides the S3 endpoint you specify.
      </p>
    </div>
  </form>
</div>
