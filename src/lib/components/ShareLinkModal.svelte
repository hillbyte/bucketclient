<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { getS3Client } from '$lib/s3';
  import { GetObjectCommand, type _Object } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  import { credentials } from '$lib/stores';

  export let file: _Object;

  const dispatch = createEventDispatcher();

  let shareableLink = '';
  let isLoading = true;
  let error: string | null = null;
  let expiration = 3600; // 1 hour in seconds
  let copyButtonText = 'Copy';

  async function generateLink() {
    isLoading = true;
    error = null;
    copyButtonText = 'Copy';
    const s3 = getS3Client();
    const creds = get(credentials);

    if (!s3 || !creds || !file.Key) {
      error = 'Could not generate link.';
      isLoading = false;
      return;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: creds.bucketName,
        Key: file.Key,
      });
      shareableLink = await getSignedUrl(s3, command, { expiresIn: expiration });
    } catch (e: any) {
      error = `Failed to generate link: ${e.message}`;
    } finally {
      isLoading = false;
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(shareableLink).then(() => {
      copyButtonText = 'Copied!';
      setTimeout(() => (copyButtonText = 'Copy'), 2000);
    });
  }

  onMount(() => {
    generateLink();
  });
</script>

<div class="modal modal-open bg-black/30">
  <div class="modal-box bg-mantle text-text">
    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" on:click={() => dispatch('close')}>✕</button>
    <h3 class="font-bold text-lg text-peach mb-4">Share File</h3>

    {#if isLoading}
      <p>Generating link...</p>
    {:else if error}
      <p class="text-red">{error}</p>
    {:else}
      <div class="form-control">
        <label class="label" for="shareableLink">
          <span class="label-text text-subtext1">Shareable Link</span>
        </label>
        <div class="join">
          <input id="shareableLink" type="text" readonly bind:value={shareableLink} class="input input-bordered w-full bg-surface0 join-item" />
          <button class="btn bg-blue text-white hover:bg-sapphire join-item" on:click={copyToClipboard}>{copyButtonText}</button>
        </div>
      </div>
      <div class="form-control mt-4">
        <label class="label" for="expirationInput">
          <span class="label-text text-subtext1">Expires in (seconds)</span>
        </label>
        <input id="expirationInput" type="number" bind:value={expiration} class="input input-bordered w-full bg-surface0" on:change={generateLink} />
      </div>
    {/if}
  </div>
</div>
