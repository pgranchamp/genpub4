import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Rediriger les requêtes commençant par /api vers le serveur backend local
      '/api': {
        target: 'http://localhost:3000', // URL de votre backend local (ajustez le port si nécessaire)
        changeOrigin: true, // Nécessaire pour les hôtes virtuels
        // Optionnel: si votre backend n'a pas de préfixe /api sur ses routes
        // rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },
})
