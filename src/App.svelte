<script lang="ts">
  import { isConnected } from '$lib/stores';
  import Connection from '$lib/components/Connection.svelte';
  import FileManager from '$lib/components/FileManager.svelte';
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
</svelte:head>

{#if $isConnected}
  <FileManager />
{:else}
  <Connection />
{/if}