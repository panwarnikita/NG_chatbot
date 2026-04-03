import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {
      '/ask': 'http://localhost:5000',
      '/get_chat': 'http://localhost:5000',
      '/logout': 'http://localhost:5000'
    }
  }
})












