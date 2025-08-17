import { writable } from 'svelte/store';

export interface S3Credentials {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  customDomain?: string;
}

const storedCredentials = localStorage.getItem('s3Credentials');

export const credentials = writable<S3Credentials | null>(
  storedCredentials ? JSON.parse(storedCredentials) : null
);

credentials.subscribe(value => {
  if (value) {
    localStorage.setItem('s3Credentials', JSON.stringify(value));
  } else {
    localStorage.removeItem('s3Credentials');
  }
});

export const isConnected = writable<boolean>(!!storedCredentials);

// Custom domain settings
const storedCustomDomain = localStorage.getItem('customDomain');
export const customDomain = writable<string>(storedCustomDomain || '');

customDomain.subscribe(value => {
  if (value) {
    localStorage.setItem('customDomain', value);
  } else {
    localStorage.removeItem('customDomain');
  }
});
