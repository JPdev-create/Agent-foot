import { cpSync, existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// Le jeu Agent Foot (HTML/JS sans build) vit à la racine du dépôt.
// Ce plugin le sert sous /jeu/ en dev et le copie dans dist/jeu/ au build.
const GAME_DIR = resolve(__dirname, '..')
const GAME_FILES = ['index.html', 'css', 'js', 'icons', 'manifest.webmanifest', 'sw.js']
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
}

function agentFootGame(): Plugin {
  return {
    name: 'agent-foot-game',
    configureServer(server) {
      server.middlewares.use('/jeu', (req, res, next) => {
        const url = decodeURIComponent((req.url ?? '/').split('?')[0])
        const rel = url === '/' || url === '' ? 'index.html' : url.replace(/^\/+/, '')
        if (!GAME_FILES.includes(rel.split('/')[0])) return next()
        const file = join(GAME_DIR, rel)
        if (!file.startsWith(GAME_DIR) || !existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
        res.end(readFileSync(file))
      })
    },
    closeBundle() {
      for (const f of GAME_FILES) {
        cpSync(join(GAME_DIR, f), resolve(__dirname, 'dist/jeu', f), { recursive: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), agentFootGame()],
})
