import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner']
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
});
