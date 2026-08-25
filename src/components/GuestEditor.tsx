import { useState } from 'react'

import { $api, problemDetail } from '../api/client'
import { Button, Field, Notice } from './ui'
import { CATEGORIES, CATEGORY_ONE, GENDERS, GENDER_PT, SIDES, SIDE_PT } from '../lib/labels'

interface Row {
  groupId: string
  groupLabel: string
  guestId: string
  fullName: string
  category?: string
  gender?: string
  side?: string
  circle: string
  ceremonyRole: string
  notes: string
}

interface GuestEditorProps {
  row: Row
  /** Every guest, so the invitation can be merged into another one. */
  allRows: { guestId: string; groupId: string; groupLabel: string; fullName: string }[]
  onClose: () => void
  onSaved: () => void
}

/**
 * One guest, up close: their details, the invitation they belong to, and the
 * two repairs that need another invitation to point at.
 *
 * Attendance is not here. The RSVP flow owns it, and an edit screen that could
 * quietly rewrite somebody's answer would make the dashboard untrustworthy —
 * the couple would never know whether a "vai" came from the guest or a slip.
 */
export function GuestEditor({ row, allRows, onClose, onSaved }: GuestEditorProps) {
  const [name, setName] = useState(row.fullName)
  const [category, setCategory] = useState(row.category ?? '')
  const [gender, setGender] = useState(row.gender ?? '')
  const [side, setSide] = useState(row.side ?? '')
  const [circle, setCircle] = useState(row.circle)
  const [ceremonyRole, setCeremonyRole] = useState(row.ceremonyRole)
  const [notes, setNotes] = useState(row.notes)
  const [label, setLabel] = useState(row.groupLabel)
  const [moveTo, setMoveTo] = useState('')
  const [error, setError] = useState('')

  const save = $api.useMutation('patch', '/api/v1/admin/guests/{guest_id}')
  const rename = $api.useMutation('patch', '/api/v1/admin/groups/{group_id}')
  const merge = $api.useMutation('post', '/api/v1/admin/groups/{group_id}/members')

  const fail = (err: unknown) => setError(problemDetail(err))

  /** The other invitations, one entry each, named after their label. */
  const invitations = [...new Map(allRows.map((r) => [r.groupId, r.groupLabel])).entries()]
    .filter(([id]) => id !== row.groupId)
    .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))

  const submit = () => {
    setError('')
    save.mutate(
      {
        params: { path: { guest_id: row.guestId } },
        body: {
          full_name: name.trim(),
          category: category || undefined,
          gender: gender || undefined,
          side: side || undefined,
          circle,
          ceremony_role: ceremonyRole,
          notes,
        } as never,
      },
      {
        onSuccess: () => {
          if (label.trim() && label.trim() !== row.groupLabel) {
            rename.mutate(
              { params: { path: { group_id: row.groupId } }, body: { label: label.trim() } },
              { onSuccess: onSaved, onError: fail },
            )
            return
          }
          onSaved()
        },
        onError: fail,
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-ink/45 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar ${row.fullName}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg border border-olive-line bg-cream">
        <header className="flex items-center justify-between border-b border-sand-line px-4 py-3">
          <h2 className="font-display text-xl text-olive">{row.fullName}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer px-2 font-body text-sm text-dark-gray hover:text-olive"
          >
            fechar
          </button>
        </header>

        <div className="grid gap-3 px-4 py-4">
          <Field label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />

          <div className="grid gap-3 sm:grid-cols-3">
            <Pick label="Faixa" value={category} onChange={setCategory} options={CATEGORIES} labels={CATEGORY_ONE} />
            <Pick label="Gênero" value={gender} onChange={setGender} options={GENDERS} labels={GENDER_PT} />
            <Pick label="De quem" value={side} onChange={setSide} options={SIDES} labels={SIDE_PT} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Círculo" value={circle} onChange={(e) => setCircle(e.target.value)} hint="Amigos, família, trabalho…" />
            <Field label="Papel" value={ceremonyRole} onChange={(e) => setCeremonyRole(e.target.value)} hint="Padrinho, madrinha…" />
          </div>

          <Field label="Observação" value={notes} onChange={(e) => setNotes(e.target.value)} hint="Parentesco, lembretes — só vocês veem." />

          <hr className="my-1 border-sand-line" />

          <Field
            label="Nome do convite"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            hint="O título que o convidado vê ao encontrar o convite."
          />

          <label className="block">
            <span className="font-body text-sm text-dark-gray">Juntar a outro convite</span>
            <select
              value={moveTo}
              onChange={(event) => setMoveTo(event.target.value)}
              className="mt-1 min-h-10 w-full border border-olive-line bg-cream px-2 font-body text-sm text-ink focus:border-olive"
            >
              <option value="">— manter onde está —</option>
              {invitations.map(([id, text]) => (
                <option key={id} value={id}>
                  {text}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-body text-xs text-dark-gray">
              Quem responde passa a ser o principal do convite de destino.
            </span>
          </label>

          {moveTo ? (
            <Button
              tone="quiet"
              onClick={() => {
                setError('')
                merge.mutate(
                  { params: { path: { group_id: moveTo } }, body: { guest_id: row.guestId } },
                  { onSuccess: onSaved, onError: fail },
                )
              }}
              disabled={merge.isPending}
            >
              {merge.isPending ? 'Movendo…' : 'Mover agora'}
            </Button>
          ) : null}

          <Notice kind="error">{error}</Notice>

          <div className="mt-1 flex gap-2">
            <Button onClick={submit} disabled={save.isPending || rename.isPending}>
              {save.isPending || rename.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button tone="quiet" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Pick({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  labels: Record<string, string>
}) {
  return (
    <label className="block">
      <span className="font-body text-sm text-dark-gray">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-10 w-full border border-olive-line bg-cream px-2 font-body text-sm text-ink focus:border-olive"
      >
        <option value="">—</option>
        {options.map((key) => (
          <option key={key} value={key}>
            {labels[key] ?? key}
          </option>
        ))}
      </select>
    </label>
  )
}
