import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'img-001': resolve(__dirname, 'src/tools/image/IMG-001/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
