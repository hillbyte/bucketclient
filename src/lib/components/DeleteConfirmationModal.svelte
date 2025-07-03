<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let item: { Key?: string; Prefix?: string; };
  export let isFolder: boolean;

  const dispatch = createEventDispatcher();

  let isDeleting = false;

  function confirm() {
    isDeleting = true;
    dispatch('confirm');
  }

  function getItemName() {
    if (isFolder) {
      const parts = item.Prefix?.split('/').filter(p => p);
      return parts?.[parts.length - 1] || '';
    }
    return item.Key?.split('/').pop() || '';
  }
</script>

<div class="modal modal-open bg-black/30">
  <div class="modal-box bg-mantle text-text">
    <h3 class="font-bold text-lg text-red">Confirm Deletion</h3>
    <p class="py-4">Are you sure you want to delete <span class="font-bold text-peach">{getItemName()}</span>? This action cannot be undone.</p>
    <div class="modal-action">
      <button class="btn" on:click={() => dispatch('close')} disabled={isDeleting}>Cancel</button>
      <button class="btn bg-red text-white hover:bg-maroon" on:click={confirm} disabled={isDeleting}>
        {#if isDeleting}Deleting...{:else}Delete{/if}
      </button>
    </div>
  </div>
</div>
