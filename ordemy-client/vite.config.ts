import path from "path"
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const stripApiSuffix = (url: string) =>
  url.replace(/\/+$/, "").replace(/\/api$/, "")

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = stripApiSuffix(
    env.VITE_API_URL || "http://localhost:8081",
  )

  // In development the browser talks to the Vite server only and Vite forwards
  // /api and /socket.io to the real API. That keeps the same origin on phones
  // and LAN devices, so no CORS configuration is needed server-side.
  const proxy = {
    "/api": {
      target: apiTarget,
      changeOrigin: true,
      secure: true,
    },
    "/socket.io": {
      target: apiTarget,
      changeOrigin: true,
      secure: true,
      ws: true,
    },
  }

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      proxy,
    },
    preview: {
      host: true,
      proxy,
    },
  }
})
