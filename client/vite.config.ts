import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const clientPort = Number(process.env.CLIENT_PORT) || 5173
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: clientPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
