import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Change base to match your GitHub Pages repo path, e.g. '/Workout/'
export default defineConfig({
  base: '/Workout/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Workout Logger',
        short_name: 'Workout',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/Workout/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
