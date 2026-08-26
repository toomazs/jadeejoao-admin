import { Bold, Italic, Link2, Pilcrow } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * A text field that shows the formatting instead of describing it.
 *
 * The site renders these through markdown, so `**vão se casar!**` prints bold.
 * Showing raw asterisks and a separate "here is how it will look" line asks
 * the couple to hold two versions of their own sentence in their head at once.
 *
 * So the text is drawn twice, exactly on top of itself: a styled layer behind
 * that paints the bold and dims the markers, and the real textarea in front
 * with transparent text. Every native behaviour — caret, selection, undo,
 * spellcheck, IME — is untouched, because it IS a textarea. The two layers
 * share font, padding and wrapping, so the characters line up to the pixel.
 */

const PATTERN = /(\*\*)(.+?)(\*\*)|(\*|_)(.+?)(\4)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g

/** The same text, with the emphasis painted and the markers faded. */
function highlight(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  PATTERN.lastIndex = 0
  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const [, b1, bold, b2, mark, italic, mark2, label, href] = match
    if (bold !== undefined) {
      nodes.push(
        <span key={key}>
          <span className="text-dark-gray/35">{b1}</span>
          <strong>{bold}</strong>
          <span className="text-dark-gray/35">{b2}</span>
        </span>,
      )
    } else if (italic !== undefined) {
      nodes.push(
        <span key={key}>
          <span className="text-dark-gray/35">{mark}</span>
          <em>{italic}</em>
          <span className="text-dark-gray/35">{mark2}</span>
        </span>,
      )
    } else if (label !== undefined) {
      nodes.push(
        <span key={key}>
          <span className="text-dark-gray/35">[</span>
          <span className="text-olive underline decoration-1 underline-offset-2">{label}</span>
          <span className="text-dark-gray/35">{`](${href})`}</span>
        </span>,
      )
    }
    last = PATTERN.lastIndex
    key += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  // A trailing newline needs something after it or the last line collapses
  // and the layers drift apart by one row.
  nodes.push('\n')
  return nodes
}

const TOOLS = [
  { icon: Bold, label: 'Negrito', wrap: '**' },
  { icon: Italic, label: 'Itálico', wrap: '*' },
] as const

/** Both layers wear exactly this, or the characters stop lining up. */
const SHARED = 'px-3 py-2 font-body text-sm leading-[1.55] whitespace-pre-wrap break-words'

export function MarkdownField({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const area = useRef<HTMLTextAreaElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)

  /** Grows to fit, so a long letter is not read through a four-line window. */
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  // The backdrop does not scroll on its own; it follows.
  useEffect(() => {
    const el = area.current
    if (!el) return
    const sync = () => {
      if (backdrop.current) backdrop.current.scrollTop = el.scrollTop
    }
    el.addEventListener('scroll', sync)
    return () => el.removeEventListener('scroll', sync)
  }, [])

  const surround = (marker: string) => {
    const el = area.current
    if (!el) return
    const { selectionStart: from, selectionEnd: to } = el
    const chosen = value.slice(from, to)
    onChange(`${value.slice(0, from)}${marker}${chosen}${marker}${value.slice(to)}`)
    // Keep the selection around what was wrapped, so typing continues inside
    // the emphasis rather than after it.
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(from + marker.length, to + marker.length)
    })
  }

  const insertLink = () => {
    const el = area.current
    if (!el) return
    const { selectionStart: from, selectionEnd: to } = el
    const chosen = value.slice(from, to) || 'texto do link'
    onChange(`${value.slice(0, from)}[${chosen}](https://)${value.slice(to)}`)
    requestAnimationFrame(() => el.focus())
  }

  const newParagraph = () => {
    const el = area.current
    if (!el) return
    const at = el.selectionStart
    // A blank line is what starts a paragraph; a single newline is a break
    // inside the same one.
    onChange(`${value.slice(0, at)}\n\n${value.slice(at)}`)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(at + 2, at + 2)
    })
  }

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-1 border border-b-0 border-olive-line bg-veil px-1.5 py-1">
        {TOOLS.map(({ icon: Icon, label, wrap }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => surround(wrap)}
            className="cursor-pointer p-1.5 text-dark-gray transition-colors hover:text-olive"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
        <button
          type="button"
          title="Link"
          aria-label="Link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={insertLink}
          className="cursor-pointer p-1.5 text-dark-gray transition-colors hover:text-olive"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Novo parágrafo"
          aria-label="Novo parágrafo"
          onMouseDown={(event) => event.preventDefault()}
          onClick={newParagraph}
          className="cursor-pointer p-1.5 text-dark-gray transition-colors hover:text-olive"
        >
          <Pilcrow className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="relative border border-olive-line bg-cream focus-within:border-olive">
        <div
          ref={backdrop}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 overflow-hidden text-ink ${SHARED}`}
        >
          {highlight(value)}
        </div>
        <textarea
          ref={area}
          value={value}
          rows={1}
          onChange={(event) => onChange(event.target.value)}
          // Transparent text over the painted copy; the caret keeps its colour
          // so it stays visible against it.
          className={`relative block w-full resize-none overflow-hidden bg-transparent text-transparent caret-ink outline-none ${SHARED}`}
        />
      </div>
    </div>
  )
}
