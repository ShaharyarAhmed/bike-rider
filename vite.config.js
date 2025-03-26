import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bike-rider/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
}) 