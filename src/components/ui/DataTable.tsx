import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

import { Checkbox } from './controls'
import { portalHost } from './portalHost'
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
  perPage = 25,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  loading?: boolean
  empty?: ReactNode
  minWidth?: string
  /** Rows on one page. The guest list is a hundred and twenty-two of them. */
  perPage?: number
}) {
  const [sort, setSort] = useState<Sort>(null)
  const [filters, setFilters] = useState<Record<string, Set<string>>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [page, setPage] = useState(0)

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

  /**
   * A page is a view onto one particular result set, so a different result set
   * starts at the beginning.
   *
   * The search box lives on the screen above, filtering the rows before they
   * ever reach this table — so narrowing a hundred and twenty-two names to
   * thirty while sitting on page three left the couple on page two of results
   * they had just asked for, wondering what they were looking at.
   *
   * Keyed on the shape of the answer rather than on `rows`, whose identity
   * changes on every render of the parent: resetting on that would pin the
   * table to page one and make the arrows do nothing.
   */
  const query = `${shown.length}|${JSON.stringify(sort)}|${Object.entries(filters)
    .map(([key, set]) => `${key}:${[...set].sort().join(',')}`)
    .sort()
    .join('|')}`
  const seen = useRef(query)
  useEffect(() => {
    if (seen.current === query) return
    seen.current = query
    setPage(0)
  }, [query])

  const pages = Math.max(1, Math.ceil(shown.length / perPage))
  // Filtering down to fewer rows than the current page holds would otherwise
  // leave the table showing an empty page of a list that has results.
  const at = Math.min(page, pages - 1)
  const from = at * perPage
  const visible = shown.slice(from, from + perPage)

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
              visible.map((row) => (
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

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-xs text-dark-gray">
          {shown.length === 0
            ? 'nenhuma linha'
            : `${from + 1}–${Math.min(from + perPage, shown.length)} de ${shown.length}`}
          {shown.length !== rows.length ? ` (de ${rows.length})` : ''}
        </p>

        {pages > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={at === 0}
              onClick={() => setPage(at - 1)}
              className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center border border-olive-line text-dark-gray transition-colors hover:border-olive hover:text-olive disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="font-body text-sm text-dark-gray tabular-nums">
              {at + 1} de {pages}
            </span>
            <button
              type="button"
              aria-label="Próxima página"
              disabled={at >= pages - 1}
              onClick={() => setPage(at + 1)}
              className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center border border-olive-line text-dark-gray transition-colors hover:border-olive hover:text-olive disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
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
  const panel = useRef<HTMLDivElement>(null)
  const [spot, setSpot] = useState<{ top: number; left: number } | null>(null)

  // Where the panel goes, measured from the funnel each time it opens. It is
  // in a portal now, so it has no parent to be positioned against.
  useEffect(() => {
    if (!open) {
      setSpot(null)
      return
    }
    const place = () => {
      const rect = wrapper.current?.getBoundingClientRect()
      if (!rect) return
      setSpot({
        top: rect.bottom + 4,
        // Nudged back inside when the column is near the right edge.
        left: Math.min(rect.left, window.innerWidth - 224),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (wrapper.current?.contains(target) || panel.current?.contains(target)) return
      onClose()
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

      {/* In a portal, fixed to where the funnel is. The table scrolls
          horizontally, and a scroll container clips whatever is inside it — so
          an absolutely positioned panel was cut off by the edge of the table.
          Filtering down to two rows made the box short enough to cut off the
          panel that had just done the filtering. */}
      {open && spot
        ? createPortal(
            <div
              ref={panel}
              style={{ top: spot.top, left: spot.left }}
              className="fixed z-40 max-h-64 w-52 overflow-y-auto border border-olive-line bg-cream p-2 shadow-[0_18px_40px_-24px_rgba(26,24,24,0.6)]"
            >
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
            </div>,
            portalHost(wrapper.current),
          )
        : null}
    </div>
  )
}
