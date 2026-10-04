import { defineConfig } from 'vite'

export default defineConfig({
  // rutas relativas: GitHub Pages lo sirve bajo /local/
  base: './',
  // three.js ocupa ~600 kB minificado; es esperado
  build: { chunkSizeWarningLimit: 1000 },
})
