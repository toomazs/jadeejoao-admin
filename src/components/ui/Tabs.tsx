import { useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * A row of sections, one of them lit.
 *
 * The sections were a row of buttons borrowed from the form set, which meant
 * nine things all shaped like "do something" with no sign that picking one
 * un-picks the rest. A tab strip reads as one choice: a track holding the
 * options, and a lit shape among them.
 *
 * Square, like everything else here. Nothing in this panel is rounded — the
 * cards, the fields, the buttons and the site itself all meet at corners — so
 * a rounded pill was the one shape in the room that came from somewhere else.
 *
 * Arrow keys walk the row and only the selected tab is tabbable, which is what
 * the tablist pattern asks for — otherwise reaching the ninth section from the
 * keyboard means nine presses of Tab through things you did not want.
 */
export interface Tab {
  value: string
  label: ReactNode
  /** A quieter word after the label, like "oculta". */
  note?: string
}

export function Tabs({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: Tab[]
  value: string
  /** May refuse: return false to keep the current tab (unsaved work). */
  onChange: (next: string) => void | boolean
  className?: string
}) {
  const row = useRef<HTMLDivElement>(null)

  const step = (delta: number) => {
    const at = tabs.findIndex((t) => t.value === value)
    if (at < 0) return
    const next = tabs[(at + delta + tabs.length) % tabs.length]
    if (onChange(next.value) === false) return
    // Focus follows selection, so the row does not leave a lit pill behind a
    // focus ring sitting somewhere else.
    row.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(next.value)}"]`)
      ?.focus()
  }

  return (
    <div
      ref={row}
      role="tablist"
      aria-label="Seções"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          step(1)
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          step(-1)
        }
      }}
      className={`flex flex-wrap items-center gap-1 border border-olive-line bg-veil p-1 ${className}`}
    >
      {tabs.map((tab) => {
        const on = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            data-value={tab.value}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={`min-h-8 cursor-pointer px-3.5 font-body text-sm whitespace-nowrap transition-colors ${
              on
                ? 'bg-olive text-cream'
                : 'text-dark-gray hover:bg-sand-line/60 hover:text-olive'
            }`}
          >
            {tab.label}
            {tab.note ? (
              <span className={on ? 'text-cream/60' : 'text-dark-gray/55'}> · {tab.note}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
