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
    // min-w-0 because this sits in a grid, and a grid item is allowed to be as
    // wide as its content unless told otherwise. A moment whose name is a whole
    // sentence made the row grow past the panel instead of the name giving way.
    <div className="min-w-0 border border-olive-line bg-veil">
      <div className="flex min-w-0 items-center gap-2 px-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            const next = !open
            setOpen(next)
            // Outside the updater on purpose. React runs updaters during
            // render — twice under StrictMode — so calling back from inside
            // one told the panel to move its preview mid-render: React warned,
            // fired it twice, and the anchor it set was not reliably the one
            // that stuck.
            if (next) onOpen?.()
          }}
          // w-0 with flex-1, not min-w-0 alone: a flex item sized from its
          // content keeps the content's width as its floor, and the long names
          // in the album are one long word short of nothing to give. Starting
          // from zero and growing into what is left can only ever fit.
          className="flex min-h-11 w-0 flex-1 cursor-pointer items-center gap-2 py-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-dark-gray transition-transform duration-200 ${
              open ? '' : '-rotate-90'
            }`}
            aria-hidden="true"
          />
          <span className="w-0 flex-1">
            {/* Two lines, then an ellipsis. These are names the couple wrote as
                sentences — "Começo do namoro. Foto da tia Taninha, que era…" —
                and one clipped line of a sentence tells them nothing about
                which moment the row is. */}
            <span className="line-clamp-2 font-body text-sm text-ink">{title}</span>
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
