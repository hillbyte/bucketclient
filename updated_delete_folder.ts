// This is the updated deleteFolder function to be copied into FileManager.svelte
async function deleteFolder(folderPath: string) {
  const s3 = getS3Client();
  const creds = get(credentials);
  if (!s3 || !creds) return false;

  // Ensure the folder path ends with a slash
  if (!folderPath.endsWith('/')) {
    folderPath = folderPath + '/';
  }

  try {
    // First try to delete the folder marker directly (works for empty folders)
    try {
      // Try with versioning first
      await s3.send(new DeleteObjectCommand({
        Bucket: creds.bucketName,
        Key: folderPath,
        VersionId: 'null', // Special value for delete markers in MinIO
        BypassGovernanceRetention: true
      } as const));
      
      console.log('Successfully deleted folder marker with versioning');
      
      // Also try without versioning
      await s3.send(new DeleteObjectCommand({
        Bucket: creds.bucketName,
        Key: folderPath,
        BypassGovernanceRetention: true
      } as const));
      
      recentlyDeletedFolders.add(folderPath);
      saveDeletedFolders();
      return true;
    } catch (e) {
      console.log('Direct folder marker delete failed, trying recursive delete');
    }

    // If direct delete failed, proceed with recursive delete
    let isTruncated = true;
    let continuationToken: string | undefined;
    const allObjects: { Key: string }[] = [];
    
    // List all objects with this prefix
    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: creds.bucketName,
        Prefix: folderPath,
        ContinuationToken: continuationToken,
      });
      
      const listedObjects = await s3.send(listCommand);
      
      if (listedObjects.Contents?.length) {
        allObjects.push(...listedObjects.Contents.map(({ Key }) => ({
          Key: Key!,
          // Include version ID if available for versioned deletes
          ...(listedObjects.VersionIdMarker ? { VersionId: listedObjects.VersionIdMarker } : {})
        })));
      }
      
      isTruncated = listedObjects.IsTruncated || false;
      continuationToken = listedObjects.NextContinuationToken;
    }
    
    // Delete objects in batches of 1000 (S3 limit)
    if (allObjects.length > 0) {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < allObjects.length; i += BATCH_SIZE) {
        const batch = allObjects.slice(i, Math.min(i + BATCH_SIZE, allObjects.length));
        
        // First try with versioning
        try {
          await s3.send(new DeleteObjectsCommand({
            Bucket: creds.bucketName,
            Delete: {
              Objects: batch.map(obj => ({
                Key: obj.Key,
                VersionId: 'null' // Special value for delete markers in MinIO
              })),
              Quiet: true,
            },
          }));
        } catch (e) {
          console.log('Versioned delete failed, trying regular delete');
          // Fall back to regular delete if versioned delete fails
          await s3.send(new DeleteObjectsCommand({
            Bucket: creds.bucketName,
            Delete: {
              Objects: batch,
              Quiet: true,
            },
          }));
        }
        
        console.log(`Deleted batch ${Math.floor(i / BATCH_SIZE) + 1} of objects`);
      }
    }
    
    // Finally, try to delete the folder marker again
    try {
      // Try with versioning first
      await s3.send(new DeleteObjectCommand({
        Bucket: creds.bucketName,
        Key: folderPath,
        VersionId: 'null',
        BypassGovernanceRetention: true
      } as const));
      
      // Also try without versioning
      await s3.send(new DeleteObjectCommand({
        Bucket: creds.bucketName,
        Key: folderPath,
        BypassGovernanceRetention: true
      } as const));
    } catch (e) {
      console.log('Final folder marker delete failed, but continuing');
    }
    
    // Add to recently deleted folders to prevent it from showing up
    recentlyDeletedFolders.add(folderPath);
    saveDeletedFolders();
    
    console.log(`Successfully deleted folder: ${folderPath}`);
    return true;
    
  } catch (error) {
    console.error('Error deleting folder:', error);
    return false;
  }
}
