import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const CESIUM_BASE = 'cesium'

// Cesium 运行时资源（Workers / Assets / Widgets / ThirdParty）需要放到静态目录
const cesiumAssets = ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map((name) => ({
  src: `node_modules/cesium/Build/Cesium/${name}`,
  dest: CESIUM_BASE,
}))

export default defineConfig({
  plugins: [react(), viteStaticCopy({ targets: cesiumAssets })],
  define: {
    CESIUM_BASE_URL: JSON.stringify(`/${CESIUM_BASE}`),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 后端 lyg-collecter（Go，:8080）接口代理，避免开发环境跨域
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
