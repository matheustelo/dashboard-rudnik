import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173, // opcional
    proxy: {
      "/api": {
        target: "https://relatorios.rudniksolucoes.com.br:3001",
        changeOrigin: true,
      },
    },
  },
})