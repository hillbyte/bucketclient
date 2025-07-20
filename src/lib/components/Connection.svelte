<script lang="ts">
    import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
    import { credentials, isConnected } from "$lib/stores";

    let endpoint =
        "https://minio-s3-api.ahbdesk.site";
    let region = "us-east-1";
    let accessKeyId = "objzYeOttMjrHnJHr6E0";
    let secretAccessKey = "JAIZVX6pmWco0KbKf5nOTJM9evKVzfNnyM6a7GrY";
    let bucketName = "ad-backup";
    let isLoading = false;
    let error: string | null = null;

    async function connect() {
        isLoading = true;
        error = null;

        // Ensure endpoint has proper protocol
        let endpointUrl = endpoint;
        if (!endpointUrl.startsWith("http")) {
            endpointUrl = `https://${endpointUrl}`;
        } else if (endpointUrl.startsWith("http:")) {
            endpointUrl = endpointUrl.replace("http:", "https:");
        }

        // ... rest of your code

        const tempCredentials = {
            endpoint,
            region,
            accessKeyId,
            secretAccessKey,
            bucketName,
        };

        const s3 = new S3Client({
            endpoint: tempCredentials.endpoint,
            region: tempCredentials.region,
            credentials: {
                accessKeyId: tempCredentials.accessKeyId,
                secretAccessKey: tempCredentials.secretAccessKey,
            },
            forcePathStyle: true,
        });

        try {
            await s3.send(
                new ListObjectsV2Command({
                    Bucket: tempCredentials.bucketName,
                    MaxKeys: 1,
                }),
            );
            credentials.set(tempCredentials);
            isConnected.set(true);
        } catch (e: any) {
            error = `Connection failed: ${e.message}`;
        } finally {
            isLoading = false;
        }
    }

    let activeTab = "connection";
</script>

<div class="min-h-screen bg-base text-text p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <header class="text-center mb-12">
            <h1 class="text-4xl font-bold text-mauve mb-2">
                S3 Bucket Manager
            </h1>
            <p class="text-lg text-subtext1 max-w-2xl mx-auto">
                A modern, user-friendly interface to manage your S3-compatible
                storage buckets with ease
            </p>
        </header>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Connection Form -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-mantle rounded-xl shadow-lg overflow-hidden">
                    <!-- Tabs -->
                    <div class="flex border-b border-surface1">
                        <button
                            class="px-6 py-3 font-medium text-sm transition-colors duration-200"
                            class:bg-surface0={activeTab === "connection"}
                            class:text-blue={activeTab === "connection"}
                            on:click={() => (activeTab = "connection")}
                        >
                            Connection
                        </button>
                        <button
                            class="px-6 py-3 font-medium text-sm transition-colors duration-200"
                            class:bg-surface0={activeTab === "guide"}
                            class:text-blue={activeTab === "guide"}
                            on:click={() => (activeTab = "guide")}
                        >
                            Setup Guide
                        </button>
                    </div>

                    <!-- Connection Form -->
                    {#if activeTab === "connection"}
                        <div class="p-6">
                            <h2 class="text-2xl font-semibold mb-6">
                                Connect to Your S3 Bucket
                            </h2>
                            <form
                                on:submit|preventDefault={connect}
                                class="space-y-5"
                            >
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <div class="space-y-1">
                                        <label
                                            for="endpoint"
                                            class="block text-sm font-medium text-subtext1"
                                            >Endpoint URL</label
                                        >
                                        <input
                                            type="text"
                                            id="endpoint"
                                            bind:value={endpoint}
                                            placeholder="https://s3.your-provider.com"
                                            class="w-full px-4 py-2 bg-surface0 border border-surface1 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div class="space-y-1">
                                        <label
                                            for="region"
                                            class="block text-sm font-medium text-subtext1"
                                            >Region</label
                                        >
                                        <input
                                            type="text"
                                            id="region"
                                            bind:value={region}
                                            placeholder="us-east-1"
                                            class="w-full px-4 py-2 bg-surface0 border border-surface1 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <div class="space-y-1">
                                    <label
                                        for="bucketName"
                                        class="block text-sm font-medium text-subtext1 flex items-center gap-2"
                                    >
                                        Bucket Name
                                        {#if $isConnected}
                                            <span class="relative flex h-3 w-3">
                                                <span
                                                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"
                                                ></span>
                                                <span
                                                    class="relative inline-flex rounded-full h-3 w-3 bg-green active"
                                                ></span>
                                            </span>
                                        {/if}
                                    </label>
                                    <input
                                        type="text"
                                        id="bucketName"
                                        bind:value={bucketName}
                                        class="w-full px-4 py-2 bg-surface0 border border-surface1 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <div class="space-y-1">
                                        <label
                                            for="accessKeyId"
                                            class="block text-sm font-medium text-subtext1"
                                            >Access Key ID</label
                                        >
                                        <input
                                            type="text"
                                            id="accessKeyId"
                                            bind:value={accessKeyId}
                                            class="w-full px-4 py-2 bg-surface0 border border-surface1 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div class="space-y-1">
                                        <label
                                            for="secretAccessKey"
                                            class="block text-sm font-medium text-subtext1"
                                            >Secret Access Key</label
                                        >
                                        <div class="relative">
                                            <input
                                                type="password"
                                                id="secretAccessKey"
                                                bind:value={secretAccessKey}
                                                class="w-full px-4 py-2 pr-10 bg-surface0 border border-surface1 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                                                required
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-subtext0 hover:text-text"
                                                on:click={() => {
                                                    const input =
                                                        document.getElementById(
                                                            "secretAccessKey",
                                                        );
                                                    if (input)
                                                        input.type =
                                                            input.type ===
                                                            "password"
                                                                ? "text"
                                                                : "password";
                                                }}
                                            >
                                                <i class="fa-solid fa-eye"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    class="w-full px-6 py-3 font-semibold text-white bg-blue rounded-lg hover:bg-sapphire transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue flex items-center justify-center gap-2"
                                    disabled={isLoading}
                                >
                                    {#if isLoading}
                                        <i
                                            class="fa-solid fa-circle-notch animate-spin"
                                        ></i>
                                        Connecting...
                                    {:else}
                                        <i class="fa-solid fa-plug"></i>
                                        Connect to Bucket
                                    {/if}
                                </button>

                                {#if error}
                                    <div
                                        class="mt-4 p-3 bg-red/10 border-l-4 border-red text-red-700 rounded"
                                    >
                                        <p class="font-medium">
                                            Connection failed
                                        </p>
                                        <p class="text-sm">{error}</p>
                                    </div>
                                {/if}
                            </form>
                        </div>

                        <!-- Setup Guide -->
                    {:else if activeTab === "guide"}
                        <div class="p-6 space-y-6">
                            <h2 class="text-2xl font-semibold">Setup Guide</h2>

                            <div class="space-y-4">
                                <h3 class="text-lg font-medium text-subtext0">
                                    1. Create an S3 User
                                </h3>
                                <ul
                                    class="list-disc list-inside space-y-2 text-subtext1"
                                >
                                    <li>
                                        Log in to your cloud provider's console
                                        (AWS, MinIO, etc.)
                                    </li>
                                    <li>Navigate to IAM or User Management</li>
                                    <li>
                                        Create a new user with programmatic
                                        access
                                    </li>
                                    <li>
                                        Save the Access Key ID and Secret Access
                                        Key securely
                                    </li>
                                </ul>
                            </div>

                            <div class="space-y-4">
                                <h3 class="text-lg font-medium text-subtext0">
                                    2. Set Bucket Permissions
                                </h3>
                                <div class="bg-surface0 p-4 rounded-lg">
                                    <pre class="text-xs overflow-x-auto">{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}`}</pre>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <h3 class="text-lg font-medium text-subtext0">
                                    3. CORS Configuration
                                </h3>
                                <div class="bg-surface0 p-4 rounded-lg">
                                    <pre class="text-xs overflow-x-auto">{`[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
  "AllowedOrigins": ["*"],
  "ExposeHeaders": []
}]`}</pre>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Features Panel -->
            <div class="space-y-6">
                <div class="bg-mantle p-6 rounded-xl shadow-lg">
                    <h3 class="text-lg font-semibold mb-4">Features</h3>
                    <ul class="space-y-3">
                        <li class="flex items-start space-x-3">
                            <i class="fa-solid fa-folder text-blue mt-1"></i>
                            <div>
                                <h4 class="font-medium">File Browser</h4>
                                <p class="text-sm text-subtext1">
                                    Navigate through your buckets and folders
                                    with ease
                                </p>
                            </div>
                        </li>
                        <li class="flex items-start space-x-3">
                            <i class="fa-solid fa-upload text-green mt-1"></i>
                            <div>
                                <h4 class="font-medium">Drag & Drop</h4>
                                <p class="text-sm text-subtext1">
                                    Upload files easily with drag and drop
                                </p>
                            </div>
                        </li>
                        <li class="flex items-start space-x-3">
                            <i class="fa-solid fa-share-nodes text-yellow mt-1"
                            ></i>
                            <div>
                                <h4 class="font-medium">Share Files</h4>
                                <p class="text-sm text-subtext1">
                                    Generate shareable links for your files
                                </p>
                            </div>
                        </li>
                        <li class="flex items-start space-x-3">
                            <i class="fa-solid fa-lock text-red mt-1"></i>
                            <div>
                                <h4 class="font-medium">Secure</h4>
                                <p class="text-sm text-subtext1">
                                    Your credentials never leave your browser
                                </p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="bg-mantle p-6 rounded-xl shadow-lg">
                    <h3 class="text-lg font-semibold mb-4">
                        Supported Providers
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div
                            class="flex items-center space-x-2 p-3 bg-surface0 rounded-lg"
                        >
                            <i class="fa-brands fa-aws text-orange-500"></i>
                            <span>AWS S3</span>
                        </div>
                        <div
                            class="flex items-center space-x-2 p-3 bg-surface0 rounded-lg"
                        >
                            <i class="fa-solid fa-database text-blue-500"></i>
                            <span>MinIO</span>
                        </div>
                        <div
                            class="flex items-center space-x-2 p-3 bg-surface0 rounded-lg"
                        >
                            <i class="fa-solid fa-cloud text-blue-300"></i>
                            <span>DigitalOcean</span>
                        </div>
                        <div
                            class="flex items-center space-x-2 p-3 bg-surface0 rounded-lg"
                        >
                            <i class="fa-solid fa-cloud text-blue-600"></i>
                            <span>Backblaze B2</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Smooth tab transitions */
    .tab-content {
        animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(5px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: var(--surface0);
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
        background: var(--surface2);
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: var(--surface1);
    }

    /* Code block styling */
    pre {
        background: var(--surface0) !important;
        padding: 1em !important;
        border-radius: 0.5em !important;
        overflow-x: auto !important;
    }

    code {
        color: var(--text) !important;
        font-family: "Fira Code", monospace !important;
    }
</style>
