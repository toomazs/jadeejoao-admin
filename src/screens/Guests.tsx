import { useQueryClient } from '@tanstack/react-query'
import { Crown, Download, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { GuestEditor } from '../components/GuestEditor'
import { ImportReport } from '../components/ImportReport'
import type { Report } from '../components/ImportReport'
import { ScreenTitle } from '../components/Shell'
import { Button, Empty, Notice, Panel, SkeletonRows, Stat } from '../components/ui'
import { ATTENDING_PT, CATEGORY_ONE, SIDE_PT } from '../lib/labels'
import { supabase } from '../lib/auth'

type Row = {
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

const ALL = '__todos__'

/**
 * The guest list — the screen the couple will actually live in.
 *
 * Flattened to one row per person rather than nested by invitation, because
 * every question they ask ("who hasn't answered?", "how many children?", "who
 * is on João's side?") is about people, and a nested tree would make each one
 * a hunt. The invitation is still there, as a column and as the thing the
 * repair actions act on.
 */
export function Guests() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL)
  const [side, setSide] = useState(ALL)
  const [circle, setCircle] = useState(ALL)
  const [editing, setEditing] = useState<Row | null>(null)
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

  const circles = useMemo(
    () => [...new Set(rows.map((r) => r.circle).filter(Boolean))].sort(),
    [rows],
  )

  const shown = rows.filter((r) => {
    if (status !== ALL && r.attending !== status) return false
    if (side !== ALL && r.side !== side) return false
    if (circle !== ALL && r.circle !== circle) return false
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

  /** Export and import both need the session token; neither is JSON. */
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

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="min-w-52 flex-1">
          <span className="font-body text-xs tracking-[0.12em] text-dark-gray uppercase">Buscar</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="nome, convite ou observação…"
            className="mt-1 min-h-10 w-full border border-olive-line bg-cream px-3 font-body text-sm text-ink placeholder:text-dark-gray/45 focus:border-olive"
          />
        </label>
        <Select label="Presença" value={status} onChange={setStatus} options={ATTENDING_PT} />
        <Select label="De quem" value={side} onChange={setSide} options={SIDE_PT} />
        <Select
          label="Círculo"
          value={circle}
          onChange={setCircle}
          options={Object.fromEntries(circles.map((c) => [c, c]))}
        />
      </div>

      <Panel title={`${shown.length} na tela`} className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left">
          <thead>
            <tr className="font-body text-xs tracking-[0.12em] text-dark-gray uppercase">
              <th className="px-4 py-2 font-normal">Nome</th>
              <th className="px-4 py-2 font-normal">Convite</th>
              <th className="px-4 py-2 font-normal">Presença</th>
              <th className="px-4 py-2 font-normal">Faixa</th>
              <th className="px-4 py-2 font-normal">De quem</th>
              <th className="px-4 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {dashboard.isPending ? (
              <SkeletonRows cols={6} rows={10} />
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <Empty>Ninguém com esses filtros.</Empty>
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.guestId} className="border-t border-sand-line hover:bg-veil">
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="cursor-pointer text-left font-body text-sm text-ink hover:text-olive"
                    >
                      {r.fullName}
                    </button>
                    {r.ceremonyRole && r.ceremonyRole !== 'Convidado' ? (
                      <span className="ml-2 font-body text-xs text-gold-sand">{r.ceremonyRole}</span>
                    ) : null}
                    {r.addedByGuest ? (
                      <span className="ml-2 font-body text-xs text-dark-gray">· trazido</span>
                    ) : null}
                    {r.notes ? (
                      <p className="font-body text-xs text-dark-gray italic">{r.notes}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 font-body text-sm text-dark-gray">
                    {r.groupLabel}
                    {r.groupSize > 1 ? (
                      <span className="ml-1 text-xs">({r.groupSize})</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 font-body text-sm">
                    <span
                      className={
                        r.attending === 'yes'
                          ? 'text-olive'
                          : r.attending === 'no'
                            ? 'text-terracotta'
                            : 'text-dark-gray'
                      }
                    >
                      {ATTENDING_PT[r.attending] ?? r.attending}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-body text-sm text-dark-gray">
                    {r.category ? (CATEGORY_ONE[r.category] ?? r.category) : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-body text-sm text-dark-gray">
                    {r.side ? (SIDE_PT[r.side] ?? r.side) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {!r.isPrimary && r.groupSize > 1 ? (
                        <button
                          type="button"
                          title="Passar o convite para esta pessoa"
                          aria-label={`Passar o convite para ${r.fullName}`}
                          onClick={() =>
                            promote.mutate(
                              {
                                params: { path: { group_id: r.groupId } },
                                body: { guest_id: r.guestId },
                              },
                              { onSuccess: done, onError: fail },
                            )
                          }
                          className="cursor-pointer p-1 text-dark-gray/50 transition-colors hover:text-olive"
                        >
                          <Crown className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        title="Apagar convidado"
                        aria-label={`Apagar ${r.fullName}`}
                        onClick={() => {
                          if (!window.confirm(`Apagar ${r.fullName} da lista? Isso não tem volta.`)) return
                          remove.mutate(
                            { params: { path: { guest_id: r.guestId } } },
                            { onSuccess: done, onError: fail },
                          )
                        }}
                        className="cursor-pointer p-1 text-dark-gray/50 transition-colors hover:text-terracotta"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

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
    </>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Record<string, string>
}) {
  return (
    <label>
      <span className="font-body text-xs tracking-[0.12em] text-dark-gray uppercase">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block min-h-10 border border-olive-line bg-cream px-2 font-body text-sm text-ink focus:border-olive"
      >
        <option value={ALL}>Todos</option>
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}
