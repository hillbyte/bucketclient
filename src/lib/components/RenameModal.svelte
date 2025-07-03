<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let currentName: string;

  const dispatch = createEventDispatcher();
  let newName = '';
  let isSaving = false;

  onMount(() => {
    newName = currentName;
  });

  function handleSubmit() {
    if (newName && newName !== currentName) {
      isSaving = true;
      dispatch('save', { newName });
    }
  }
</script>

<div class="modal modal-open bg-black/30">
  <div class="modal-box bg-mantle text-text">
    <h3 class="font-bold text-lg text-peach">Rename Item</h3>
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-control py-4">
        <label class="label" for="newName">
          <span class="label-text text-subtext1">New Name</span>
        </label>
        <input 
          id="newName"
          type="text" 
          bind:value={newName} 
          class="input input-bordered w-full bg-surface0"
          required
        />
      </div>
      <div class="modal-action">
        <button type="button" class="btn" on:click={() => dispatch('close')} disabled={isSaving}>Cancel</button>
        <button type="submit" class="btn bg-green text-white hover:bg-teal" disabled={isSaving}>
          {#if isSaving}Saving...{:else}Save{/if}
        </button>
      </div>
    </form>
  </div>
</div>
