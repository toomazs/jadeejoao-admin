import { Panel } from './ui'

export interface Report {
  added?: string[] | null
  updated?: string[] | null
  unmatched?: string[] | null
  conflicts?: { name: string; file_group?: string; db_group?: string; reason: string }[] | null
  errors?: { line: number; message: string }[] | null
}

/**
 * What an import actually did.
 *
 * Shown in full rather than as "importado com sucesso", because the interesting
 * cases are never the successes. A name that collides with somebody in another
 * invitation is reported and NOT written (AD-10) — if that were hidden behind a
 * green tick, the couple would believe a guest is on the list who is not.
 */
export function ImportReport({ report, onClose }: { report: Report; onClose: () => void }) {
  const added = report.added ?? []
  const updated = report.updated ?? []
  const unmatched = report.unmatched ?? []
  const conflicts = report.conflicts ?? []
  const errors = report.errors ?? []

  return (
    <Panel
      title="O que a planilha fez"
      className="mt-5"
      actions={
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer font-body text-sm text-dark-gray hover:text-olive"
        >
          fechar
        </button>
      }
    >
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <List title={`${added.length} adicionados`} names={added} tone="ok" />
        <List title={`${updated.length} atualizados`} names={updated} tone="ok" />

        {unmatched.length > 0 ? (
          <List
            title={`${unmatched.length} não estavam na planilha`}
            names={unmatched}
            tone="quiet"
            note="Continuam na lista — a importação nunca apaga ninguém. Se saíram mesmo, apague à mão."
          />
        ) : null}

        {conflicts.length > 0 ? (
          <div className="sm:col-span-2">
            <p className="font-body text-sm text-terracotta">
              {conflicts.length} conflitos — <b>nenhum destes foi gravado</b>
            </p>
            <ul className="mt-2 grid gap-2">
              {conflicts.map((c, i) => (
                <li key={i} className="border border-terracotta/40 bg-veil px-3 py-2">
                  <p className="font-body text-sm text-ink">{c.name}</p>
                  <p className="font-body text-xs text-dark-gray">{c.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="sm:col-span-2">
            <p className="font-body text-sm text-terracotta">{errors.length} avisos de linha</p>
            <ul className="mt-2 grid gap-1">
              {errors.map((e, i) => (
                <li key={i} className="font-body text-xs text-dark-gray">
                  linha {e.line}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}

function List({
  title,
  names,
  tone,
  note,
}: {
  title: string
  names: string[]
  tone: 'ok' | 'quiet'
  note?: string
}) {
  return (
    <div>
      <p className={`font-body text-sm ${tone === 'ok' ? 'text-olive' : 'text-dark-gray'}`}>{title}</p>
      {note ? <p className="mt-0.5 font-body text-xs text-dark-gray italic">{note}</p> : null}
      {names.length > 0 ? (
        <p className="mt-1 font-body text-xs leading-relaxed text-dark-gray">
          {names.slice(0, 40).join(' · ')}
          {names.length > 40 ? ` … e mais ${names.length - 40}` : ''}
        </p>
      ) : null}
    </div>
  )
}
