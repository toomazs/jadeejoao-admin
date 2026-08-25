/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The jadeejoao-api origin (AD-2). */
  readonly VITE_API_URL: string
  /** Supabase project URL — used only for the Auth handshake (AD-1). */
  readonly VITE_SUPABASE_URL: string
  /**
   * Publishable anon key. Safe to ship: the Data API is closed and every table
   * has RLS with zero policies, so this key can obtain a token and nothing more.
   */
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Where the public site lives, for the live preview. Defaults to production. */
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
