import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, type PluginOption } from 'vite';

export default defineConfig(({ mode }) => {
  // Only VITE_* variables reach the browser bundle; API_PROXY_TARGET stays on the dev server.
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.API_PROXY_TARGET || 'http://localhost:8080';

  const plugins: PluginOption[] = [react(), tailwindcss()];
  if (mode === 'analyze') {
    plugins.push(
      visualizer({
        filename: 'dist/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
    );
  }

  // The dashboard is private: tell crawlers not to index anything (robots.txt also disallows all).
  const headers = { 'X-Robots-Tag': 'noindex, nofollow' };

  return {
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      headers,
      // Used when VITE_API_BASE_URL=/api/v1 (same origin); the default .env.development calls the
      // backend directly at http://localhost:8080 instead.
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
      },
    },
    preview: {
      port: 4173,
      headers,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: mode !== 'production',
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          // Zod 4 places /* @__PURE__ */ comments where Rollup cannot use them; harmless noise.
          if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules/zod')) {
            return;
          }
          defaultHandler(warning);
        },
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
            query: ['@tanstack/react-query', 'axios'],
            forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
          },
        },
      },
    },
  };
});
