import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '../../',
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@primuslabs/zktls-js-sdk'],
  },
});
