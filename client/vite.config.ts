import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendPort = Number(env.VITE_FRONTEND_PORT || 3001)
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://localhost:3000'

  return {
    plugins: [
      TanStackRouterVite(),
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: frontendPort,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          // Mantiene cookies de refresh entre SPA (:3001) y API (:3000)
          cookieDomainRewrite: 'localhost',
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/grapesjs')) return 'grapes'
          },
        },
      },
    },
  }
})
