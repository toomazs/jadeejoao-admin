import { useState } from 'react'

import logo from '../../images/logo.webp'
import { $api, problemDetail } from '../api/client'
import { Button, Field, Notice } from '../components/ui'
import { useSession } from '../lib/session'

const MIN = 10

/**
 * The first-login password change.
 *
 * This screen is not what enforces the change — the API refuses every other
 * admin route until it is done, so skipping the screen gets you a panel that
 * answers 403 to everything. It exists to make the obligation legible instead
 * of mysterious.
 */
export function ChangePassword() {
  const { email, leave } = useSession()
  const [done, setDone] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const change = $api.useMutation('post', '/api/v1/admin/password')

  const mismatch = repeat.length > 0 && next !== repeat
  const canSubmit = current.length > 0 && next.length >= MIN && next === repeat && !change.isPending

  const submit = () => {
    if (!canSubmit) return
    setError('')
    change.mutate(
      { body: { current_password: current, new_password: next } },
      {
        // Supabase revokes every session when a password changes, this one
        // included — so there is no refreshing into the panel from here. Say
        // that plainly: bouncing back to the login screen without a word looks
        // exactly like the change having failed.
        onSuccess: () => setDone(true),
        onError: (err) => setError(problemDetail(err, 'Não conseguimos trocar a senha agora.')),
      },
    )
  }

  if (done) {
    return (
      <main className="grid min-h-svh place-items-center px-4">
        <div className="w-full max-w-sm border border-olive-line bg-cream px-6 py-9 text-center">
          <img src={logo} alt="" aria-hidden="true" className="mx-auto h-12 w-auto" />
          <h1 className="mt-5 font-display text-2xl text-olive">Senha trocada</h1>
          <p className="mt-2 font-body text-sm text-dark-gray">
            Por segurança, a troca encerra as sessões abertas. Entre de novo com a senha que você
            acabou de escolher.
          </p>
          <Button onClick={() => void leave()} className="mt-6 w-full">
            Ir para a entrada
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="grid min-h-svh place-items-center px-4">
      <form
        className="w-full max-w-sm border border-olive-line bg-cream px-6 py-9"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <img src={logo} alt="" aria-hidden="true" className="mx-auto h-12 w-auto" />
        <h1 className="mt-5 text-center font-display text-2xl text-olive">Escolha sua senha</h1>
        <p className="mt-2 text-center font-body text-sm text-dark-gray">
          Você entrou com a senha temporária. Antes de usar o painel, escolha uma sua.
        </p>
        <p className="mt-1 text-center font-body text-xs text-dark-gray">{email}</p>

        <Field
          label="Senha temporária"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className="mt-7"
        />
        <Field
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          hint={`Pelo menos ${MIN} caracteres.`}
          className="mt-4"
        />
        <Field
          label="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(event) => setRepeat(event.target.value)}
          className="mt-4"
        />

        <div className="mt-3 min-h-5">
          <Notice kind="error">{mismatch ? 'As duas senhas não são iguais.' : error}</Notice>
        </div>

        <Button type="submit" disabled={!canSubmit} className="mt-3 w-full">
          {change.isPending ? 'Salvando…' : 'Salvar e entrar'}
        </Button>

        <button
          type="button"
          onClick={() => void leave()}
          className="mt-4 w-full cursor-pointer font-body text-sm text-dark-gray underline decoration-1 underline-offset-4 hover:text-olive"
        >
          Sair
        </button>
      </form>
    </main>
  )
}
