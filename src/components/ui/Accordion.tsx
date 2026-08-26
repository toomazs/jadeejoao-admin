import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * A section that folds away.
 *
 * The content editor shows a whole payload at once, and some of them are long
 * — the couple's chapters carry a name, a bio, a portrait and a letter each.
 * Folded, the shape of the section is readable at a glance; open, only the
 * part being worked on takes the screen.
 *
 * The open/close animates through a grid row going from `0fr` to `1fr`, which
 * is the one way to transition to "however tall the content is" without
 * measuring it in JavaScript first — and measuring is what makes these things
 * jump when the content inside changes size.
 */
export function Accordion({
  title,
  subtitle,
  right,
  defaultOpen = false,
  onOpen,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** Something on the far side of the header, like a remove button. */
  right?: ReactNode
  defaultOpen?: boolean
  /** Fired on opening — the content editor uses it to move the preview. */
  onOpen?: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()

  return (
    <div className="border border-olive-line bg-veil">
      <div className="flex items-center gap-2 px-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            setOpen((o) => {
              if (!o) onOpen?.()
              return !o
            })
          }}
          className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-dark-gray transition-transform duration-200 ${
              open ? '' : '-rotate-90'
            }`}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block truncate font-body text-sm text-ink">{title}</span>
            {subtitle ? (
              <span className="block truncate font-body text-xs text-dark-gray">{subtitle}</span>
            ) : null}
          </span>
        </button>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div
        id={bodyId}
        className="grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        {/* The inner element must own the overflow: the animating grid row
            cannot clip on its own, and without this the content spills out
            while the row is still closing. */}
        <div className="overflow-hidden">
          <div className="border-t border-sand-line px-3 py-3">{children}</div>
        </div>
      </div>
    </div>
  )
}
