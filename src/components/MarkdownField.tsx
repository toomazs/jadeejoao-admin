import { Bold, Italic, Link2, Pilcrow } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * A text field that knows the site renders markdown.
 *
 * The site already understands bold, italic, links and paragraphs — the
 * Catarina line carries `**vão se casar!**` and prints it bold. But the panel
 * showed the asterisks raw, which reads as a mistake rather than as
 * formatting: the couple sees their own text looking broken and has no way to
 * apply emphasis except by knowing the syntax.
 *
 * So: buttons that wrap the selection, and a line underneath showing what the
 * site will actually draw.
 */

/** The same inline subset `Markdown.tsx` renders on the site. */
function preview(text: string): ReactNode[] {
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  const nodes: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const [, bold, star, underscore, label] = match
    if (bold !== undefined) nodes.push(<strong key={key}>{bold}</strong>)
    else if (star !== undefined) nodes.push(<em key={key}>{star}</em>)
    else if (underscore !== undefined) nodes.push(<em key={key}>{underscore}</em>)
    else if (label !== undefined)
      nodes.push(
        <span key={key} className="text-olive underline decoration-1 underline-offset-2">
          {label}
        </span>,
      )
    last = pattern.lastIndex
    key += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const TOOLS = [
  { icon: Bold, label: 'Negrito', wrap: '**' },
  { icon: Italic, label: 'Itálico', wrap: '*' },
] as const

export function MarkdownField({
  value,
  onChange,
  rows,
}: {
  value: string
  onChange: (next: string) => void
  /** Left open for short lines; long prose gets room to breathe. */
  rows?: number
}) {
  const area = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)

  /** Wraps the selection, or drops the markers where the caret is. */
  const surround = (marker: string) => {
    const el = area.current
    if (!el) return
    const { selectionStart: from, selectionEnd: to } = el
    const chosen = value.slice(from, to)
    const next = `${value.slice(0, from)}${marker}${chosen}${marker}${value.slice(to)}`
    onChange(next)
    // Put the caret back around what was just wrapped, so typing continues
    // inside the emphasis instead of after it.
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
    // A blank line is what starts a paragraph in the renderer; a single
    // newline is just a line break inside the same one.
    onChange(`${value.slice(0, at)}\n\n${value.slice(at)}`)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(at + 2, at + 2)
    })
  }

  const lines = value.split('\n').length
  const tall = rows ?? Math.min(14, Math.max(3, lines + 1))
  const hasMarkup = /\*\*|\*|_|\[.+\]\(/.test(value)

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-1 border border-b-0 border-olive-line bg-veil px-1.5 py-1">
        {TOOLS.map(({ icon: Icon, label, wrap }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
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
          onClick={insertLink}
          className="cursor-pointer p-1.5 text-dark-gray transition-colors hover:text-olive"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Novo parágrafo"
          aria-label="Novo parágrafo"
          onClick={newParagraph}
          className="cursor-pointer p-1.5 text-dark-gray transition-colors hover:text-olive"
        >
          <Pilcrow className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="ml-auto pr-1 font-body text-xs text-dark-gray/70">
          selecione e clique para formatar
        </span>
      </div>

      <textarea
        ref={area}
        value={value}
        rows={tall}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full resize-y border bg-cream px-3 py-2 font-body text-sm text-ink ${
          focused ? 'border-olive' : 'border-olive-line'
        }`}
      />

      {hasMarkup ? (
        <p className="mt-1 border-l-2 border-gold-sand pl-2 font-body text-sm text-dark-gray">
          <span className="mr-1.5 text-xs tracking-[0.1em] uppercase">no site:</span>
          {preview(value)}
        </p>
      ) : null}
    </div>
  )
}
