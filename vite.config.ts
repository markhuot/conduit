import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Root directory for Vite (where client.tsx lives)
  root: 'src/ui',
  
  // Build configuration
  build: {
    // Output directory relative to project root
    outDir: '../../public',
    emptyOutDir: false, // Don't delete public/index.html or other static files
    
    // Generate manifest for SSR script injection
    manifest: true,
    
    // Client bundle configuration
    rollupOptions: {
      input: {
        client: '/client.tsx', // Entry point (relative to root)
      },
      output: {
        // Output to public/assets/
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    sourcemap: true,
  },
  
  // Development server configuration
  server: {
    // LISTEN_HOST: Network interface to bind to (0.0.0.0 = all interfaces, 127.0.0.1 = localhost only)
    // This is NOT the public hostname - that comes from the request's Host header
    // Defaults to '0.0.0.0' to listen on all interfaces for network access
    host: process.env.LISTEN_HOST || process.env.HOSTNAME || '0.0.0.0',
    port: 5173,
    strictPort: true,
    
    // Important: Allow CORS for dev server requests from backend
    cors: true,
    
    // Allow all hosts in development (disables DNS rebinding protection)
    // This is safe for development environments
    // Set to `true` to allow all hostnames, or provide array of specific hosts
    allowedHosts: true,
    
    // HMR configuration
    hmr: {
      protocol: 'ws',
      // Don't hardcode HMR host - let browser use whatever host it connected with
      // This ensures HMR works with custom domains like dev.markhuot.com
      clientPort: 5173,
    },
  },
  
  // Base path for assets (relative to domain root)
  base: '/',
});
