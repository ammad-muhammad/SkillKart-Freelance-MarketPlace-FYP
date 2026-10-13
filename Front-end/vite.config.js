import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// MediaPipe face-landmarker assets for the skill-test camera proctoring
// (src/pages/freelancer/proctoring/faceEngine.js). Served from our own
// origin — never a CDN — so the Android app works offline. Kept out of
// public/ on purpose: the WebAssembly runtime (~23 MB for the SIMD and
// no-SIMD builds) would otherwise also land in the admin app's build, which
// has no skill test. Dev serves them straight from their source; builds
// copy them into the output folder (except --mode admin).
const MEDIAPIPE_ASSETS = [
  ['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js', 'mediapipe/wasm/vision_wasm_internal.js'],
  ['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm', 'mediapipe/wasm/vision_wasm_internal.wasm'],
  ['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js', 'mediapipe/wasm/vision_wasm_nosimd_internal.js'],
  ['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm', 'mediapipe/wasm/vision_wasm_nosimd_internal.wasm'],
  ['vendor/mediapipe/face_landmarker.task', 'mediapipe/face_landmarker.task'],
]

const CONTENT_TYPES = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.task': 'application/octet-stream' }

function mediapipeAssets(mode) {
  let root = '.' // replaced by the resolved Vite root in configResolved
  let outDir = 'dist'
  return {
    name: 'skillkart-mediapipe-assets',
    configResolved(config) {
      root = config.root
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        const hit = MEDIAPIPE_ASSETS.find(([, dest]) => url === `/${dest}`)
        if (!hit) return next()
        const file = path.join(root, hit[0])
        res.setHeader('Content-Type', CONTENT_TYPES[path.extname(file)] || 'application/octet-stream')
        fs.createReadStream(file).on('error', next).pipe(res)
      })
    },
    closeBundle() {
      if (mode === 'admin') return
      for (const [src, dest] of MEDIAPIPE_ASSETS) {
        const target = path.join(outDir, dest)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(path.join(root, src), target)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    mediapipeAssets(mode)
  ],
  build: {
    // The admin app builds to its own output dir — otherwise `vite build
    // --mode admin` would silently overwrite the client/freelancer build's
    // dist/, since both would default to the same folder.
    outDir: mode === 'admin' ? 'dist-admin' : 'dist'
  },
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
