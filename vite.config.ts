import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/TerraDeck/' : '/',
  build: {
    assetsInlineLimit: filePath => filePath.endsWith('.svg') ? false : undefined,
  },
  server: { host: true },
}))
