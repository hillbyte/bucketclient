import { S3Client } from '@aws-sdk/client-s3';
import { credentials } from './stores';
import type { S3Credentials } from './stores';

let s3Client: S3Client | null = null;
let currentCredentials: S3Credentials | null = null;

credentials.subscribe(value => {
  if (value) {
    if (JSON.stringify(value) !== JSON.stringify(currentCredentials)) {
      currentCredentials = value;
      s3Client = new S3Client({
        endpoint: currentCredentials.endpoint,
        region: currentCredentials.region,
        credentials: {
          accessKeyId: currentCredentials.accessKeyId,
          secretAccessKey: currentCredentials.secretAccessKey,
        },
        forcePathStyle: true, 
      });
    }
  } else {
    s3Client = null;
    currentCredentials = null;
  }
});

export function getS3Client(): S3Client | null {
  return s3Client;
}
