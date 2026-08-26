import { useState } from 'react'

import logo from '../../images/logo.webp'
import { Button, Field, Notice } from '../components/ui'
import { signIn } from '../lib/auth'

/**
 * The way in. Three people use this, and the couple only occasionally, so it
 * says who it belongs to — landing on a bare form and wondering whether you
 * are in the right place is its own small failure.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password || busy) return
    setBusy(true)
    setError('')
    const { error: failed } = await signIn(email, password)
    setBusy(false)
    if (failed) {
      // Supabase distinguishes "no such user" from "wrong password"; the panel
      // does not, so a wrong guess never confirms which emails exist.
      setError('E-mail ou senha incorretos.')
    }
    // Success needs no navigation: the session provider re-renders the app.
  }

  return (
    <main className="grid min-h-svh place-items-center px-4">
      <form
        className="w-full max-w-sm border border-olive-line bg-cream px-6 py-9"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <img src={logo} alt="" aria-hidden="true" className="mx-auto h-14 w-auto" />
        <h1 className="mt-5 text-center font-display text-2xl text-olive">Painel dos noivos</h1>

        <Field
          label="E-mail"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-7"
        />
        <Field
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-4"
        />

        <div className="mt-3 min-h-5">
          <Notice kind="error">{error}</Notice>
        </div>

        <Button type="submit" disabled={busy} className="mt-3 w-full">
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
