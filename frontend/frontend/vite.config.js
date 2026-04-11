import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'window',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react', 'react-hot-toast', 'canvas-confetti'],
          utils: ['axios', 'sockjs-client', 'stompjs', '@stomp/stompjs'],
          charts: ['recharts']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react-is', 'recharts']
  }
})
