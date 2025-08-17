<script lang="ts">
    // Remove unused crypto import
    import { onMount, tick } from "svelte";
    import { get } from "svelte/store";
    import JSZip from "jszip";
    import { saveAs } from "file-saver";

    import { credentials, isConnected, customDomain } from "$lib/stores";

    // Remove MD5 calculation as it's not strictly necessary for delete operations
    const calculateMD5 = async (data: string): Promise<string> => {
        const msgUint8 = textEncoder.encode(data);
        const hashBuffer = await crypto.subtle.digest("MD5", msgUint8);
        return bufferToHex(hashBuffer);
    };
    import { getS3Client } from "$lib/s3";
    import {
        ListObjectsV2Command,
        DeleteObjectCommand,
        DeleteObjectsCommand,
        PutObjectCommand,
        CopyObjectCommand,
        GetObjectCommand,
        type _Object,
        type CommonPrefix,
    } from "@aws-sdk/client-s3";
    import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

    import UploadModal from "./UploadModal.svelte";
    import DeleteConfirmationModal from "./DeleteConfirmationModal.svelte";
    import ShareLinkModal from "./ShareLinkModal.svelte";
    import NewFolderModal from "./NewFolderModal.svelte";
    import RenameModal from "./RenameModal.svelte";
    import PreviewModal from "./PreviewModal.svelte";

    let objects: _Object[] = [];
    let folders: CommonPrefix[] = [];
    let isLoading = true;
    let error: string | null = null;
    let currentPrefix = "";
    let history: string[] = [""];
    let historyIndex = 0;

    let showUploadModal = false;
    let showDeleteModal = false;
    let showShareModal = false;
    let showNewFolderModal = false;
    let showRenameModal = false;

    let itemToDelete: { Key?: string; Prefix?: string } | null = null;
    let isFolderDelete = false;
    let isBatchDelete = false;
    let fileToShare: _Object | null = null;
    let itemToRename: { Key?: string; Prefix?: string } | null = null;
    let isFolderRename = false;
    let isDownloading = false;
    let downloadProgress = "";
    let selectedItems = new Set<string>();

    let showPreviewModal = false;
    let fileToPreview: _Object | null = null;

    let viewMode: "list" | "grid" = "list";
    let searchTerm = "";
    let filterType = "all";

    const fileTypeFilters = {
        all: () => true,
        images: (key: string) => /\.(jpe?g|png|gif|bmp|svg)$/i.test(key),
        documents: (key: string) => /\.(pdf|docx?|txt|md)$/i.test(key),
        archives: (key: string) => /\.(zip|tar|gz|rar)$/i.test(key),
    };

    $: filteredFolders = folders.filter((f) =>
        f.Prefix?.replace(currentPrefix, "")
            .replace("/", "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
    );

    $: filteredObjects = objects.filter((o) => {
        const key = o.Key || "";
        const name = key.replace(currentPrefix, "");
        const searchMatch = name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const typeMatch = fileTypeFilters[filterType](key);
        return searchMatch && typeMatch;
    });

    function disconnect() {
        credentials.set(null);
        isConnected.set(false);
        customDomain.set(''); // Clear custom domain on disconnect
    }

    // Computed properties for filtered views
    $: filteredFolders = folders.filter((f) =>
        f.Prefix?.replace(currentPrefix, "")
            .replace("/", "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
    );

    $: filteredObjects = objects.filter((o) => {
        const key = o.Key || "";
        const name = key.replace(currentPrefix, "");
        const searchMatch = name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const typeMatch = fileTypeFilters[filterType](key);
        return searchMatch && typeMatch;
    });

    // Force a complete UI refresh
    async function forceRefresh() {
        const current = currentPrefix;
        console.log("Force refreshing UI for path:", current);

        // Clear all data
        objects = [];
        folders = [];

        // Force UI update with new array references
        objects = [...objects];
        folders = [...folders];

        await tick(); // Ensure UI updates with empty state

        try {
            // Reload data
            await listObjects(current || "");

            // Force one more update cycle
            await tick();

            console.log("UI refresh completed for path:", current);
        } catch (e) {
            console.error("Error during forceRefresh:", e);
            error = `Failed to refresh file list: ${e instanceof Error ? e.message : String(e)}`;
            throw e; // Re-throw to allow callers to handle the error
        }

        // Clear recently deleted folders after a delay (but keep them in localStorage)
        setTimeout(() => {
            console.log("Cleared in-memory deleted folders cache");
            // Don't clear the Set, just save the current state
            saveDeletedFolders();
        }, 1000);
    }

    // Track recently deleted folders to prevent them from appearing in the list
    let recentlyDeletedFolders = new Set<string>();

    // Load deleted folders from localStorage on component mount
    onMount(() => {
        try {
            const saved = localStorage.getItem("deletedFolders");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    parsed.forEach((folder) =>
                        recentlyDeletedFolders.add(folder),
                    );
                    console.log(
                        "Loaded deleted folders from localStorage:",
                        parsed,
                    );
                }
            }
        } catch (e) {
            console.error("Error loading deleted folders:", e);
        }
    });

    // Save deleted folders to localStorage
    function saveDeletedFolders() {
        try {
            localStorage.setItem(
                "deletedFolders",
                JSON.stringify(Array.from(recentlyDeletedFolders)),
            );
        } catch (e) {
            console.error("Error saving deleted folders:", e);
        }
    }

    async function listObjects(prefix: string) {
        console.log("Listing objects for prefix:", prefix);
        isLoading = true;
        error = null;

        try {
            const s3 = getS3Client();
            const creds = get(credentials);

            if (!s3 || !creds) {
                error = "S3 client not initialized.";
                return;
            }

            const command = new ListObjectsV2Command({
                Bucket: creds.bucketName,
                Prefix: prefix,
                Delimiter: "/",
            });

            const response = await s3.send(command);

            // Create new arrays to ensure reactivity
            const newObjects =
                response.Contents?.filter(
                    (obj) =>
                        obj.Key && obj.Key !== prefix && !obj.Key.endsWith("/"),
                ) || [];

            // Filter out recently deleted folders
            const newFolders = (response.CommonPrefixes || []).filter(
                (folder) => !recentlyDeletedFolders.has(folder.Prefix || ""),
            );

            console.log(
                "Listed objects:",
                newObjects.length,
                "filtered folders:",
                newFolders.length,
            );
            console.log(
                "All folder names from API:",
                response.CommonPrefixes?.map((f) => f.Prefix) || [],
            );
            console.log(
                "Filtered folder names:",
                newFolders.map((f) => f.Prefix),
            );

            // Update state with new arrays
            objects = newObjects;
            folders = newFolders;

            // Force reactive updates
            objects = [...objects];
            folders = [...folders];
        } catch (e: any) {
            error = `Failed to list objects: ${e.message}`;
            console.error("Error listing objects:", e);
        } finally {
            isLoading = false;
        }
    }

    function navigateTo(prefix: string, isNavigatingHistory = false) {
        currentPrefix = prefix;
        listObjects(prefix);

        if (!isNavigatingHistory) {
            // If we're not navigating through history, it's a new path.
            // Truncate any 'forward' history that existed.
            history = history.slice(0, historyIndex + 1);
            history.push(prefix);
            historyIndex = history.length - 1;
        }
    }

    function goBack() {
        if (historyIndex > 0) {
            historyIndex--;
            navigateTo(history[historyIndex], true);
        }
    }

    function goForward() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            navigateTo(history[historyIndex], true);
        }
    }

    function getBreadcrumbs() {
        if (!currentPrefix) return [];
        const parts = currentPrefix.split("/").filter((p) => p);
        return parts.map((part, i) => ({
            name: part,
            prefix: parts.slice(0, i + 1).join("/") + "/",
        }));
    }

    function handleUploadComplete() {
        showUploadModal = false;
        listObjects(currentPrefix);
    }

    function openDeleteModal(
        item: { Key?: string; Prefix?: string },
        isFolder: boolean,
    ) {
        itemToDelete = item;
        isFolderDelete = isFolder;
        isBatchDelete = false; // Reset flag for single item deletions
        showDeleteModal = true;
    }

    async function deleteFolder(folderPath: string): Promise<boolean> {
        const s3 = getS3Client();
        const creds = get(credentials);
        if (!s3 || !creds) {
            console.error("S3 client or credentials not available");
            return false;
        }

        try {
            // Ensure the folder path ends with a slash
            if (!folderPath.endsWith("/")) {
                folderPath = folderPath + "/";
            }

            console.log(`Starting deletion of folder: ${folderPath}`);

            // First, try to delete the folder marker directly (works for empty folders)
            try {
                console.log("Attempting to delete folder marker...");
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: creds.bucketName,
                        Key: folderPath,
                        BypassGovernanceRetention: true,
                    }),
                );

                console.log("Successfully deleted folder marker");

                // Add to recently deleted folders to prevent it from showing up
                recentlyDeletedFolders.add(folderPath);
                saveDeletedFolders();
                return true;
            } catch (e) {
                console.log(
                    "Direct folder marker delete failed, trying recursive delete",
                    e,
                );
            }

            // If direct delete failed, proceed with recursive delete
            let isTruncated = true;
            let continuationToken: string | undefined;
            const allObjects: { Key: string; VersionId?: string }[] = [];

            console.log("Listing all objects in folder...");

            // List all objects with this prefix
            while (isTruncated) {
                try {
                    const listCommand = new ListObjectsV2Command({
                        Bucket: creds.bucketName,
                        Prefix: folderPath,
                        ContinuationToken: continuationToken,
                    });

                    const listedObjects = await s3.send(listCommand);

                    if (listedObjects.Contents?.length) {
                        allObjects.push(
                            ...listedObjects.Contents.map(
                                ({ Key, VersionId }) => ({
                                    Key: Key!,
                                    // Include version ID if available for versioned deletes
                                    ...(VersionId ? { VersionId } : {}),
                                }),
                            ),
                        );
                        console.log(
                            `Found ${listedObjects.Contents.length} objects in batch`,
                        );
                    }

                    isTruncated = listedObjects.IsTruncated || false;
                    continuationToken = listedObjects.NextContinuationToken;
                } catch (e) {
                    console.error("Error listing objects:", e);
                    throw new Error(
                        `Failed to list objects in folder: ${e.message}`,
                    );
                }
            }

            console.log(`Found total ${allObjects.length} objects to delete`);

            // If there are objects, delete them in batches of 1000 (S3 limit)
            if (allObjects.length > 0) {
                const BATCH_SIZE = 1000;
                for (let i = 0; i < allObjects.length; i += BATCH_SIZE) {
                    const batch = allObjects.slice(
                        i,
                        Math.min(i + BATCH_SIZE, allObjects.length),
                    );
                    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

                    console.log(
                        `Processing delete batch ${batchNum} with ${batch.length} objects`,
                    );

                    // Create delete parameters
                    const deleteParams = {
                        Bucket: creds.bucketName,
                        Delete: {
                            Objects: batch,
                            Quiet: true,
                        },
                    };

                    try {
                        const command = new DeleteObjectsCommand(deleteParams);
                        const response = await s3.send(command);

                        // Log any errors from the batch operation
                        if (response.Errors?.length > 0) {
                            console.error(
                                `Errors in batch ${batchNum}:`,
                                response.Errors,
                            );
                            for (const err of response.Errors) {
                                console.error(
                                    `Failed to delete ${err.Key}: ${err.Code} - ${err.Message}`,
                                );
                            }
                        } else {
                            console.log(
                                `Successfully processed batch ${batchNum} with ${batch.length} objects`,
                            );
                        }
                    } catch (e) {
                        console.error(`Error processing batch ${batchNum}:`, e);
                        // Continue with next batch even if one fails
                    }
                }
            }

            // Finally, try to delete the folder marker again
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: creds.bucketName,
                        Key: folderPath,
                        BypassGovernanceRetention: true,
                    }),
                );
                console.log(
                    "Successfully deleted folder marker after content removal",
                );
            } catch (e) {
                console.log(
                    "Final folder marker delete failed, but continuing",
                );
            }

            // Add to recently deleted folders to prevent it from showing up
            recentlyDeletedFolders.add(folderPath);
            saveDeletedFolders();

            console.log(`Successfully processed folder: ${folderPath}`);
            return true;
        } catch (error) {
            console.error("Error in deleteFolder:", error);
            return false;
        }
    }

    async function handleDeleteConfirm() {
        const s3 = getS3Client();
        const creds = get(credentials);
        if (!s3 || !creds) {
            error = "Not connected to S3";
            return;
        }

        isLoading = true;
        error = null;
        console.log("--- Starting Delete Operation ---");

        try {
            // Handle batch deletion
            if (isBatchDelete && selectedItems.size > 0) {
                console.log(
                    `Processing ${selectedItems.size} selected items for deletion`,
                );

                // Separate files and folders
                const filesToDelete: { Key: string }[] = [];
                const foldersToDelete: string[] = [];

                // Categorize items
                for (const key of selectedItems) {
                    if (!key) continue;
                    if (key.endsWith("/")) {
                        foldersToDelete.push(key);
                    } else {
                        filesToDelete.push({ Key: key });
                    }
                }

                console.log(
                    `Found ${foldersToDelete.length} folders and ${filesToDelete.length} files to delete`,
                );

                // First, delete all folders and their contents
                for (const folderPath of foldersToDelete) {
                    if (!folderPath) continue;

                    console.log(
                        `Deleting folder and its contents: ${folderPath}`,
                    );
                    try {
                        const success = await deleteFolder(folderPath);
                        if (!success) {
                            console.error(
                                `Failed to delete folder: ${folderPath}`,
                            );
                            // Continue with next folder even if one fails
                        }
                    } catch (e) {
                        console.error(
                            `Error deleting folder ${folderPath}:`,
                            e,
                        );
                    }
                }

                // Then, delete all individual files in batches
                if (filesToDelete.length > 0) {
                    console.log(
                        `Deleting ${filesToDelete.length} individual files in batches`,
                    );
                    const BATCH_SIZE = 1000;
                    let successCount = 0;
                    let failCount = 0;

                    for (let i = 0; i < filesToDelete.length; i += BATCH_SIZE) {
                        const batch = filesToDelete.slice(i, i + BATCH_SIZE);
                        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                        console.log(
                            `Processing batch ${batchNum} with ${batch.length} files`,
                        );

                        try {
                            // Ensure we have valid keys in the batch
                            const validBatch = batch.filter(
                                (item) => item && item.Key,
                            );
                            if (validBatch.length === 0) {
                                console.log(`Skipping empty batch ${batchNum}`);
                                continue;
                            }

                            const deleteParams = {
                                Bucket: creds.bucketName,
                                Delete: {
                                    Objects: validBatch,
                                    Quiet: true,
                                },
                            };

                            console.log(
                                "Delete params:",
                                JSON.stringify(deleteParams, null, 2),
                            );

                            const command = new DeleteObjectsCommand(
                                deleteParams,
                            );
                            const response = await s3.send(command);

                            // Log any errors from the batch operation
                            if (response.Errors?.length > 0) {
                                console.error(
                                    `Errors in batch ${batchNum}:`,
                                    response.Errors,
                                );
                                for (const err of response.Errors) {
                                    console.error(
                                        `Failed to delete ${err.Key}: ${err.Code} - ${err.Message}`,
                                    );
                                    failCount++;
                                }
                            }

                            if (response.Deleted?.length) {
                                console.log(
                                    `Successfully deleted ${response.Deleted.length} files in batch ${batchNum}`,
                                );
                                successCount += response.Deleted.length;
                            }
                        } catch (e) {
                            failCount += Math.min(
                                BATCH_SIZE,
                                filesToDelete.length - i,
                            );
                            console.error(
                                `Error processing batch ${batchNum}:`,
                                e,
                            );
                            // Continue with next batch even if one fails
                        }
                    }

                    console.log(
                        `Batch delete completed. Success: ${successCount}, Failed: ${failCount}`,
                    );

                    if (failCount > 0) {
                        error = `Failed to delete ${failCount} file(s). Check console for details.`;
                    }
                }
            }
            // Handle single folder deletion
            else if (isFolderDelete && itemToDelete?.Prefix) {
                const success = await deleteFolder(itemToDelete.Prefix);
                if (!success) {
                    error = "Failed to delete folder";
                    return;
                }
            }
            // Handle single file deletion
            else if (itemToDelete?.Key) {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: creds.bucketName,
                        Key: itemToDelete.Key,
                    } as const),
                );
            }
            // Force refresh the UI after all operations complete
            try {
                // Clear the selection after successful deletion
                selectedItems = new Set();

                // Force refresh the file list
                await forceRefresh();

                console.log("--- Delete Finished Successfully ---");
            } catch (e: any) {
                error = `Failed to refresh after delete: ${e.message}`;
                console.error("Error refreshing after delete:", e);
                throw e; // Re-throw to be caught by the outer try-catch
            }
        } catch (e: any) {
            error = `Failed to delete: ${e.message}`;
            console.error("--- Delete Failed ---", e);
        } finally {
            showDeleteModal = false;
            itemToDelete = null;
            isBatchDelete = false;
            isLoading = false;
        }
    }

    function openShareModal(file: _Object) {
        fileToShare = file;
        showShareModal = true;
    }

    // Quick copy custom domain URL to clipboard
    function quickCopyCustomDomainUrl(file: _Object) {
        const domain = get(customDomain);
        if (domain && file.Key) {
            const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
            const customDomainLink = `${cleanDomain}/${file.Key}`;
            
            navigator.clipboard.writeText(customDomainLink).then(() => {
                // Show success message (you can replace this with a toast notification if available)
                const fileName = file.Key?.split('/').pop() || 'file';
                console.log(`Custom domain URL copied: ${fileName}`);
                // You could add a toast here: showToast(`Custom domain URL copied for ${fileName}`, 'success');
            }).catch(err => {
                console.error('Failed to copy to clipboard:', err);
                // You could add an error toast here: showToast('Failed to copy URL', 'error');
            });
        }
    }

    async function handleCreateFolder(
        event: CustomEvent<{ folderName: string }>,
    ) {
        const { folderName } = event.detail;
        const s3 = getS3Client();
        const creds = get(credentials);
        if (!s3 || !creds || !folderName) return;

        try {
            const command = new PutObjectCommand({
                Bucket: creds.bucketName,
                Key: `${currentPrefix}${folderName}/`,
                Body: "",
            });
            await s3.send(command);
            listObjects(currentPrefix);
        } catch (e: any) {
            error = `Failed to create folder: ${e.message}`;
        } finally {
            showNewFolderModal = false;
        }
    }

    function openRenameModal(
        item: { Key?: string; Prefix?: string },
        isFolder: boolean,
    ) {
        itemToRename = item;
        isFolderRename = isFolder;
        showRenameModal = true;
    }

    function openPreviewModal(file: _Object) {
        fileToPreview = file;
        showPreviewModal = true;
    }

    function handleCheckboxChange(key: string | undefined) {
        if (!key) return () => {};

        return (event: Event) => {
            event.stopPropagation();
            const target = event.target as HTMLInputElement;

            // Create a completely new Set to force reactivity
            const newSelected = new Set(selectedItems);

            if (target.checked) {
                newSelected.add(key);
            } else {
                newSelected.delete(key);
            }

            // Force update by creating a new Set
            selectedItems = new Set(Array.from(newSelected));

            // Force a re-render by updating the array references
            objects = [...objects];
            folders = [...folders];
        };
    }

    function isSelected(key: string | undefined): boolean {
        if (!key) return false;
        return selectedItems.has(key);
    }

    function handleKeydown(event: KeyboardEvent, action: () => void) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            action();
        }
    }

    function toggleSelection(key: string, shouldSelect: boolean) {
        // Create a new Set to ensure reactivity
        const newSelected = new Set(selectedItems);

        if (shouldSelect) {
            newSelected.add(key);
        } else {
            newSelected.delete(key);
        }

        // Update with a new Set to trigger reactivity
        selectedItems = new Set(newSelected);
    }

    function toggleSelectAll(event: Event) {
        const target = event.target as HTMLInputElement;
        const isChecked = target.checked;

        // Get all visible keys
        const allVisibleKeys = [
            ...(filteredFolders
                .map((f) => f.Prefix)
                .filter(Boolean) as string[]),
            ...(filteredObjects.map((o) => o.Key).filter(Boolean) as string[]),
        ];

        if (allVisibleKeys.length === 0) return;

        // Create a completely new Set
        const newSelected = new Set(selectedItems);

        if (isChecked) {
            // Add all visible items
            allVisibleKeys.forEach((key) => newSelected.add(key));
        } else {
            // Remove all visible items
            allVisibleKeys.forEach((key) => newSelected.delete(key));
        }

        // Force update by creating a new Set from array
        selectedItems = new Set(Array.from(newSelected));

        // Force re-render of the lists by updating the array references
        objects = [...objects];
        folders = [...folders];
    }

    $: allVisibleSelected = (() => {
        const allVisibleKeys = [
            ...(filteredFolders
                .map((f) => f.Prefix)
                .filter(Boolean) as string[]),
            ...(filteredObjects.map((o) => o.Key).filter(Boolean) as string[]),
        ];

        if (allVisibleKeys.length === 0) return false;

        // Check if all visible items are selected
        const allSelected = allVisibleKeys.every((key) =>
            selectedItems.has(key),
        );

        // Force a UI update by using the value in a way that Svelte tracks it
        // This helps with the visual feedback
        if (allSelected) {
            // This is just to ensure reactivity
            return allVisibleKeys.length > 0;
        }

        return false;
    })();

    function handleBatchDeleteClick() {
        if (selectedItems.size === 0) return;
        itemToDelete = { Prefix: `${selectedItems.size} item(s)` };
        isFolderDelete = true; // For modal display purposes
        isBatchDelete = true;
        showDeleteModal = true;
    }

    async function downloadWithPresignedUrl(key: string) {
        const s3 = getS3Client();
        if (!s3) return;
        const command = new GetObjectCommand({
            Bucket: $credentials?.bucketName,
            Key: key,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 60 });
        saveAs(url, key.split("/").pop());
    }

    async function listAllObjects(prefix: string): Promise<{ Key?: string }[]> {
        const s3 = getS3Client();
        const creds = get(credentials);
        if (!s3 || !creds) return [];

        let allObjects: { Key?: string }[] = [];
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;

        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: creds.bucketName,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            });
            const response = await s3.send(command);
            if (response.Contents) {
                allObjects = [...allObjects, ...response.Contents];
            }
            isTruncated = !!response.IsTruncated;
            continuationToken = response.NextContinuationToken;
        }

        return allObjects;
    }

    async function addFolderToZip(zip: JSZip, folderPrefix: string) {
        const objectsInFolder = await listAllObjects(folderPrefix);
        downloadProgress = `Zipping ${folderPrefix}... (0/${objectsInFolder.length})`;
        let i = 0;
        for (const obj of objectsInFolder) {
            const s3 = getS3Client();
            if (!s3 || !obj.Key) continue;
            const command = new GetObjectCommand({
                Bucket: $credentials?.bucketName,
                Key: obj.Key,
            });
            const url = await getSignedUrl(s3, command, { expiresIn: 60 });
            const response = await fetch(url);
            const blob = await response.blob();
            const relativePath = obj.Key.substring(folderPrefix.length);
            zip.file(relativePath, blob);
            i++;
            downloadProgress = `Zipping ${folderPrefix}... (${i}/${objectsInFolder.length})`;
        }
    }

    async function handleDownload(
        item: { Key?: string; Prefix?: string },
        isFolder: boolean,
    ) {
        isDownloading = true;
        downloadProgress = "Starting download...";
        const s3 = getS3Client();
        const creds = get(credentials);
        if (!s3 || !creds) {
            error = "S3 client not initialized.";
            isDownloading = false;
            return;
        }

        try {
            if (isFolder && item.Prefix) {
                const folderName =
                    item.Prefix.split("/").filter(Boolean).pop() || "archive";
                const zip = new JSZip();

                const allObjects: _Object[] = [];
                let isTruncated = true;
                let continuationToken: string | undefined = undefined;
                while (isTruncated) {
                    const command = new ListObjectsV2Command({
                        Bucket: creds.bucketName,
                        Prefix: item.Prefix,
                        ContinuationToken: continuationToken,
                    });
                    const response = await s3.send(command);
                    if (response.Contents) {
                        allObjects.push(...response.Contents);
                    }
                    isTruncated = !!response.IsTruncated;
                    continuationToken = response.NextContinuationToken;
                }

                const filesToDownload = allObjects.filter(
                    (obj) => obj.Key && !obj.Key.endsWith("/"),
                );

                if (filesToDownload.length === 0) {
                    const content = await zip.generateAsync({ type: "blob" });
                    saveAs(content, `${folderName}.zip`);
                    isDownloading = false;
                    return;
                }

                let i = 0;
                for (const obj of filesToDownload) {
                    i++;
                    downloadProgress = `Downloading ${folderName}... (${i}/${filesToDownload.length})`;
                    const getObjCommand = new GetObjectCommand({
                        Bucket: creds.bucketName,
                        Key: obj.Key,
                    });
                    const response = await s3.send(getObjCommand);
                    const blob = await response.Body?.transformToByteArray();
                    if (blob) {
                        const relativePath = obj.Key!.substring(
                            item.Prefix.length,
                        );
                        zip.file(relativePath, blob);
                    }
                }

                downloadProgress = "Zipping files...";
                const content = await zip.generateAsync({ type: "blob" });
                saveAs(content, `${folderName}.zip`);
            } else if (!isFolder && item.Key) {
                await downloadWithPresignedUrl(item.Key);
            }
        } catch (e: any) {
            error = `Download failed: ${e.message}`;
        } finally {
            isDownloading = false;
            downloadProgress = "";
        }
    }

    async function handleBatchDownload() {
        if (selectedItems.size === 0) return;
        isDownloading = true;
        downloadProgress = "Preparing download...";
        error = null;

        try {
            const zip = new JSZip();
            const s3 = getS3Client();
            const creds = get(credentials);

            if (!s3 || !creds) {
                throw new Error("S3 client not initialized");
            }

            let processedCount = 0;
            const totalItems = selectedItems.size;

            // Process each selected item
            for (const itemKey of selectedItems) {
                processedCount++;
                const isFolder = filteredFolders.some(
                    (f) => f.Prefix === itemKey,
                );

                try {
                    if (isFolder) {
                        const folderName =
                            itemKey.split("/").filter(Boolean).pop() ||
                            "folder";
                        downloadProgress = `Processing folder ${folderName} (${processedCount}/${totalItems})...`;

                        const folderZip = zip.folder(folderName) || zip;
                        await addFolderToZip(folderZip, itemKey);
                    } else {
                        const fileName = itemKey.split("/").pop() || "file";
                        downloadProgress = `Downloading ${fileName} (${processedCount}/${totalItems})...`;

                        const command = new GetObjectCommand({
                            Bucket: creds.bucketName,
                            Key: itemKey,
                        });

                        const response = await s3.send(command);
                        const blob =
                            await response.Body?.transformToByteArray();

                        if (blob) {
                            zip.file(fileName, blob);
                        }
                    }
                } catch (e) {
                    console.error(`Error processing ${itemKey}:`, e);
                    // Continue with next item even if one fails
                }
            }

            // Generate and save the zip file
            downloadProgress = "Creating archive...";
            const content = await zip.generateAsync(
                {
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: { level: 6 },
                },
                (metadata) => {
                    if (metadata.percent) {
                        downloadProgress = `Creating archive... ${Math.round(metadata.percent)}%`;
                    }
                },
            );

            saveAs(
                content,
                `bucket-download-${new Date().toISOString().slice(0, 10)}.zip`,
            );
            downloadProgress = "Download complete!";
        } catch (e: any) {
            console.error("Download failed:", e);
            error = `Download failed: ${e.message}`;
        } finally {
            setTimeout(() => {
                downloadProgress = "";
                isDownloading = false;
            }, 2000); // Keep the completion message visible for 2 seconds
        }
    }

    async function handleRename(event: CustomEvent<{ newName: string }>) {
        if (!itemToRename) return;

        const { newName } = event.detail;
        const s3 = getS3Client();
        const creds = get(credentials);
        if (!s3 || !creds) return;

        try {
            if (isFolderRename) {
                const oldPrefix = itemToRename.Prefix!;
                const newPrefix = `${currentPrefix}${newName}/`;
                const listCommand = new ListObjectsV2Command({
                    Bucket: creds.bucketName,
                    Prefix: oldPrefix,
                });

                const listedObjects = await s3.send(listCommand);

                if (listedObjects.Contents) {
                    // Copy all objects to new location first
                    for (const obj of listedObjects.Contents) {
                        const copySource = `${creds.bucketName}/${obj.Key}`;
                        const newKey = obj.Key!.replace(oldPrefix, newPrefix);
                        const copyCommand = new CopyObjectCommand({
                            Bucket: creds.bucketName,
                            CopySource: copySource,
                            Key: newKey,
                        });
                        await s3.send(copyCommand);
                    }

                    // Then delete the old objects
                    const deleteCommand = new DeleteObjectsCommand({
                        Bucket: creds.bucketName,
                        Delete: {
                            Objects: listedObjects.Contents.map((obj) => ({
                                Key: obj.Key!,
                            })),
                            Quiet: true,
                        },
                    });

                    // Add Content-MD5 header for the delete operation
                    const command = new DeleteObjectsCommand(
                        deleteCommand.input,
                    );
                    command.middlewareStack.add(
                        (next) => async (args) => {
                            args.request.headers["Content-MD5"] =
                                calculateContentMd5(deleteCommand.input.Delete);
                            return next(args);
                        },
                        { step: "build" },
                    );

                    await s3.send(command);
                }
            } else {
                // Handle file rename
                const oldKey = itemToRename.Key!;
                const keyParts = oldKey.split("/");
                keyParts.pop();
                const newKey =
                    (keyParts.length > 0 ? keyParts.join("/") + "/" : "") +
                    newName;

                // Copy to new location
                const copyCommand = new CopyObjectCommand({
                    Bucket: creds.bucketName,
                    CopySource: `${creds.bucketName}/${oldKey}`,
                    Key: newKey,
                });
                await s3.send(copyCommand);

                // Delete the old object
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: creds.bucketName,
                    Key: oldKey,
                });
                await s3.send(deleteCommand);
            }

            // Refresh the current view
            listObjects(currentPrefix);
        } catch (e: any) {
            console.error("Rename failed:", e);
            error = `Failed to rename: ${e.message}`;
        } finally {
            showRenameModal = false;
            itemToRename = null;
        }
    }

    onMount(() => {
        navigateTo("", true); // Initial load
    });
</script>

{#if showUploadModal}
    <UploadModal
        prefix={currentPrefix}
        on:close={() => (showUploadModal = false)}
        on:uploadComplete={handleUploadComplete}
    />
{/if}

{#if showDeleteModal && itemToDelete}
    <DeleteConfirmationModal
        item={itemToDelete}
        isFolder={isFolderDelete}
        on:close={() => (showDeleteModal = false)}
        on:confirm={handleDeleteConfirm}
    />
{/if}

{#if showShareModal && fileToShare}
    <ShareLinkModal
        file={fileToShare}
        on:close={() => (showShareModal = false)}
    />
{/if}

{#if showNewFolderModal}
    <NewFolderModal
        on:close={() => (showNewFolderModal = false)}
        on:create={handleCreateFolder}
    />
{/if}

{#if showRenameModal && itemToRename}
    <RenameModal
        currentName={isFolderRename
            ? itemToRename.Prefix?.split("/")
                  .filter((p) => p)
                  .pop() || ""
            : itemToRename.Key?.split("/").pop() || ""}
        on:close={() => (showRenameModal = false)}
        on:save={handleRename}
    />
{/if}

{#if showPreviewModal && fileToPreview}
    <PreviewModal
        file={fileToPreview}
        on:close={() => (showPreviewModal = false)}
    />
{/if}

{#if isDownloading}
    <div
        class="fixed bottom-4 right-4 bg-surface1 p-4 rounded-lg shadow-lg z-50"
    >
        <div class="flex items-center gap-3">
            <span class="loading loading-spinner"></span>
            <span>{downloadProgress}</span>
        </div>
    </div>
{/if}

<div class="min-h-screen bg-base text-text p-4 sm:p-8">
    <div class="container mx-auto">
        <!-- Header -->
        <header
            class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6"
        >
            <div class="flex items-center gap-2">
                <i
                    class="fa-solid fa-box-archive text-3xl sm:text-4xl text-mauve"
                ></i>
                <h1 class="text-3xl sm:text-4xl font-bold text-mauve">
                    BucketClient
                </h1>
            </div>
            <div
                class="flex items-center gap-2 flex-wrap justify-center sm:justify-end"
            >
                {#if $isConnected && $credentials?.bucketName}
                    <div
                        class="indicator flex items-center gap-2 mr-4 text-sm font-medium text-neutral-700 dark:text-gray-300"
                    >
                        <span
                            class="bg-green rounded-full w-1.5 h-1.5 shadow-[0_0_5px_3px_rgba(34,197,94,0.7)] animate-pulse"
                        ></span>
                        <!-- <span
                            class="bg-green rounded-full w-2 h-2 shadow-lg shadow-green-500 animate-pulse"
                        ></span> -->
                        <span class="">{$credentials.bucketName}</span>
                    </div>
                {/if}
                <button
                    on:click={disconnect}
                    class="btn btn-sm sm:btn-md bg-red text-white hover:bg-maroon"
                    >Disconnect</button
                >
            </div>
        </header>

        <!-- Search and Filter Bar -->
        <div class="flex flex-col sm:flex-row gap-4 mb-4">
            <input
                type="text"
                placeholder="Search files and folders..."
                bind:value={searchTerm}
                class="input input-bordered w-full bg-surface0"
            />
            <select
                bind:value={filterType}
                class="select select-bordered w-full sm:w-auto bg-surface0"
            >
                <option value="all">All Types</option>
                <option value="images">Images</option>
                <option value="documents">Documents</option>
                <option value="archives">Archives</option>
            </select>
        </div>

        <!-- Main Content Area -->
        <main class="p-4 sm:p-6 bg-mantle rounded-lg shadow-lg">
            <!-- Breadcrumbs -->
            <!-- Batch Action Bar -->
            {#if selectedItems.size > 0}
                <div
                    class="flex items-center justify-between gap-4 mb-4 p-3 bg-surface0 rounded-lg"
                >
                    <span class="text-text"
                        >{selectedItems.size} item(s) selected</span
                    >
                    <div>
                        <button
                            on:click={handleBatchDeleteClick}
                            class="btn btn-sm bg-red text-white hover:bg-maroon"
                        >
                            <i class="fa-solid fa-trash mr-2"></i>Delete
                        </button>
                        <button
                            on:click={handleBatchDownload}
                            class="btn btn-sm bg-green text-white hover:bg-teal"
                            disabled={isDownloading}
                        >
                            <i class="fa-solid fa-download mr-2"></i>Download
                        </button>
                    </div>
                </div>
            {/if}

            <div
                class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 text-sm sm:text-lg text-subtext1"
            >
                <div class="flex items-center gap-4">
                    <div class="join">
                        <button
                            on:click={goBack}
                            class="btn btn-sm sm:btn-md join-item"
                            disabled={historyIndex <= 0}
                            title="Back"
                            ><i class="fa-solid fa-arrow-left"></i></button
                        >
                        <button
                            on:click={goForward}
                            class="btn btn-sm sm:btn-md join-item"
                            disabled={historyIndex >= history.length - 1}
                            title="Forward"
                            ><i class="fa-solid fa-arrow-right"></i></button
                        >
                    </div>
                    <div
                        class="flex items-center whitespace-nowrap overflow-x-auto"
                    >
                        <button
                            class="hover:text-mauve"
                            on:click={() => navigateTo("")}
                            >{$credentials?.bucketName}</button
                        >
                        {#each getBreadcrumbs() as crumb}
                            <span class="mx-2">/</span>
                            <button
                                class="hover:text-mauve"
                                on:click={() => navigateTo(crumb.prefix)}
                                >{crumb.name}</button
                            >
                        {/each}
                    </div>
                </div>
                <div class="flex items-center gap-2 justify-end pt-2 sm:pt-0">
                    <div class="join">
                        <button
                            on:click={() => (viewMode = "list")}
                            class="btn btn-sm sm:btn-md join-item"
                            class:btn-active={viewMode === "list"}
                            title="List View"
                            ><i class="fa-solid fa-list"></i></button
                        >
                        <button
                            on:click={() => (viewMode = "grid")}
                            class="btn btn-sm sm:btn-md join-item"
                            class:btn-active={viewMode === "grid"}
                            title="Grid View"
                            ><i class="fa-solid fa-grip"></i></button
                        >
                    </div>
                    <button
                        on:click={() => (showNewFolderModal = true)}
                        class="btn btn-sm sm:btn-md bg-blue text-white hover:bg-sapphire"
                    >
                        <i class="fa-solid fa-folder-plus"></i>
                    </button>
                    <button
                        on:click={() => (showUploadModal = true)}
                        class="btn btn-sm sm:btn-md bg-green text-white hover:bg-teal"
                    >
                        <i class="fa-solid fa-upload"></i>
                    </button>
                </div>
            </div>

            <!-- Current Path Display -->
            <div
                class="mt-4 mb-2 p-2 bg-surface0 rounded-md text-sm text-subtext0 overflow-x-auto whitespace-nowrap"
            >
                <span class="font-bold">/</span>
                {currentPrefix
                    ? `${$credentials?.bucketName}/${currentPrefix}`
                    : $credentials?.bucketName}
            </div>

            <!-- File Display -->
            {#if isLoading}
                <p class="text-subtext1">Loading files...</p>
            {:else if error}
                <div class="p-4 bg-red/20 text-red rounded-md">
                    <p>{error}</p>
                </div>
            {:else if filteredObjects.length === 0 && filteredFolders.length === 0}
                <p class="text-subtext1">
                    This folder is empty or no items match your search.
                </p>
            {:else if viewMode === "list"}
                <div
                    class="p-3 bg-surface0 rounded-lg mb-2 hidden sm:flex items-center"
                >
                    <input
                        type="checkbox"
                        class="checkbox mr-3"
                        on:change={toggleSelectAll}
                        checked={allVisibleSelected}
                    />
                    <span style="margin-left: 0.5rem;">Select All</span>
                </div>
                <ul class="space-y-2">
                    <!-- Folder List -->
                    {#each filteredFolders as folder (folder.Prefix)}
                        <li
                            class="flex items-center justify-between p-3 bg-surface0 rounded-lg hover:bg-surface1 transition-colors duration-200"
                        >
                            <div class="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    class="checkbox"
                                    checked={isSelected(folder.Prefix)}
                                    on:change={handleCheckboxChange(
                                        folder.Prefix,
                                    )}
                                />
                                <div
                                    class="flex items-center gap-3 cursor-pointer overflow-hidden"
                                    on:click={() =>
                                        navigateTo(folder.Prefix || "")}
                                    on:keydown={(e) =>
                                        handleKeydown(e, () =>
                                            navigateTo(folder.Prefix || ""),
                                        )}
                                    role="button"
                                    tabindex="0"
                                >
                                    <i
                                        class="fa-solid fa-folder text-yellow text-xl"
                                    ></i>
                                    <span class="truncate"
                                        >{folder.Prefix?.replace(
                                            currentPrefix,
                                            "",
                                        ).replace("/", "")}</span
                                    >
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <button
                                    on:click|stopPropagation={() =>
                                        handleDownload(folder, true)}
                                    class="text-subtext0 hover:text-blue transition-colors"
                                    ><i class="fa-solid fa-download"
                                    ></i></button
                                >
                                <button
                                    on:click|stopPropagation={() =>
                                        openRenameModal(folder, true)}
                                    class="text-subtext0 hover:text-yellow transition-colors"
                                    ><i class="fa-solid fa-pen-to-square"
                                    ></i></button
                                >
                                <button
                                    on:click|stopPropagation={() =>
                                        openDeleteModal(folder, true)}
                                    class="text-subtext0 hover:text-red transition-colors"
                                    ><i class="fa-solid fa-trash"></i></button
                                >
                            </div>
                        </li>
                    {/each}
                    <!-- File List -->
                    {#each filteredObjects as object (object.Key)}
                        <li
                            class="flex items-center justify-between p-3 bg-surface0 rounded-lg hover:bg-surface1 transition-colors duration-200"
                        >
                            <div class="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    class="checkbox"
                                    checked={isSelected(object.Key)}
                                    on:change={handleCheckboxChange(object.Key)}
                                />
                                <div
                                    class="flex items-center gap-3 overflow-hidden cursor-pointer"
                                    on:click={() => openPreviewModal(object)}
                                    on:keydown={(e) =>
                                        handleKeydown(e, () =>
                                            openPreviewModal(object),
                                        )}
                                    role="button"
                                    tabindex="0"
                                >
                                    <i
                                        class="fa-solid fa-file text-text text-xl"
                                    ></i>
                                    <span class="truncate"
                                        >{object.Key?.replace(
                                            currentPrefix,
                                            "",
                                        )}</span
                                    >
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <!-- Quick copy custom domain URL button (only show if custom domain is set) -->
                                {#if $customDomain}
                                    <button
                                        on:click|stopPropagation={() =>
                                            quickCopyCustomDomainUrl(object)}
                                        class="text-subtext0 hover:text-green transition-colors"
                                        title="Copy custom domain URL"
                                        ><i class="fa-solid fa-link"
                                        ></i></button
                                    >
                                {/if}
                                <button
                                    on:click={() =>
                                        handleDownload(object, false)}
                                    class="text-subtext0 hover:text-blue transition-colors"
                                    ><i class="fa-solid fa-download"
                                    ></i></button
                                >
                                <button
                                    on:click={() =>
                                        openRenameModal(object, false)}
                                    class="text-subtext0 hover:text-yellow transition-colors"
                                    ><i class="fa-solid fa-pen-to-square"
                                    ></i></button
                                >
                                <button
                                    on:click={() => openShareModal(object)}
                                    class="text-subtext0 hover:text-green transition-colors"
                                    ><i class="fa-solid fa-share-nodes"
                                    ></i></button
                                >
                                <button
                                    on:click={() =>
                                        openDeleteModal(object, false)}
                                    class="text-subtext0 hover:text-red transition-colors"
                                    ><i class="fa-solid fa-trash"></i></button
                                >
                            </div>
                        </li>
                    {/each}
                </ul>
            {:else}
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"
                >
                    <!-- Folder Grid -->
                    {#each filteredFolders as folder (folder.Prefix)}
                        <div
                            class="relative flex flex-col items-center justify-center p-4 bg-surface0 rounded-lg hover:bg-surface1 transition-all duration-200 group grid-item"
                        >
                            <div
                                class="absolute top-2 left-2 z-10 flex items-center"
                            >
                                <input
                                    type="checkbox"
                                    class="checkbox"
                                    checked={isSelected(folder.Prefix)}
                                    on:change={handleCheckboxChange(
                                        folder.Prefix,
                                    )}
                                    on:click|stopPropagation
                                />
                            </div>
                            <div
                                class="w-full h-full"
                                on:click={() => navigateTo(folder.Prefix || "")}
                                on:keydown={(e) =>
                                    handleKeydown(e, () =>
                                        navigateTo(folder.Prefix || ""),
                                    )}
                                role="button"
                                tabindex="0"
                            >
                                <i
                                    class="fa-solid fa-folder text-yellow text-5xl mb-2"
                                ></i>
                                <span class="text-center break-all w-full"
                                    >{folder.Prefix?.replace(
                                        currentPrefix,
                                        "",
                                    ).replace("/", "")}</span
                                >
                            </div>
                            <div
                                class="absolute bottom-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <button
                                    on:click|stopPropagation={() =>
                                        handleDownload(folder, true)}
                                    class="text-subtext0 hover:text-blue transition-colors p-1 bg-base/50 rounded"
                                    ><i class="fa-solid fa-download"
                                    ></i></button
                                >
                                <button
                                    on:click|stopPropagation={() =>
                                        openRenameModal(folder, true)}
                                    class="text-subtext0 hover:text-yellow transition-colors p-1 bg-base/50 rounded"
                                    ><i class="fa-solid fa-pen-to-square"
                                    ></i></button
                                >
                                <button
                                    on:click|stopPropagation={() =>
                                        openDeleteModal(folder, true)}
                                    class="text-subtext0 hover:text-red transition-colors p-1 bg-base/50 rounded"
                                    ><i class="fa-solid fa-trash"></i></button
                                >
                            </div>
                        </div>
                    {/each}
                    <!-- File Grid -->
                    {#each filteredObjects as object (object.Key)}
                        <div
                            class="relative flex flex-col items-center justify-center p-4 bg-surface0 rounded-lg hover:bg-surface1 transition-all duration-200 group grid-item"
                        >
                            <div
                                class="absolute top-2 left-2 z-10 flex items-center"
                            >
                                <input
                                    type="checkbox"
                                    class="checkbox"
                                    checked={isSelected(object.Key)}
                                    on:change={handleCheckboxChange(object.Key)}
                                    on:click|stopPropagation
                                />
                            </div>
                            <div
                                class="w-full h-full"
                                on:click={() => openPreviewModal(object)}
                                on:keydown={(e) =>
                                    handleKeydown(e, () =>
                                        openPreviewModal(object),
                                    )}
                                role="button"
                                tabindex="0"
                            >
                                <i
                                    class="fa-solid fa-file text-blue text-5xl mb-2"
                                ></i>
                                <span class="text-center break-all w-full"
                                    >{object.Key?.replace(
                                        currentPrefix,
                                        "",
                                    )}</span
                                >
                            </div>
                            <div
                                class="absolute bottom-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <!-- Quick copy custom domain URL button (only show if custom domain is set) -->
                                {#if $customDomain}
                                    <button
                                        on:click|stopPropagation={() =>
                                            quickCopyCustomDomainUrl(object)}
                                        class="text-subtext0 hover:text-green transition-colors p-1 bg-base/50 rounded"
                                        title="Copy custom domain URL"
                                        ><i class="fa-solid fa-link"
                                        ></i></button
                                    >
                                {/if}
                                <button
                                    on:click|stopPropagation={() =>
                                        handleDownload(object, false)}
                                    class="text-subtext0 hover:text-blue transition-colors p-1 bg-base/50 rounded"
                                    ><i class="fa-solid fa-download"
                                    ></i></button
                                >
                                <button
                                    on:click|stopPropagation={() =>
                                        openRenameModal(object, false)}
                                    class="text-subtext0 hover:text-yellow transition-colors p-1 bg-base/50 rounded"
                                    ><i class="fa-solid fa-pen-to-square"
                                    ></i></button
                                >
                                <button
                                    on:click|stopPropagation={() =>
                                        openShareModal(object)}
                                    class="text-subtext0 hover:text-green transition-colors p-1 bg-base/50 rounded"
                                    ><i class="fa-solid fa-share-nodes"
                                    ></i></button
                                >
                                <button
                                    on:click|stopPropagation={() =>
                                        openDeleteModal(object, false)}
                                    class="text-subtext0 hover:text-red transition-colors p-1 bg-base/50 rounded"
                                    ><i class="fa-solid fa-trash"></i></button
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </main>
    </div>
</div>

<style>
    .checkbox {
        border-radius: 0.25rem;
        border: 1px solid #4c4f69; /* Base border color */
        width: 1.25rem;
        height: 1.25rem;
        margin: 0;
        position: relative;
        top: 0.125rem;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        background-color: var(--color-surface0);
        transition: all 0.2s ease;
    }

    .checkbox:checked {
        background-color: #8aadf4; /* Blue color when checked */
        border-color: #8aadf4;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231e1e2e' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
    }

    .checkbox:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(138, 173, 244, 0.5);
    }

    .grid-item .checkbox {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .grid-item:hover .checkbox,
    .grid-item:focus-within .checkbox,
    .checkbox:checked {
        opacity: 1;
    }

    .grid-item {
        position: relative;
        min-height: 120px;
    }
</style>
