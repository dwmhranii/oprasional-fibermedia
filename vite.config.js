import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        importScripts: ['/sw-push.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['logo-fibermedia.png', 'sw-push.js'],
      manifest: {
        name: 'Fibermedia Field - Operasional Lapangan',
        short_name: 'Fibermedia',
        description: 'Fibermedia Provisioning & Operations PWA',
        theme_color: '#0284c7',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/logo-fibermedia.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo-fibermedia.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/logo-fibermedia.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './resources/js/admin'),
      '@admin': path.resolve(__dirname, './resources/js/admin'),
      '@field': path.resolve(__dirname, './resources/js/field'),
      '@shared': path.resolve(__dirname, './resources/js/shared'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        admin: path.resolve(__dirname, 'index.html'),
        field: path.resolve(__dirname, 'field.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
