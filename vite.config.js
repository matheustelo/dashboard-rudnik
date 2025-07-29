import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  plugins: [vue()],
  server: {
    //host: '192.168.200.128',
    port: 5173, // opcional
    proxy: {
      "/api": {
        target: "http://relatorios.rudniksolucoes.com.br:3001",
        changeOrigin: true,
      },
    },
  },
})
