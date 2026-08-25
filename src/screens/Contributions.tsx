import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { Button, Empty, Notice, Panel, SkeletonRows, Stat } from '../components/ui'
import { CONTRIBUTION_STATUS_PT, money, shortDate } from '../lib/labels'

/**
 * PIX contributions the guests declared.
 *
 * Nothing here moves money — no gateway is involved (AD-6). A guest says "I
 * sent it", and the couple checks their bank and confirms. So "declarado" means
 * a promise and "confirmado" means the money arrived, and only the second one
 * should ever be counted.
 */
export function Contributions() {
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const list = $api.useQuery('get', '/api/v1/admin/contributions')
  const moderate = $api.useMutation('patch', '/api/v1/admin/contributions/{contribution_id}')

  const all = list.data?.contributions ?? []
  const declared = all.filter((c) => c.status === 'declared')
  const confirmed = all.filter((c) => c.status === 'confirmed')
  const total = confirmed.reduce((sum, c) => sum + c.amount_centavos, 0)

  const decide = (id: string, status: 'confirmed' | 'cancelled') => {
    setError('')
    moderate.mutate(
      { params: { path: { contribution_id: id } }, body: { status } },
      {
        onSuccess: () => void queryClient.invalidateQueries(),
        onError: (err) => setError(problemDetail(err)),
      },
    )
  }

  return (
    <>
      <ScreenTitle
        title="Contribuições"
        subtitle="O convidado avisa que fez o PIX; vocês conferem no banco e confirmam aqui."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Esperando conferência" value={declared.length} />
        <Stat label="Confirmadas" value={confirmed.length} tone="yes" />
        <Stat label="Total recebido" value={money(total)} tone="yes" />
      </div>

      <Notice kind="error">{error}</Notice>

      <Panel title="Todas as contribuições" className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left">
          <thead>
            <tr className="font-body text-xs tracking-[0.12em] text-dark-gray uppercase">
              <th className="px-4 py-2 font-normal">Quem</th>
              <th className="px-4 py-2 font-normal">Valor</th>
              <th className="px-4 py-2 font-normal">Quando</th>
              <th className="px-4 py-2 font-normal">Situação</th>
              <th className="px-4 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {list.isPending ? (
              <SkeletonRows cols={5} />
            ) : all.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <Empty>Ninguém contribuiu ainda.</Empty>
                </td>
              </tr>
            ) : (
              all.map((c) => (
                <tr key={c.contribution_id} className="row-in border-t border-sand-line">
                  <td className="px-4 py-3 font-body text-sm text-ink">{c.contributor_name}</td>
                  <td className="px-4 py-3 font-body text-sm text-ink">{money(c.amount_centavos)}</td>
                  <td className="px-4 py-3 font-body text-sm text-dark-gray">
                    {shortDate(c.created_at)}
                  </td>
                  <td className="px-4 py-3 font-body text-sm">
                    <span
                      className={
                        c.status === 'confirmed'
                          ? 'text-olive'
                          : c.status === 'cancelled'
                            ? 'text-dark-gray line-through'
                            : 'text-terracotta'
                      }
                    >
                      {CONTRIBUTION_STATUS_PT[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'declared' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => decide(c.contribution_id, 'confirmed')}>
                          Recebi
                        </Button>
                        <Button tone="danger" onClick={() => decide(c.contribution_id, 'cancelled')}>
                          Não chegou
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </>
  )
}
