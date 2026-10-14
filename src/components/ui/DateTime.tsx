import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { portalHost, useAnchoredSpot } from './portalHost'

/**
 * A calendar and a clock, drawn here rather than borrowed from the browser.
 *
 * The native date input renders as operating-system chrome — grey, square-
 * cornered, different on every machine — dropped into a cream and olive panel.
 * And it shows dates in whatever order the machine's locale says, which for a
 * couple in Brazil is a coin toss between 08/07 and 07/08 on somebody's laptop.
 *
 * Here the month is spelled out, so a date can only be read one way.
 */

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const WEEKDAYS = ['d', 's', 't', 'q', 'q', 's', 's']

/** `2027-08-07` → the parts, without letting Date apply a timezone. */
function parseISODate(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) }
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function formatLongDate(value: string): string {
  const parts = parseISODate(value)
  if (!parts) return '—'
  return `${parts.d} de ${MONTHS[parts.m]} de ${parts.y}`
}

/* -------------------------------------------------------------- calendar */

function MonthGrid({
  value,
  onPick,
}: {
  value: string
  onPick: (next: string) => void
}) {
  const today = new Date()
  const picked = parseISODate(value)
  const [cursor, setCursor] = useState(() => ({
    y: picked?.y ?? today.getFullYear(),
    m: picked?.m ?? today.getMonth(),
  }))

  // `new Date(y, m, 0).getDate()` is the last day of the previous month, which
  // is how many days month `m - 1` has — the standard trick, and it handles
  // leap years without a table.
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const firstWeekday = new Date(cursor.y, cursor.m, 1).getDay()

  const step = (by: number) => {
    const m = cursor.m + by
    setCursor({ y: cursor.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 })
  }

  return (
    <div className="w-64 border border-olive-line bg-cream p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => step(-1)}
          className="cursor-pointer p-1 text-dark-gray transition-colors hover:text-olive"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="font-body text-sm text-olive">
          {MONTHS[cursor.m]} de {cursor.y}
        </p>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => step(1)}
          className="cursor-pointer p-1 text-dark-gray transition-colors hover:text-olive"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1 text-center font-body text-xs text-dark-gray/70">
            {w}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const stamp = iso(cursor.y, cursor.m, day)
          const isPicked = stamp === value
          const isToday =
            cursor.y === today.getFullYear() &&
            cursor.m === today.getMonth() &&
            day === today.getDate()
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(stamp)}
              className={`aspect-square cursor-pointer border font-body text-sm transition-colors ${
                isPicked
                  ? 'border-olive bg-olive text-cream'
                  : isToday
                    ? 'border-gold-sand text-ink hover:border-olive'
                    : 'border-transparent text-ink hover:border-olive-line'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ date */

/** What the month grid needs, so it can open upwards when it has to. */
const CALENDAR_H = 310

export function DateField({
  label,
  value,
  onChange,
  className = '',
}: {
  label?: string
  value: string
  onChange: (next: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const spot = useAnchoredSpot(open, wrapper, CALENDAR_H)

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node
      // The panel is no longer inside the wrapper, so it has to be asked
      // separately — otherwise mousedown on a day closed the calendar before
      // the click that picks it ever landed.
      if (wrapper.current?.contains(target) || panel.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      {label ? (
        <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`mt-1 flex min-h-10 w-full cursor-pointer items-center gap-2 border bg-cream px-3 text-left font-body text-sm transition-colors ${
          open ? 'border-olive' : 'border-olive-line'
        } ${value ? 'text-ink' : 'text-dark-gray/60'}`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-dark-gray" aria-hidden="true" />
        {value ? formatLongDate(value) : 'escolher a data'}
      </button>

      {open && spot
        ? createPortal(
            <div
              ref={panel}
              style={{ top: spot.top, left: spot.left }}
              className="fixed z-50 shadow-[0_18px_40px_-24px_rgba(26,24,24,0.6)]"
            >
              <MonthGrid
                value={value}
                onPick={(next) => {
                  onChange(next)
                  setOpen(false)
                }}
              />
            </div>,
            portalHost(wrapper.current),
          )
        : null}
    </div>
  )
}

/* ------------------------------------------------------------------ time */

/**
 * The clock: hours and minutes as two lists, not a text box.
 *
 * Minutes go in fives — nothing in a wedding day starts at 15:37, and a full
 * list of sixty would be a scroll for no reason.
 */
/** The two columns are max-h-56, plus the border. */
const CLOCK_H = 228

export function TimeField({
  label,
  value,
  onChange,
  className = '',
}: {
  label?: string
  value: string
  onChange: (next: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [hh = '', mm = ''] = value.split(':')
  const spot = useAnchoredSpot(open, wrapper, CLOCK_H)

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (wrapper.current?.contains(target) || panel.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const set = (h: string, m: string) => onChange(`${h}:${m}`)

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      {label ? (
        <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`mt-1 flex min-h-10 w-full cursor-pointer items-center gap-2 border bg-cream px-3 text-left font-body text-sm transition-colors ${
          open ? 'border-olive' : 'border-olive-line'
        } ${value ? 'text-ink' : 'text-dark-gray/60'}`}
      >
        <Clock className="h-4 w-4 shrink-0 text-dark-gray" aria-hidden="true" />
        {value || 'escolher a hora'}
      </button>

      {open && spot
        ? createPortal(
            <div
              ref={panel}
              style={{ top: spot.top, left: spot.left }}
              className="fixed z-50 flex border border-olive-line bg-cream shadow-[0_18px_40px_-24px_rgba(26,24,24,0.6)]"
            >
          <ul className="max-h-56 w-16 overflow-y-auto border-r border-sand-line">
            {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')).map((h) => (
              <li key={h}>
                <button
                  type="button"
                  onClick={() => set(h, mm || '00')}
                  className={`w-full cursor-pointer px-3 py-1.5 text-center font-body text-sm transition-colors ${
                    h === hh ? 'bg-olive text-cream' : 'text-ink hover:bg-veil'
                  }`}
                >
                  {h}
                </button>
              </li>
            ))}
          </ul>
          <ul className="max-h-56 w-16 overflow-y-auto">
            {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => {
                    set(hh || '00', m)
                    setOpen(false)
                  }}
                  className={`w-full cursor-pointer px-3 py-1.5 text-center font-body text-sm transition-colors ${
                    m === mm ? 'bg-olive text-cream' : 'text-ink hover:bg-veil'
                  }`}
                >
                  {m}
                </button>
              </li>
            ))}
              </ul>
            </div>,
            portalHost(wrapper.current),
          )
        : null}
    </div>
  )
}
