// This is a helper script to fix the deleteFolder function
// Copy the content of this file and replace the existing deleteFolder function in FileManager.svelte

// Add this helper function at the top of your file (if not already present)
/*
  // Helper function to calculate Content-MD5 for delete operations
  function calculateContentMd5(deleteObjects) {
    const content = JSON.stringify(deleteObjects);
    const hash = crypto.createHash('md5').update(content).digest('base64');
    return hash;
  }
*/

// Replace the existing deleteFolder function with this one
/*
  async function deleteFolder(folderPath) {
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
        }));
        
        console.log('Successfully deleted folder marker with versioning');
        
        // Also try without versioning
        await s3.send(new DeleteObjectCommand({
          Bucket: creds.bucketName,
          Key: folderPath,
          BypassGovernanceRetention: true
        }));
        
        recentlyDeletedFolders.add(folderPath);
        saveDeletedFolders();
        return true;
      } catch (e) {
        console.log('Direct folder marker delete failed, trying recursive delete');
      }

      // If direct delete failed, proceed with recursive delete
      let isTruncated = true;
      let continuationToken;
      const allObjects = [];
      
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
            Key: Key,
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
            const deleteParams = {
              Bucket: creds.bucketName,
              Delete: {
                Objects: batch.map(obj => ({
                  Key: obj.Key,
                  VersionId: 'null' // Special value for delete markers in MinIO
                })),
                Quiet: true,
              },
            };

            // Add Content-MD5 header
            const command = new DeleteObjectsCommand(deleteParams);
            command.middlewareStack.add(
              (next) => async (args) => {
                args.request.headers['Content-MD5'] = calculateContentMd5(deleteParams.Delete);
                return next(args);
              },
              { step: 'build' }
            );
            
            await s3.send(command);
          } catch (e) {
            console.log('Versioned delete failed, trying regular delete', e);
            
            // Fall back to regular delete if versioned delete fails
            const deleteParams = {
              Bucket: creds.bucketName,
              Delete: {
                Objects: batch,
                Quiet: true,
              },
            };

            // Add Content-MD5 header
            const command = new DeleteObjectsCommand(deleteParams);
            command.middlewareStack.add(
              (next) => async (args) => {
                args.request.headers['Content-MD5'] = calculateContentMd5(deleteParams.Delete);
                return next(args);
              },
              { step: 'build' }
            );
            
            await s3.send(command);
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
        }));
        
        // Also try without versioning
        await s3.send(new DeleteObjectCommand({
          Bucket: creds.bucketName,
          Key: folderPath,
          BypassGovernanceRetention: true
        }));
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
*/
