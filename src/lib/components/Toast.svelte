<script lang="ts">
  import { toast } from '$lib/store';
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';

  let toastClasses = '';
  let iconPath = '';
  let bgColor = '';
  let iconColor = '';

  // Auto-dismiss timer
  let timer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    return () => {
      if (timer) clearTimeout(timer);
    };
  });

  $: {
    if ($toast) {
      // Setup auto-dismiss
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => toast.set(null), 5000);

      // Set styles based on type
      switch ($toast.type) {
        case 'success':
          toastClasses = 'border-green-500 text-green-800 dark:text-green-300';
          bgColor = 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20';
          iconColor = 'text-green-500 dark:text-green-400';
          iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
          break;
        case 'error':
          toastClasses = 'border-red-500 text-red-800 dark:text-red-300';
          bgColor = 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20';
          iconColor = 'text-red-500 dark:text-red-400';
          iconPath = 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
          break;
        case 'info':
        default:
          toastClasses = 'border-primary text-primary-800 dark:text-primary-300';
          bgColor = 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20';
          iconColor = 'text-primary dark:text-primary-400';
          iconPath = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
          break;
      }
    }
  }
</script>

{#if $toast}
  <div
    class="fixed top-5 right-5 z-50 max-w-sm"
    in:fly={{ y: -20, duration: 300 }}
    out:fade={{ duration: 200 }}
  >
    <div
      class={`${toastClasses} ${bgColor} border-l-4 p-4 rounded-lg shadow-lg flex items-start backdrop-blur-sm animate-bounceIn`}
      style="min-width: 280px;"
    >
      <div class={`flex-shrink-0 mr-3 ${iconColor}`}>
        <div class="p-1.5 rounded-full bg-white/30 dark:bg-black/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d={iconPath}
            />
          </svg>
        </div>
      </div>
      <div class="flex-1 pt-0.5">
        <p class="text-sm font-medium">{$toast.message}</p>
      </div>
      <button
        class="ml-3 -mt-1 -mr-1 p-1.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/30 dark:hover:bg-black/10 transition-colors"
        on:click={() => toast.set(null)}
        title="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <!-- Progress bar that automatically shrinks -->
    <div class="h-1 bg-white/30 dark:bg-white/10 rounded-b-lg overflow-hidden -mt-1 mx-0.5 shadow-sm">
      <div
        class="h-full bg-current opacity-50 animate-shrink"
        style="animation-duration: 5s;"
      ></div>
    </div>
  </div>
{/if}

<style>
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }

  .animate-shrink {
    animation: shrink linear forwards;
  }
</style>
