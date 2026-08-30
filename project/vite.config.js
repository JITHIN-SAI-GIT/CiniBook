import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api requests to the Render backend (bypasses CORS)
      '/api': {
        target: 'https://cinebook-backend-6e0a.onrender.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Strip the Origin header so Render's Spring backend doesn't apply CORS 
            // and block localhost requests with a 403 Forbidden.
            proxyReq.removeHeader('origin');
          });
        }
      },
      // Proxy WebSocket chat endpoint
      '/ws-chat': {
        target: 'https://cinebook-backend-6e0a.onrender.com',
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    extensions: ['.jsx', '.js', '.json', '.css'],
  },
  build: {
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation library
          'vendor-motion': ['framer-motion'],
          // Icons
          'vendor-icons': ['lucide-react', 'react-icons'],
          // HTTP + Auth
          'vendor-http': ['axios', 'jwt-decode', '@react-oauth/google'],
          // Heavy Utilities
          'vendor-pdf': ['html2pdf.js'],
          'vendor-location': ['country-state-city'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          // WebSocket
          'vendor-ws': ['@stomp/stompjs', 'sockjs-client']
        },
      },
    },
    // Increase chunk size warning limit (motion is large)
    chunkSizeWarningLimit: 600,
  },
});
