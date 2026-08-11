import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  optimizeDeps: {
    include: ['dexie', '@trystero-p2p/torrent'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replace(/\\/g, '/');
          if (moduleId.includes('/node_modules/konva/') || moduleId.includes('/node_modules/react-konva/')) {
            return 'konva';
          }
          if (moduleId.includes('/node_modules/@mantine/')) {
            return 'mantine';
          }
          if (moduleId.includes('/node_modules/@trystero-p2p/')) {
            return 'torrent';
          }
          if (moduleId.includes('/node_modules/@tabler/icons-react/')) {
            return 'icons';
          }
          if (moduleId.includes('/node_modules/@tiptap/')) {
            return 'tiptap';
          }
          if (moduleId.includes('/node_modules/prosemirror-')) {
            return 'prosemirror';
          }
          if (moduleId.includes('/node_modules/xsai/') || moduleId.includes('/node_modules/xsschema/')) {
            return 'ai';
          }
          if (moduleId.includes('/node_modules/dexie/')) {
            return 'storage';
          }
        },
      },
    },
  },
});
