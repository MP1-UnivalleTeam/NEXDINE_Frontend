import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_URL || 'http://localhost:8080'

  const apiProxy = {
    target,
    changeOrigin: true
  }

  const spaSafeProxy = {
    target,
    changeOrigin: true,
    bypass: (req) => (
      req.method === 'GET' && String(req.headers.accept || '').includes('text/html')
        ? '/index.html'
        : undefined
    )
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': apiProxy,
        '/login': spaSafeProxy,
        '/logout': apiProxy,
        '/mesas': spaSafeProxy,
        '/users': apiProxy,
        '/productos': spaSafeProxy,
        '/sucursales': spaSafeProxy,
        '/categorias': spaSafeProxy
      }
    }
  }
})
