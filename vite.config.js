import fs from 'fs'
import path from 'path'

import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  server: {
    proxy: {
      "/networks": {
        target: "https://app.citybik.es",
        changeOrigin: true,
      },
      "/layers": {
        target: "https://app.citybik.es",
        changeOrigin: true,
      },
    },
    ...(
      fs.existsSync(path.resolve(__dirname, 'certs/localhost+1.pem')) ?
      {
        https: {
          key: fs.readFileSync(path.resolve(__dirname, 'certs/localhost+1-key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, 'certs/localhost+1.pem')),
        }
      } : {}
    )
  },
})
