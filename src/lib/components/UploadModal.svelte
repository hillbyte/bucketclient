<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Upload } from '@aws-sdk/lib-storage';
  import { getS3Client } from '$lib/s3';
  import { credentials } from '$lib/stores';

  export let prefix: string;

  const dispatch = createEventDispatcher();

  let filesToUpload: FileList | null = null;
  let uploadProgress: { [key: string]: number } = {};
  let isUploading = false;
  let isDragging = false;
  let dragCounter = 0;

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
      isDragging = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
    dragCounter = 0;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      filesToUpload = e.dataTransfer.files;
      uploadProgress = {};
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      filesToUpload = input.files;
      uploadProgress = {};
    }
  }

  async function startUpload() {
    if (!filesToUpload || filesToUpload.length === 0) return;

    isUploading = true;
    const s3 = getS3Client();
    const creds = $credentials;

    if (!s3 || !creds) {
      isUploading = false;
      return;
    }

    // Initialize progress for all files
    const files = Array.from(filesToUpload);
    files.forEach(file => {
      uploadProgress[file.name] = 0;
    });
    uploadProgress = { ...uploadProgress }; // Trigger reactivity

    const uploadPromises = files.map(file => {
      const fileKey = `${prefix}${file.name}`;
      
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: creds.bucketName,
          Key: fileKey,
          Body: file,
        },
        queueSize: 4, // Number of concurrent uploads
        partSize: 5 * 1024 * 1024, // 5MB chunks
      });

      upload.on('httpUploadProgress', (progress) => {
        if (progress.total) {
          uploadProgress[file.name] = Math.round((progress.loaded! / progress.total) * 100);
          uploadProgress = { ...uploadProgress }; // Trigger reactivity
        }
      });

      return upload.done()
        .then(() => {
          uploadProgress[file.name] = 100;
          uploadProgress = { ...uploadProgress }; // Trigger reactivity
        })
        .catch(error => {
          console.error(`Upload failed for ${file.name}:`, error);
          uploadProgress[file.name] = -1; // Mark as failed
          uploadProgress = { ...uploadProgress }; // Trigger reactivity
          throw error; // Re-throw to be caught by Promise.all
        });
    });

    try {
      await Promise.all(uploadPromises);
      dispatch('uploadComplete');
      // Close modal after a short delay to show completion
      setTimeout(() => {
        dispatch('close');
      }, 1000);
    } catch (e) {
      console.error('Some uploads failed', e);
      // Individual errors are already handled, just need to update UI
    } finally {
      isUploading = false;
    }
  }

  function cancelUpload() {
    // This is a basic cancellation - in a real app, you'd want to properly abort the uploads
    filesToUpload = null;
    uploadProgress = {};
    isUploading = false;
  }
</script>

<div class="modal modal-open bg-black/30">
  <div class="modal-box bg-mantle text-text max-w-2xl">
    <button 
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" 
      on:click={() => dispatch('close')}
      disabled={isUploading}
    >
      ✕
    </button>
    
    <h3 class="font-bold text-lg text-peach mb-4">
      {#if isUploading}
        <i class="fas fa-spinner fa-spin mr-2"></i>
      {/if}
      Upload Files
    </h3>

    <div 
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 {isDragging ? 'border-blue bg-blue/10' : 'border-surface1'}"
      on:dragover={handleDragOver}
      on:dragenter={handleDragEnter}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
      role="region"
      aria-label="File upload drop zone"
      aria-describedby="drop-zone-instructions"
      tabindex="0"
    >
      <div class="flex flex-col items-center justify-center space-y-4">
        <i class="fas fa-cloud-upload-alt text-4xl text-blue"></i>
        <p class="text-subtext1">
          {#if isDragging}
            Drop files here to upload
          {:else}
            Drag and drop files here, or
          {/if}
        </p>
        <label class="btn btn-sm bg-blue text-white hover:bg-sapphire cursor-pointer">
          <i class="fas fa-folder-open mr-2"></i>
          Browse Files
          <input 
            type="file" 
            class="hidden" 
            multiple 
            on:change={handleFileSelect} 
            disabled={isUploading}
          />
        </label>
        <p class="text-xs text-subtext0">
          Supports multiple files (max 5GB per file)
        </p>
      </div>
    </div>

    {#if filesToUpload && filesToUpload.length > 0}
      <div class="mt-6 space-y-3 max-h-64 overflow-y-auto pr-2">
        <div class="flex justify-between items-center text-sm text-subtext0 mb-2">
          <span>{filesToUpload.length} file{filesToUpload.length !== 1 ? 's' : ''} selected</span>
          {#if !isUploading}
            <button 
              class="text-xs text-red-400 hover:text-red-500"
              on:click={cancelUpload}
            >
              Clear all
            </button>
          {/if}
        </div>
        
        {#each Array.from(filesToUpload) as file (file.name)}
          <div class="bg-surface0 rounded-lg p-3 border border-surface1">
            <div class="flex justify-between items-center mb-1">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                <p class="text-xs text-subtext0">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <div class="ml-2 text-right">
                {#if uploadProgress[file.name] === undefined}
                  <span class="text-xs">Pending</span>
                {:else if uploadProgress[file.name] === -1}
                  <span class="text-red-400 text-xs">Failed</span>
                {:else if uploadProgress[file.name] === 100}
                  <span class="text-green-400 text-xs">Done</span>
                {:else}
                  <span class="text-blue-400 text-xs">{uploadProgress[file.name]}%</span>
                {/if}
              </div>
            </div>
            
            {#if uploadProgress[file.name] !== undefined && uploadProgress[file.name] !== -1}
              <div class="w-full bg-surface1 rounded-full h-2 mt-2">
                <div 
                  class="bg-blue h-2 rounded-full transition-all duration-300 {uploadProgress[file.name] === 100 ? 'bg-green-400' : ''}"
                  style={`width: ${Math.max(5, uploadProgress[file.name])}%`}
                ></div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="modal-action">
      <button 
        class="btn btn-ghost" 
        on:click={() => dispatch('close')}
        disabled={isUploading}
      >
        Cancel
      </button>
      <button 
        class="btn bg-blue text-white hover:bg-sapphire" 
        on:click={startUpload} 
        disabled={isUploading || !filesToUpload || filesToUpload.length === 0}
      >
        {#if isUploading}
          <i class="fas fa-spinner fa-spin mr-2"></i>
          Uploading...
        {:else}
          <i class="fas fa-upload mr-2"></i>
          Upload All
        {/if}
      </button>
    </div>
  </div>
</div>
