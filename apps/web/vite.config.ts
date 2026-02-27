import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/contexts': path.resolve(__dirname, 'src/contexts'),
      '@/stores': path.resolve(__dirname, 'src/stores'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@rgr/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@rgr/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@rgr/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('mapbox-gl')) return 'vendor-mapbox';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
    hmr: {
      overlay: true,
    },
  },
  clearScreen: false,
  test: {
    setupFiles: ['./src/test/setup.ts'],
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/__tests__/**', 'src/**/index.{ts,tsx}', 'src/test/**'],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
  },
});
