import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss()
  ],
  esbuild: {
    // Belt-and-braces: drop any direct console.* debug calls from production
    // builds. App code should route through src/utils/logger.js instead, which
    // compiles to a no-op in production — this catches stragglers and anything
    // added later without the logger.
    // console.error is deliberately NOT dropped: production errors must stay
    // diagnosable.
    pure: mode === 'production' ? ['console.log', 'console.warn', 'console.info', 'console.debug'] : []
  }
}))