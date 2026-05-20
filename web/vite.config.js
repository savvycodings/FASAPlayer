import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: '/',
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:3050',
        changeOrigin: true,
      },
      '/pokedata': {
        target: process.env.VITE_API_PROXY || 'http://localhost:3050',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        architecture: path.resolve(__dirname, 'architecture.html'),
        images: path.resolve(__dirname, 'images.html'),
      },
    },
  },
})
