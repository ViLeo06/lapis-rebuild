import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
