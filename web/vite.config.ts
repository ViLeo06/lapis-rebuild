import { defineConfig } from 'vite';
import { writeReleaseMetadata } from './scripts/release-metadata.ts';

export default defineConfig({
  plugins: [
    {
      name: 'lapis-release-metadata',
      apply: 'build',
      async closeBundle() {
        await writeReleaseMetadata('dist/release-metadata.json', process.env);
      },
    },
  ],
  base: './',
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
