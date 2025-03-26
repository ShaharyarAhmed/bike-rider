import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/bike-rider/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name][extname]`;
          }
          if (/glb|gltf/i.test(extType)) {
            return `assets/models/[name][extname]`;
          }
          if (/mp3|wav/i.test(extType)) {
            return `assets/sounds/[name][extname]`;
          }
          return `assets/[name][extname]`;
        }
      }
    }
  },
  publicDir: 'public',
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.png', '**/*.jpg', '**/*.jpeg'],
  server: {
    fs: {
      // Allow serving files from one level up from the package root,
      // so our models can be imported from src/models
      allow: ['..']
    }
  }
}) 