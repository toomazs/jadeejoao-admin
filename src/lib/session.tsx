import { createContext, use, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { setSessionLostHandler } from '../api/client'
import { mustChangePassword, signOut, supabase } from './auth'

interface SessionState {
  session: Session | null
  /** False only until the stored session has been read back from storage. */
  ready: boolean
  mustChange: boolean
  email: string
  leave: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // supabase-js restores from storage asynchronously; rendering the login
    // screen before that lands would flash it at somebody already signed in.
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // The API is the authority on whether a session still counts. When it
    // answers 401 the token is gone for good (AD-9) — drop it here rather than
    // letting every screen render its own error.
    setSessionLostHandler(() => {
      void supabase.auth.signOut()
      setSession(null)
    })
  }, [])

  const value: SessionState = {
    session,
    ready,
    mustChange: mustChangePassword(session),
    email: session?.user?.email ?? '',
    leave: async () => {
      await signOut()
      setSession(null)
    },
  }

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession(): SessionState {
  const value = use(SessionContext)
  if (!value) throw new Error('useSession precisa estar dentro de SessionProvider')
  return value
}
