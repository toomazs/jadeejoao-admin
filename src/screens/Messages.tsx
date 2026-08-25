import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { Button, Empty, Notice, Panel } from '../components/ui'
import { MESSAGE_STATUS_PT, shortDate } from '../lib/labels'

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'Esperando' },
  { key: 'approved', label: 'Aprovados' },
  { key: 'rejected', label: 'Rejeitados' },
  { key: 'all', label: 'Todos' },
]

/**
 * The guestbook, which is write-only for guests (AD-14): they leave a recado
 * and the couple reads it here.
 *
 * Moderation exists so a public wall could be added later without rewriting
 * anything — approving today changes nothing a guest sees, and that is fine.
 */
export function Messages() {
  const [filter, setFilter] = useState<Filter>('pending')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const messages = $api.useQuery('get', '/api/v1/admin/messages')
  const moderate = $api.useMutation('patch', '/api/v1/admin/messages/{message_id}')

  const all = messages.data?.messages ?? []
  const shown = filter === 'all' ? all : all.filter((m) => m.status === filter)
  const waiting = all.filter((m) => m.status === 'pending').length

  const decide = (id: string, status: 'approved' | 'rejected') => {
    setError('')
    moderate.mutate(
      { params: { path: { message_id: id } }, body: { status } },
      {
        onSuccess: () => void queryClient.invalidateQueries(),
        onError: (err) => setError(problemDetail(err)),
      },
    )
  }

  return (
    <>
      <ScreenTitle
        title="Recados"
        subtitle={
          waiting > 0
            ? `${waiting} esperando vocês · ${all.length} no total`
            : `${all.length} recados, nenhum esperando`
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <Button
            key={key}
            tone={filter === key ? 'primary' : 'quiet'}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <Notice kind="error">{error}</Notice>

      <Panel className="mt-2">
        {messages.isPending ? (
          <Empty>·</Empty>
        ) : shown.length === 0 ? (
          <Empty>Nenhum recado aqui.</Empty>
        ) : (
          <ul className="divide-y divide-sand-line">
            {shown.map((m) => (
              <li key={m.message_id} className="row-in px-4 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-lg text-olive">{m.author_name}</p>
                  <p className="font-body text-xs text-dark-gray">
                    {shortDate(m.created_at)} · {MESSAGE_STATUS_PT[m.status] ?? m.status}
                  </p>
                </div>
                {/* Guests write with line breaks and they carry meaning. */}
                <p className="mt-2 font-body text-base whitespace-pre-line text-ink">{m.body}</p>

                {/* Only the transitions that would change something. A recado
                    already approved shows just the way back. */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.status !== 'approved' ? (
                    <Button onClick={() => decide(m.message_id, 'approved')}>Aprovar</Button>
                  ) : null}
                  {m.status !== 'rejected' ? (
                    <Button tone="danger" onClick={() => decide(m.message_id, 'rejected')}>
                      Rejeitar
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
