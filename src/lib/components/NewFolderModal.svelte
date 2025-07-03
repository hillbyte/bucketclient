<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let folderName = '';
  let isSaving = false;

  function handleSubmit() {
    if (folderName) {
      isSaving = true;
      dispatch('create', { folderName });
    }
  }
</script>

<div class="modal modal-open bg-black/30">
  <div class="modal-box bg-mantle text-text">
    <h3 class="font-bold text-lg text-peach">New Folder</h3>
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-control py-4">
        <label class="label" for="folderName">
          <span class="label-text text-subtext1">Folder Name</span>
        </label>
        <input 
          id="folderName"
          type="text" 
          bind:value={folderName} 
          class="input input-bordered w-full bg-surface0"
          required
        />
      </div>
      <div class="modal-action">
        <button type="button" class="btn" on:click={() => dispatch('close')} disabled={isSaving}>Cancel</button>
        <button type="submit" class="btn bg-green text-white hover:bg-teal" disabled={isSaving}>
          {#if isSaving}Creating...{:else}Create{/if}
        </button>
      </div>
    </form>
  </div>
</div>

