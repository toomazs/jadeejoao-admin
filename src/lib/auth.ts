import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

/**
 * Supabase is used for exactly one thing: proving who is signed in (AD-1).
 *
 * No table is ever read through it. The project's Data API is closed and every
 * table carries RLS with zero policies, so the anon key shipped in this bundle
 * opens nothing — it can obtain a token and nothing else. All data goes through
 * jadeejoao-api with that token as a Bearer.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The panel has no email links to catch, and leaving this on makes it
      // scan every URL it lands on for tokens.
      detectSessionInUrl: false,
    },
  },
)

/**
 * Whether this account still holds the temporary password it was created with.
 *
 * Read from app_metadata, which the account holder cannot write — unlike
 * user_metadata. The API reads the same claim and refuses every other admin
 * route until it clears, so this only decides which screen to show; it is not
 * what enforces anything.
 */
export function mustChangePassword(session: Session | null): boolean {
  const meta = session?.user?.app_metadata as Record<string, unknown> | undefined
  return meta?.must_change_password === true
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password })
}

export async function signOut() {
  await supabase.auth.signOut()
}

/**
 * Refetches the session from Supabase so a just-changed app_metadata claim is
 * picked up. Called after the password change: the old token still carries the
 * obligation, and without this the panel would keep showing the change screen
 * to somebody who already changed it.
 */
export async function refreshSession(): Promise<Session | null> {
  const { data } = await supabase.auth.refreshSession()
  return data.session
}
