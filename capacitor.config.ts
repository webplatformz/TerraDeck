import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.webplatformz.terradeck',
  appName: 'TerraDeck',
  webDir: 'dist-android',
  plugins: {
    SystemBars: {
      insetsHandling: 'native',
    },
  },
}

export default config
