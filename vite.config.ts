import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  base: command === 'build' && mode !== 'android' ? '/TerraDeck/' : '/',
  build: {
    outDir: mode === 'android' ? 'dist-android' : 'dist',
    assetsInlineLimit: filePath => filePath.endsWith('.svg') ? false : undefined,
  },
  server: { host: true },
}))
