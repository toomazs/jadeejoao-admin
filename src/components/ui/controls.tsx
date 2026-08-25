import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * The controls, in the couple's own clothes.
 *
 * Native selects, checkboxes and sliders each render as whatever the operating
 * system decides — grey Windows chrome inside a cream and olive panel, and
 * different on every machine the couple opens it on. These are the same shapes
 * as the site's: square, hairline borders, olive when chosen.
 */

/* ------------------------------------------------------------------ chip */

export type ChipTone = 'yes' | 'no' | 'waiting' | 'neutral' | 'accent'

const CHIP: Record<ChipTone, string> = {
  yes: 'border-olive text-olive',
  no: 'border-terracotta text-terracotta',
  waiting: 'border-gold-sand text-dark-gray',
  neutral: 'border-olive-line text-dark-gray',
  accent: 'border-olive bg-olive text-cream',
}

/** A state, said in one word: who is coming, what still needs a decision. */
export function Chip({ tone = 'neutral', children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-body text-xs whitespace-nowrap ${CHIP[tone]}`}
    >
      {children}
    </span>
  )
}

/* ---------------------------------------------------------------- toggle */

/** A switch. Reads as on/off at a glance, unlike a tick in a box. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-5 w-9 shrink-0 cursor-pointer border transition-colors ${
          checked ? 'border-olive bg-olive' : 'border-olive-line bg-veil'
        }`}
      >
        <span
          className={`block h-4 w-4 bg-cream transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span>
        <span className="font-body text-sm text-ink">{label}</span>
        {hint ? <span className="block font-body text-xs text-dark-gray">{hint}</span> : null}
      </span>
    </label>
  )
}

/* -------------------------------------------------------------- checkbox */

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`grid h-4.5 w-4.5 shrink-0 cursor-pointer place-items-center border transition-colors ${
          checked ? 'border-olive bg-olive text-cream' : 'border-olive-line bg-cream'
        }`}
      >
        {checked ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
      </button>
      <span className="font-body text-sm text-ink">{label}</span>
    </label>
  )
}

/* ---------------------------------------------------------------- select */

export interface Option {
  value: string
  label: string
}

/**
 * A dropdown that looks like the rest of the panel.
 *
 * Keyboard-complete on purpose: arrows move, Enter picks, Escape closes, type
 * to jump. A custom select that only works with a mouse is a downgrade from
 * the native one, however it looks.
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = '—',
  className = '',
}: {
  label?: string
  value: string
  onChange: (next: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapper = useRef<HTMLDivElement>(null)
  const listId = useId()
  const chosen = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const pick = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      {label ? (
        <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((o) => !o)
          setActive(Math.max(0, options.findIndex((o) => o.value === value)))
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) {
              setOpen(true)
              return
            }
            setActive((i) =>
              event.key === 'ArrowDown'
                ? Math.min(options.length - 1, i + 1)
                : Math.max(0, i - 1),
            )
          } else if (event.key === 'Enter' && open) {
            event.preventDefault()
            pick(active)
          } else if (event.key === 'Escape') {
            setOpen(false)
          } else if (/^[a-zA-Zà-úÀ-Ú0-9]$/.test(event.key)) {
            const found = options.findIndex((o) =>
              o.label.toLowerCase().startsWith(event.key.toLowerCase()),
            )
            if (found >= 0) {
              setActive(found)
              setOpen(true)
            }
          }
        }}
        className={`mt-1 flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 border bg-cream px-3 text-left font-body text-sm transition-colors ${
          open ? 'border-olive' : 'border-olive-line'
        } ${chosen ? 'text-ink' : 'text-dark-gray/60'}`}
      >
        <span className="truncate">{chosen?.label ?? placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-dark-gray transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 z-20 mt-1 max-h-60 overflow-y-auto border border-olive-line bg-cream shadow-[0_18px_40px_-24px_rgba(26,24,24,0.6)]"
        >
          {options.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(index)}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left font-body text-sm transition-colors ${
                  index === active ? 'bg-veil text-olive' : 'text-ink'
                }`}
              >
                {option.label}
                {option.value === value ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- slider */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (next: number) => void
}) {
  const track = useRef<HTMLDivElement>(null)
  const pct = ((value - min) / (max - min)) * 100

  const setFromPointer = (clientX: number) => {
    const box = track.current?.getBoundingClientRect()
    if (!box) return
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    const raw = min + ratio * (max - min)
    onChange(Math.round(raw / step) * step)
  }

  return (
    <div>
      <span className="font-body text-sm text-dark-gray">{label}</span>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setFromPointer(event.clientX)
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) setFromPointer(event.clientX)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') onChange(Math.min(max, value + step))
          if (event.key === 'ArrowLeft') onChange(Math.max(min, value - step))
        }}
        className="relative mt-2 h-8 cursor-pointer touch-none"
      >
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-olive-line" />
        <span
          className="absolute top-1/2 h-px -translate-y-1/2 bg-olive"
          style={{ left: 0, width: `${pct}%` }}
        />
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 border border-olive bg-cream"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- search */

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className = '',
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  label?: string
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="block font-body text-xs tracking-[0.1em] text-dark-gray uppercase">
          {label}
        </span>
      ) : null}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 min-h-10 w-full border border-olive-line bg-cream px-3 font-body text-sm text-ink placeholder:text-dark-gray/45 focus:border-olive"
      />
    </label>
  )
}
