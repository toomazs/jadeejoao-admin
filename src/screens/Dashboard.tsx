import { Link } from 'react-router'

import { $api } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { Empty, Panel, Stat } from '../components/ui'
import { CATEGORY_PT } from '../lib/labels'

/**
 * What the couple wants to know at a glance: how many are coming, who is still
 * silent, and what is waiting on them.
 *
 * Deliberately not a chart. With 122 invitations the numbers are small enough
 * to read, and a chart would only cost a translation step.
 */
export function Dashboard() {
  const guests = $api.useQuery('get', '/api/v1/admin/guests')
  const messages = $api.useQuery('get', '/api/v1/admin/messages')
  const contributions = $api.useQuery('get', '/api/v1/admin/contributions')

  const counts = guests.data?.headcounts
  const pendingMessages = (messages.data?.messages ?? []).filter((m) => m.status === 'pending')
  const declared = (contributions.data?.contributions ?? []).filter((c) => c.status === 'declared')
  const byCategory = Object.entries(counts?.yes_by_category ?? {}).filter(([, n]) => n > 0)

  return (
    <>
      <ScreenTitle title="Painel" subtitle="Como está a lista e o que espera por vocês." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Convidados" value={counts?.total ?? '—'} />
        <Stat label="Vão" value={counts?.yes ?? '—'} tone="yes" />
        <Stat label="Não vão" value={counts?.no ?? '—'} tone="no" />
        <Stat label="Sem resposta" value={counts?.pending ?? '—'} />
      </div>

      {byCategory.length > 0 ? (
        <Panel title="Quem confirmou, por faixa" className="mt-6">
          <div className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-4">
            {byCategory.map(([key, n]) => (
              <p key={key} className="font-body text-sm text-dark-gray">
                <span className="font-display text-2xl text-ink">{n}</span>{' '}
                {CATEGORY_PT[key] ?? key}
              </p>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recados esperando"
          actions={
            <Link to="/recados" className="font-body text-sm text-olive underline underline-offset-4">
              ver todos
            </Link>
          }
        >
          {pendingMessages.length === 0 ? (
            <Empty>Nenhum recado esperando moderação.</Empty>
          ) : (
            <ul className="divide-y divide-sand-line">
              {pendingMessages.slice(0, 4).map((m) => (
                <li key={m.message_id} className="px-4 py-3">
                  <p className="font-body text-sm text-olive">{m.author_name}</p>
                  <p className="mt-0.5 line-clamp-2 font-body text-sm text-dark-gray">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="PIX a confirmar"
          actions={
            <Link to="/contribuicoes" className="font-body text-sm text-olive underline underline-offset-4">
              ver todos
            </Link>
          }
        >
          {declared.length === 0 ? (
            <Empty>Nenhum PIX declarado esperando confirmação.</Empty>
          ) : (
            <ul className="divide-y divide-sand-line">
              {declared.slice(0, 4).map((c) => (
                <li key={c.contribution_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="font-body text-sm text-dark-gray">{c.contributor_name}</span>
                  <span className="font-body text-sm text-ink">
                    {(c.amount_centavos / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
