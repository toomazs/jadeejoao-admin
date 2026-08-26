import { useMemo } from 'react'
import { Link } from 'react-router'

import { $api } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { Card, Empty, Stat } from '../components/ui'
import { CATEGORY_PT, SIDE_PT, money } from '../lib/labels'

/**
 * What the couple wants to know at a glance: how far off the day is, how the
 * list is going, and what is waiting on them.
 *
 * Deliberately not a chart library. The one bar here is a proportion — how
 * much of the list has answered — which a bar says faster than a number does.
 * Everything else is a count, and 122 invitations is small enough to read.
 */

/** The day itself. The countdown is the one thing here that is not a query. */
const WEDDING = '2027-08-07'

/** Whole days from today to the wedding, counted in local dates only. */
function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((then.getTime() - today.getTime()) / 86400000)
}

export function Dashboard() {
  const guests = $api.useQuery('get', '/api/v1/admin/guests')
  const messages = $api.useQuery('get', '/api/v1/admin/messages')
  const contributions = $api.useQuery('get', '/api/v1/admin/contributions')
  const gifts = $api.useQuery('get', '/api/v1/admin/gifts')

  const counts = guests.data?.headcounts
  const allMessages = messages.data?.messages ?? []
  const declared = (contributions.data?.contributions ?? []).filter((c) => c.status === 'declared')
  const byCategory = Object.entries(counts?.yes_by_category ?? {}).filter(([, n]) => n > 0)

  /** Everyone, flattened out of their invitations. */
  const people = useMemo(
    () => (guests.data?.groups ?? []).flatMap((g) => g.members ?? []),
    [guests.data],
  )

  const bySide = useMemo(() => {
    const tally: Record<string, number> = {}
    for (const person of people) {
      const side = person.side ?? 'sem lado'
      tally[side] = (tally[side] ?? 0) + 1
    }
    return Object.entries(tally).sort((a, b) => b[1] - a[1])
  }, [people])

  /**
   * The wedding party, in rows.
   *
   * The couple reads this as a procession, not a list: the two of them, then
   * the four parents, then the padrinhos, then the rest. So the rows are
   * declared rather than sorted — an alphabet would put the celebrante before
   * the noiva. Roles the couple invents fall into a row of their own at the
   * end, because nobody here knows where they belong; "Convidado" is not a
   * role and never appears.
   */
  const party = useMemo(() => {
    const byRole = new Map<string, string[]>()
    for (const person of people) {
      const role = person.ceremony_role
      if (!role || role === 'Convidado') continue
      byRole.set(role, [...(byRole.get(role) ?? []), person.full_name])
    }

    const ROWS = [
      ['Noiva', 'Noivo'],
      ['Pai da noiva', 'Mãe da noiva', 'Pai do noivo', 'Mãe do noivo'],
      ['Madrinha', 'Padrinho'],
      ['Dama de honra', 'Pajem', 'Celebrante'],
    ]
    const known = new Set(ROWS.flat())

    const fill = (roles: string[]) =>
      roles
        .filter((role) => byRole.has(role))
        .map((role) => ({
          role,
          names: (byRole.get(role) ?? []).sort((a, b) => a.localeCompare(b, 'pt-BR')),
        }))

    const rows = ROWS.map(fill).filter((row) => row.length > 0)

    const theirs = [...byRole.keys()].filter((role) => !known.has(role)).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    if (theirs.length > 0) rows.push(fill(theirs))
    return rows
  }, [people])

  const partySize = party.flat().reduce((n, group) => n + group.names.length, 0)

  const allGifts = gifts.data?.gifts ?? []
  const received = allGifts.reduce((sum, g) => sum + (g.confirmed_centavos ?? 0), 0)
  const goal = allGifts.reduce((sum, g) => sum + (g.goal_centavos ?? 0), 0)

  const answered = (counts?.yes ?? 0) + (counts?.no ?? 0)
  const total = counts?.total ?? 0
  const share = total > 0 ? Math.round((answered / total) * 100) : 0
  const days = daysUntil(WEDDING)

  return (
    <>
      <ScreenTitle title="Painel" subtitle="Como está a lista e o que espera por vocês." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={days === 1 ? 'Dia para o casamento' : 'Dias para o casamento'}
          value={days > 0 ? days : days === 0 ? 'É hoje' : '—'}
          tone="yes"
        />
        <Stat label="Convidados" value={counts?.total ?? '—'} />
        <Stat label="Vão" value={counts?.yes ?? '—'} tone="yes" />
        <Stat label="Sem resposta" value={counts?.pending ?? '—'} />
      </div>

      <Card title="Quanto da lista já respondeu" className="mt-6">
        <div className="px-4 py-4">
          <div
            role="img"
            aria-label={`${answered} de ${total} responderam`}
            className="flex h-2.5 w-full overflow-hidden bg-sand-line"
          >
            <span
              className="bg-deep-olive"
              style={{ width: `${total > 0 ? ((counts?.yes ?? 0) / total) * 100 : 0}%` }}
            />
            <span
              className="bg-terracotta"
              style={{ width: `${total > 0 ? ((counts?.no ?? 0) / total) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-2 font-body text-sm text-dark-gray">
            <span className="font-display text-2xl text-ink">{share}%</span> responderam ·{' '}
            {counts?.yes ?? 0} vão · {counts?.no ?? 0} não vão · {counts?.pending ?? 0} em silêncio
          </p>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {byCategory.length > 0 ? (
          <Card title="Quem confirmou, por faixa">
            <div className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-4">
              {byCategory.map(([key, n]) => (
                <p key={key} className="font-body text-sm text-dark-gray">
                  <span className="font-display text-2xl text-ink">{n}</span>{' '}
                  {CATEGORY_PT[key] ?? key}
                </p>
              ))}
            </div>
          </Card>
        ) : null}

        {bySide.length > 0 ? (
          <Card title="A lista, por lado">
            <div className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-4">
              {bySide.map(([side, n]) => (
                <p key={side} className="font-body text-sm text-dark-gray">
                  <span className="font-display text-2xl text-ink">{n}</span>{' '}
                  {SIDE_PT[side] ?? side}
                </p>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      {party.length > 0 ? (
        <Card
          title={`Quem tem papel na cerimônia · ${partySize}`}
          className="mt-4"
          actions={
            <Link
              to="/convidados"
              className="font-body text-sm text-olive underline underline-offset-4"
            >
              editar
            </Link>
          }
        >
          <div className="grid gap-4 px-4 py-4">
            {party.map((row) => (
              <div
                key={row.map((group) => group.role).join('|')}
                // Up to four across, and never more than the row holds — two
                // roles share the width between them rather than each taking a
                // quarter and leaving half the line empty.
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]"
              >
                {row.map(({ role, names }) => (
                  <div key={role} className="border-l-2 border-gold-sand pl-3">
                    <p className="font-body text-xs tracking-[0.12em] text-olive uppercase">
                      {role}
                      {names.length > 1 ? (
                        <span className="text-dark-gray/60"> · {names.length}</span>
                      ) : null}
                    </p>
                    <ul className="mt-1">
                      {names.map((name) => (
                        <li key={name} className="font-body text-sm text-ink">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Presentes"
          actions={
            <Link
              to="/conteudo"
              className="font-body text-sm text-olive underline underline-offset-4"
            >
              editar
            </Link>
          }
        >
          {allGifts.length === 0 ? (
            <Empty>Nenhum presente cadastrado.</Empty>
          ) : (
            <div className="px-4 py-4">
              <p className="font-body text-sm text-dark-gray">
                <span className="font-display text-2xl text-ink">{money(received)}</span>
                {goal > 0 ? ` de ${money(goal)} em metas` : ' recebidos'}
              </p>
              <ul className="mt-3 grid gap-2">
                {allGifts
                  .filter((g) => g.kind === 'pix' && g.goal_centavos)
                  .map((g) => (
                    <li key={g.gift_id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-body text-sm text-ink">{g.title}</span>
                        <span className="shrink-0 font-body text-xs text-dark-gray">
                          {money(g.confirmed_centavos ?? 0)} / {money(g.goal_centavos ?? 0)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden bg-sand-line">
                        <span
                          className="block h-full bg-deep-olive"
                          style={{
                            width: `${Math.min(100, ((g.confirmed_centavos ?? 0) / (g.goal_centavos || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Card>

        <Card
          title="PIX a confirmar"
          actions={
            <Link
              to="/contribuicoes"
              className="font-body text-sm text-olive underline underline-offset-4"
            >
              ver todos
            </Link>
          }
        >
          {declared.length === 0 ? (
            <Empty>Nenhum PIX declarado esperando confirmação.</Empty>
          ) : (
            <ul className="divide-y divide-sand-line">
              {declared.slice(0, 5).map((c) => (
                <li
                  key={c.contribution_id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="font-body text-sm text-dark-gray">{c.contributor_name}</span>
                  <span className="font-body text-sm text-ink">{money(c.amount_centavos)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Últimos recados"
        className="mt-4"
        actions={
          <Link to="/recados" className="font-body text-sm text-olive underline underline-offset-4">
            ver todos
          </Link>
        }
      >
        {allMessages.length === 0 ? (
          <Empty>Ninguém escreveu ainda.</Empty>
        ) : (
          <ul className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
            {allMessages.slice(0, 6).map((m) => (
              <li key={m.message_id} className="border border-sand-line px-3 py-2.5">
                <p className="font-body text-sm text-olive">{m.author_name}</p>
                <p className="mt-0.5 line-clamp-3 font-body text-sm text-dark-gray">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
