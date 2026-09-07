import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      // Proxy all /api requests to the LOCAL Spring Boot backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket chat endpoint to local backend
      '/ws-chat': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
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
