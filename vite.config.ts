// NeighborGigs Vite Configuration
// Ensures proper header forwarding for Idempotency-Key and other custom headers

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: {
      host: 'localhost',
      port: 3000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:50430',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Log headers for debugging
            console.log('Proxying request:', {
              method: req.method,
              url: req.url,
              headers: req.headers,
            });
          });
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'PROXY_ERROR', message: 'Failed to proxy request' } }));
          });
        },
      },
    },
  },
  // CORS configuration for development
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:50430'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'X-User-Id',
      'Idempotency-Key',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Idempotency-Key'],
  },
  // Ensure CSS is processed correctly
  css: {
    devSourcemap: true,
  },
});