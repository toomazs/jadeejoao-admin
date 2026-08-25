import createFetchClient from 'openapi-fetch'
import type { Middleware } from 'openapi-fetch'
import createQueryClient from 'openapi-react-query'

import { supabase } from '../lib/auth'
import type { paths } from './schema'

/** Called when the API says the session is over, so the app can react. */
let onSessionLost: (() => void) | undefined

export function setSessionLostHandler(handler: () => void) {
  onSessionLost = handler
}

/**
 * Attaches the Supabase access token to every call.
 *
 * `getSession()` rather than a cached token on purpose: supabase-js refreshes
 * in the background, and a token captured once would go stale exactly when the
 * couple leaves the panel open on a phone all afternoon.
 */
const auth: Middleware = {
  async onRequest({ request }) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
  async onResponse({ response }) {
    // AD-9: a 401 has no grace period — it means re-authenticate, now.
    // 403 is different and must NOT sign anyone out: it is also what the API
    // answers while a temporary password is still in place.
    if (response.status === 401) {
      onSessionLost?.()
    }
    return response
  },
}

export const client = createFetchClient<paths>({ baseUrl: import.meta.env.VITE_API_URL })
client.use(auth)

/** The panel consumes the API exclusively through this (AD-1). */
export const $api = createQueryClient(client)

/** True when the API refused because the temporary password is still in place. */
export function isPasswordObligation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: number }).status === 403 &&
    'detail' in error &&
    typeof (error as { detail?: string }).detail === 'string' &&
    (error as { detail: string }).detail.includes('senha temporária')
  )
}

/** The PT-BR problem detail the API sends, with a quiet fallback. */
export function problemDetail(error: unknown, fallback = 'Não deu certo agora. Tente de novo.'): string {
  if (error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string') {
    return error.detail
  }
  return fallback
}
