import { ArrowDown, ArrowUp, Filter, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { Checkbox } from './controls'
import { Empty, SkeletonRows } from './primitives'

/**
 * The table the panel reads its lists from.
 *
 * Sorting and filtering live in the column header, where the question is
 * asked: "who hasn't answered?" is a thought about the presence column, not
 * about a filter bar somewhere else on the screen. Clicking the header sorts;
 * the funnel beside it narrows to the values present in that column.
 *
 * The options are read from the data rather than declared, so a circle the
 * couple invents in their spreadsheet becomes a filter without anyone adding
 * it here.
 */

export interface Column<T> {
  key: string
  header: string
  /** What to draw in the cell. */
  cell: (row: T) => ReactNode
  /** The value to sort and filter by; defaults to the cell being a string. */
  value?: (row: T) => string
  /** Off for action columns, which have nothing to sort. */
  sortable?: boolean
  filterable?: boolean
  className?: string
}

type Sort = { key: string; dir: 'asc' | 'desc' } | null

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  loading,
  empty = 'Nada aqui.',
  minWidth = '52rem',
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  loading?: boolean
  empty?: ReactNode
  minWidth?: string
}) {
  const [sort, setSort] = useState<Sort>(null)
  const [filters, setFilters] = useState<Record<string, Set<string>>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)

  const valueOf = (row: T, column: Column<T>): string => {
    if (column.value) return column.value(row)
    const drawn = column.cell(row)
    return typeof drawn === 'string' ? drawn : ''
  }

  const shown = useMemo(() => {
    let out = rows.filter((row) =>
      Object.entries(filters).every(([key, allowed]) => {
        if (allowed.size === 0) return true
        const column = columns.find((c) => c.key === key)
        return column ? allowed.has(valueOf(row, column)) : true
      }),
    )
    if (sort) {
      const column = columns.find((c) => c.key === sort.key)
      if (column) {
        out = [...out].sort((a, b) => {
          const cmp = valueOf(a, column).localeCompare(valueOf(b, column), 'pt-BR', {
            numeric: true,
          })
          return sort.dir === 'asc' ? cmp : -cmp
        })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, filters, sort])

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key !== key
        ? { key, dir: 'asc' }
        : current.dir === 'asc'
          ? { key, dir: 'desc' }
          : null,
    )

  const active = Object.values(filters).reduce((n, set) => n + (set.size > 0 ? 1 : 0), 0)

  return (
    <div>
      {active > 0 ? (
        <button
          type="button"
          onClick={() => setFilters({})}
          className="mb-2 flex cursor-pointer items-center gap-1.5 font-body text-sm text-dark-gray transition-colors hover:text-terracotta"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          limpar {active === 1 ? 'o filtro' : `os ${active} filtros`}
        </button>
      ) : null}

      <div className="overflow-x-auto border border-olive-line bg-cream">
        <table className="w-full text-left" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-sand-line">
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-2 font-normal ${column.className ?? ''}`}>
                  <div className="flex items-center gap-1">
                    {column.sortable === false ? (
                      <span className="font-body text-xs tracking-[0.12em] text-dark-gray uppercase">
                        {column.header}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="flex cursor-pointer items-center gap-1 font-body text-xs tracking-[0.12em] text-dark-gray uppercase transition-colors hover:text-olive"
                      >
                        {column.header}
                        {sort?.key === column.key ? (
                          sort.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : null}
                      </button>
                    )}

                    {column.filterable ? (
                      <ColumnFilter
                        options={[...new Set(rows.map((r) => valueOf(r, column)).filter(Boolean))].sort(
                          (a, b) => a.localeCompare(b, 'pt-BR'),
                        )}
                        chosen={filters[column.key] ?? new Set()}
                        open={openFilter === column.key}
                        onOpen={() => setOpenFilter(openFilter === column.key ? null : column.key)}
                        onClose={() => setOpenFilter(null)}
                        onChange={(next) =>
                          setFilters((current) => ({ ...current, [column.key]: next }))
                        }
                      />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={columns.length} rows={8} />
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <Empty>{empty}</Empty>
                </td>
              </tr>
            ) : (
              shown.map((row) => (
                <tr key={rowKey(row)} className="border-t border-sand-line hover:bg-veil">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-2.5 ${column.className ?? ''}`}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 font-body text-xs text-dark-gray">
        {shown.length === rows.length
          ? `${rows.length} no total`
          : `${shown.length} de ${rows.length}`}
      </p>
    </div>
  )
}

function ColumnFilter({
  options,
  chosen,
  open,
  onOpen,
  onClose,
  onChange,
}: {
  options: string[]
  chosen: Set<string>
  open: boolean
  onOpen: () => void
  onClose: () => void
  onChange: (next: Set<string>) => void
}) {
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, onClose])

  if (options.length < 2) return null

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Filtrar esta coluna"
        className={`cursor-pointer p-1 transition-colors ${
          chosen.size > 0 ? 'text-olive' : 'text-dark-gray/45 hover:text-olive'
        }`}
      >
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 z-20 mt-1 max-h-64 w-52 overflow-y-auto border border-olive-line bg-cream p-2 shadow-[0_18px_40px_-24px_rgba(26,24,24,0.6)]">
          {options.map((option) => (
            <div key={option} className="px-1 py-1">
              <Checkbox
                checked={chosen.has(option)}
                onChange={(on) => {
                  const next = new Set(chosen)
                  if (on) next.add(option)
                  else next.delete(option)
                  onChange(next)
                }}
                label={option}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
