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
      drop: isProd ? ['debugger'] : [],
      pure: isProd ? ['console.log', 'console.debug'] : [],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: !isProd,
      minify: isProd ? 'esbuild' : false,
      chunkSizeWarningLimit: 1200,
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
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('antd') || id.includes('@ant-design')) {
                return 'vendor-antd';
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
            }
          },
        },
      },
    },
  };
});
