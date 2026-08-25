import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { ScreenTitle } from '../components/Shell'
import { Button, Chip, DataTable, Notice, Stat } from '../components/ui'
import type { ChipTone, Column } from '../components/ui'
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

  const TONE: Record<string, ChipTone> = {
    confirmed: 'yes',
    cancelled: 'neutral',
    declared: 'waiting',
  }

  const columns: Column<(typeof all)[number]>[] = [
    {
      key: 'who',
      header: 'Quem',
      value: (c) => c.contributor_name,
      cell: (c) => <span className="font-body text-sm text-ink">{c.contributor_name}</span>,
    },
    {
      key: 'amount',
      header: 'Valor',
      // Sorted by the raw centavos, padded, so R$ 1.000,00 does not land
      // before R$ 90,00 the way the formatted string would.
      value: (c) => String(c.amount_centavos).padStart(12, '0'),
      cell: (c) => <span className="font-body text-sm text-ink">{money(c.amount_centavos)}</span>,
    },
    {
      key: 'when',
      header: 'Quando',
      value: (c) => c.created_at ?? '',
      cell: (c) => <span className="font-body text-sm text-dark-gray">{shortDate(c.created_at)}</span>,
    },
    {
      key: 'status',
      header: 'Situação',
      filterable: true,
      value: (c) => CONTRIBUTION_STATUS_PT[c.status] ?? c.status,
      cell: (c) => (
        <Chip tone={TONE[c.status] ?? 'neutral'}>
          {CONTRIBUTION_STATUS_PT[c.status] ?? c.status}
        </Chip>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      className: 'text-right',
      cell: (c) =>
        c.status === 'declared' ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => decide(c.contribution_id, 'confirmed')}>Recebi</Button>
            <Button tone="danger" onClick={() => decide(c.contribution_id, 'cancelled')}>
              Não chegou
            </Button>
          </div>
        ) : null,
    },
  ]

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

      <div className="mt-6">
        <DataTable
          rows={all}
          columns={columns}
          rowKey={(c) => c.contribution_id}
          loading={list.isPending}
          empty="Ninguém contribuiu ainda."
          minWidth="42rem"
        />
      </div>
    </>
  )
}
