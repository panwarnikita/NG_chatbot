import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      // Required for SharedArrayBuffer (WASM multi-threading)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/ask': 'http://localhost:5000',
      '/get_chat': 'http://localhost:5000',
      '/logout': 'http://localhost:5000'
    }
  },
  optimizeDeps: {
    include: ['onnxruntime-web', '@realtimex/piper-tts-web'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
  assetsInclude: ['**/*.wasm', '**/*.onnx'],
})
