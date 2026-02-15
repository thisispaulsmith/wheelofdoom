import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { copyFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-staticwebapp-config',
      closeBundle() {
        // Copy staticwebapp.config.json from repository root to dist
        const source = resolve(__dirname, '../../staticwebapp.config.json')
        const dest = resolve(__dirname, 'dist/staticwebapp.config.json')
        copyFileSync(source, dest)
        console.log('✓ Copied staticwebapp.config.json to dist/')
      }
    }
  ],
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.services__api__http__0 || process.env.services__api__https__0 || 'http://localhost:7071',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
