import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

/** Everything the panel cannot function without, baked in at build time. */
const REQUIRED = ['VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

export default defineConfig(({ command, mode }) => {
  /**
   * A production build missing any of these still succeeds — and ships a panel
   * that either cannot reach the API or cannot log anybody in, with nothing in
   * the build log to say why. The public site was bitten by exactly this once.
   *
   * On Cloudflare Workers Builds it is easy to hit, because build variables
   * and runtime variables live on two different screens and only the former
   * reaches Vite.
   */
  if (command === 'build') {
    const env = loadEnv(mode, '.', '')
    const missing = REQUIRED.filter((key) => !env[key])
    if (missing.length > 0) {
      throw new Error(
        `Faltando: ${missing.join(', ')}. No Cloudflare Workers Builds elas vão em ` +
          'Settings > Build > "Build variables and secrets" — a tela de Variables & Secrets ' +
          'de runtime não é lida pelo build.',
      )
    }
  }

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
    test: {
      environment: 'jsdom',
    },
  }
})
