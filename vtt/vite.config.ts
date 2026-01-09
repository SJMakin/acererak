import { defineConfig, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

// Custom plugin to use pre-built streamx ESM bundle (built by prebuild script using esbuild)
// This bypasses Rollup's problematic CommonJS handling of streamx
function streamxFixPlugin(): PluginOption {
  return {
    name: 'streamx-fix',
    enforce: 'pre',
    config() {
      return {
        resolve: {
          alias: {
            // Point to pre-built ESM bundle created by scripts/prebuild-streamx.mjs
            'streamx': path.resolve(__dirname, 'src/lib/streamx.esm.js'),
          },
        },
      };
    },
  };
}

export default defineConfig({
  plugins: [
    streamxFixPlugin(),
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
      include: [
        'events',
        'util',
        'buffer',
        'process',
        'path',
        'crypto',
      ],
    }),
  ],
  server: {
    port: 5174,
  },
  optimizeDeps: {
    include: ['dexie', 'trystero/torrent'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    target: 'esnext',
    minify: false,
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
      requireReturnsDefault: 'auto',
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'konva': ['konva', 'react-konva'],
          'mantine': ['@mantine/core', '@mantine/hooks', '@mantine/notifications'],
          'torrent': ['trystero'],
        },
      },
    },
  },
});
