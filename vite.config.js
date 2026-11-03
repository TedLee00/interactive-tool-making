import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        lab: resolve(__dirname, 'quiz-lab.html'),
        review: resolve(__dirname, 'review.html'),
      },
    },
  },
});
