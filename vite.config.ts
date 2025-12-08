import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Frontend source directory
  root: 'src/ui',
  
  // Output directory for production build
  build: {
    outDir: '../../public',
    emptyOutDir: true,
    sourcemap: true,
  },
  
  // Development server configuration
  server: {
    port: 5173,
    strictPort: true,
    // Proxy API requests to backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  
  // Base path for assets
  base: '/',
});
