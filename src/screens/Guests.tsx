import { useQueryClient } from '@tanstack/react-query'
import { Crown, Download, Pencil, Trash2, Upload, UserPlus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { GuestEditor } from '../components/GuestEditor'
import { ImportReport } from '../components/ImportReport'
import type { Report } from '../components/ImportReport'
import { ScreenTitle } from '../components/Shell'
import { Button, Chip, ConfirmModal, DataTable, Notice, SearchField, Stat } from '../components/ui'
import type { ChipTone, Column } from '../components/ui'
import { supabase } from '../lib/auth'
import { ATTENDING_PT, CATEGORY_ONE, SIDE_PT } from '../lib/labels'

interface Row {
  groupId: string
  groupLabel: string
  guestId: string
  fullName: string
  isPrimary: boolean
  category?: string
  attending: string
  addedByGuest: boolean
  gender?: string
  side?: string
  circle: string
  ceremonyRole: string
  notes: string
  groupSize: number
}

const TONE: Record<string, ChipTone> = { yes: 'yes', no: 'no', pending: 'waiting' }

/**
 * The guest list — the screen the couple will actually live in.
 *
 * One row per person rather than a tree of invitations, because every question
 * they ask ("who hasn't answered?", "how many children?", "who is on João's
 * side?") is about people. Those questions are answered in the column headers:
 * click to sort, funnel to narrow. The invitation is still there, as a column
 * and as what the repair actions act on.
 */
export function Guests() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [confirming, setConfirming] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const dashboard = $api.useQuery('get', '/api/v1/admin/guests')
  const remove = $api.useMutation('delete', '/api/v1/admin/guests/{guest_id}')
  const promote = $api.useMutation('post', '/api/v1/admin/groups/{group_id}/primary')

  const rows: Row[] = useMemo(
    () =>
      (dashboard.data?.groups ?? []).flatMap((g) =>
        (g.members ?? []).map((m) => ({
          groupId: g.group_id,
          groupLabel: g.label,
          guestId: m.guest_id,
          fullName: m.full_name,
          isPrimary: m.is_primary,
          category: m.category ?? undefined,
          attending: m.attending,
          addedByGuest: m.added_by_guest,
          gender: m.gender ?? undefined,
          side: m.side ?? undefined,
          circle: m.circle ?? '',
          ceremonyRole: m.ceremony_role ?? '',
          notes: m.notes ?? '',
          groupSize: (g.members ?? []).length,
        })),
      ),
    [dashboard.data],
  )

  // Search spans the fields somebody would actually search by; the columns
  // handle the rest, so this stays one box instead of four.
  const shown = rows.filter((r) => {
    if (!search.trim()) return true
    const needle = search.trim().toLowerCase()
    return (
      r.fullName.toLowerCase().includes(needle) ||
      r.groupLabel.toLowerCase().includes(needle) ||
      r.notes.toLowerCase().includes(needle)
    )
  })

  const counts = dashboard.data?.headcounts
  const done = () => void queryClient.invalidateQueries()
  const fail = (err: unknown) => setError(problemDetail(err))

  /** Export and import both carry the session token and neither is JSON. */
  const authHeader = async () => {
    const { data } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${data.session?.access_token ?? ''}` }
  }

  const exportCsv = async () => {
    setError('')
    const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/guests/export`, {
      headers: await authHeader(),
    })
    if (!resp.ok) {
      setError('Não conseguimos gerar o CSV agora.')
      return
    }
    const url = URL.createObjectURL(await resp.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = 'convidados.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file: File) => {
    setError('')
    setReport(null)
    setImporting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/import`, {
        method: 'POST',
        headers: await authHeader(),
        body: form,
      })
      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setError(problemDetail(payload, 'Não conseguimos ler essa planilha.'))
        return
      }
      setReport(payload as Report)
      done()
    } finally {
      setImporting(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Nome',
      value: (r) => r.fullName,
      cell: (r) => (
        <>
          <button
            type="button"
            onClick={() => setEditing(r)}
            className="cursor-pointer text-left font-body text-sm text-ink transition-colors hover:text-olive"
          >
            {r.fullName}
          </button>
          {/* A chip, not gold text on cream: at that contrast the padrinhos and
              madrinhas were there and nobody could pick them out. */}
          {r.ceremonyRole && r.ceremonyRole !== 'Convidado' ? (
            <span className="ml-2 align-middle">
              <Chip tone="accent">{r.ceremonyRole}</Chip>
            </span>
          ) : null}
          {r.addedByGuest ? (
            <span className="ml-2 font-body text-xs text-dark-gray">· trazido</span>
          ) : null}
          {r.notes ? <p className="font-body text-xs text-dark-gray italic">{r.notes}</p> : null}
        </>
      ),
    },
    {
      key: 'invitation',
      header: 'Convite',
      // Only when the invitation says something the name does not. Everyone
      // starts alone in their own invitation, labelled with their own name, so
      // the column was repeating the one beside it a hundred and twenty-two
      // times. It earns its place when somebody is brought along.
      value: (r) => (r.groupSize > 1 ? r.groupLabel : 'só a pessoa'),
      filterable: true,
      cell: (r) =>
        r.groupSize > 1 ? (
          <span className="font-body text-sm text-dark-gray">
            {r.groupLabel}
            <span className="ml-1 text-xs">({r.groupSize} pessoas)</span>
          </span>
        ) : (
          <span className="font-body text-sm text-dark-gray/50">só</span>
        ),
    },
    {
      key: 'attending',
      header: 'Presença',
      filterable: true,
      value: (r) => ATTENDING_PT[r.attending] ?? r.attending,
      cell: (r) => (
        <Chip tone={TONE[r.attending] ?? 'neutral'}>{ATTENDING_PT[r.attending] ?? r.attending}</Chip>
      ),
    },
    {
      key: 'category',
      header: 'Faixa',
      filterable: true,
      value: (r) => (r.category ? (CATEGORY_ONE[r.category] ?? r.category) : '—'),
      cell: (r) => (
        <span className="font-body text-sm text-dark-gray">
          {r.category ? (CATEGORY_ONE[r.category] ?? r.category) : '—'}
        </span>
      ),
    },
    {
      key: 'side',
      header: 'De quem',
      filterable: true,
      value: (r) => (r.side ? (SIDE_PT[r.side] ?? r.side) : '—'),
      cell: (r) => (
        <span className="font-body text-sm text-dark-gray">
          {r.side ? (SIDE_PT[r.side] ?? r.side) : '—'}
        </span>
      ),
    },
    {
      key: 'circle',
      header: 'Círculo',
      filterable: true,
      value: (r) => r.circle || '—',
      cell: (r) => <span className="font-body text-sm text-dark-gray">{r.circle || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {!r.isPrimary && r.groupSize > 1 ? (
            <button
              type="button"
              title="Passar o convite para esta pessoa"
              aria-label={`Passar o convite para ${r.fullName}`}
              onClick={() =>
                promote.mutate(
                  { params: { path: { group_id: r.groupId } }, body: { guest_id: r.guestId } },
                  { onSuccess: done, onError: fail },
                )
              }
              className="cursor-pointer p-1 text-dark-gray/50 transition-colors hover:text-olive"
            >
              <Crown className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          {/* The name is still the obvious thing to click. This is for
              whoever does not think to try it. */}
          <button
            type="button"
            title="Editar convidado"
            aria-label={`Editar ${r.fullName}`}
            onClick={() => setEditing(r)}
            className="cursor-pointer p-1 text-dark-gray/50 transition-colors hover:text-olive"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Apagar convidado"
            aria-label={`Apagar ${r.fullName}`}
            onClick={() => setConfirming(r)}
            className="cursor-pointer p-1 text-dark-gray/50 transition-colors hover:text-terracotta"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ScreenTitle
        title="Convidados"
        subtitle={`${rows.length} pessoas em ${dashboard.data?.groups?.length ?? 0} convites`}
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importFile(file)
              }}
            />
            <Button
              onClick={() =>
                // A blank row: the editor takes the absence of an id as
                // "this person does not exist yet".
                setEditing({
                  groupId: '',
                  groupLabel: '',
                  guestId: '',
                  fullName: '',
                  isPrimary: true,
                  attending: 'pending',
                  addedByGuest: false,
                  circle: '',
                  ceremonyRole: '',
                  notes: '',
                  groupSize: 1,
                })
              }
            >
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Novo convidado
              </span>
            </Button>
            <Button tone="quiet" onClick={() => void exportCsv()}>
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" aria-hidden="true" />
                CSV
              </span>
            </Button>
            <Button tone="quiet" onClick={() => fileInput.current?.click()} disabled={importing}>
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" aria-hidden="true" />
                {importing ? 'Lendo…' : 'Importar planilha'}
              </span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Convidados" value={counts?.total ?? '—'} />
        <Stat label="Vão" value={counts?.yes ?? '—'} tone="yes" />
        <Stat label="Não vão" value={counts?.no ?? '—'} tone="no" />
        <Stat label="Sem resposta" value={counts?.pending ?? '—'} />
      </div>

      {report ? <ImportReport report={report} onClose={() => setReport(null)} /> : null}
      <Notice kind="error">{error}</Notice>

      <SearchField
        label="Buscar"
        value={search}
        onChange={setSearch}
        placeholder="nome, convite ou observação…"
        className="mt-5 max-w-md"
      />

      <div className="mt-4">
        <DataTable
          rows={shown}
          columns={columns}
          rowKey={(r) => r.guestId}
          loading={dashboard.isPending}
          empty="Ninguém com esses filtros."
        />
      </div>

      {editing ? (
        <GuestEditor
          row={editing}
          allRows={rows}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            done()
          }}
        />
      ) : null}

      {confirming ? (
        <ConfirmModal
          title="Apagar convidado"
          message={`${confirming.fullName} sai da lista para sempre, junto com a resposta que tenha dado. Isso não tem volta.`}
          onClose={() => setConfirming(null)}
          onConfirm={() =>
            remove.mutate(
              { params: { path: { guest_id: confirming.guestId } } },
              { onSuccess: done, onError: fail },
            )
          }
        />
      ) : null}
    </>
  )
}
