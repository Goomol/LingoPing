import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const isStaging = mode === 'staging';

  return {
    base: './',
    envDir: resolve(__dirname, '../..'),
    plugins: [react()],
    define: {
      __APP_ENV__: JSON.stringify(mode),
    },
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: !isProd,
      minify: isProd ? 'esbuild' : false,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          session: resolve(__dirname, 'session.html'),
          options: resolve(__dirname, 'options.html'),
          background: resolve(__dirname, 'src/background/index.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') {
              return 'background.js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  };
});
